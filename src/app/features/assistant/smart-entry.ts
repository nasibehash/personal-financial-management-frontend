import { Component, OnDestroy, computed, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ApiClient } from '../../core/api-client';
import { describeError } from '../../core/errors';
import { ParsedTransaction } from '../../core/models';
import { JalaliPipe, MoneyPipe } from '../../shared/pipes';
import { TRANSACTION_TYPE_LABELS } from '../../shared/labels';
import { ToastService } from '../../shared/toast';
import { TransactionForm } from '../transactions/transaction-form';

/**
 * Record a transaction from a sentence or a voice message. The assistant only previews what it
 * understood; nothing is saved until the user confirms (or fixes it in the regular form).
 */
@Component({
  selector: 'app-smart-entry',
  imports: [FormsModule, MoneyPipe, JalaliPipe, TransactionForm],
  templateUrl: './smart-entry.html',
  styleUrl: './smart-entry.scss',
})
export class SmartEntry implements OnDestroy {
  private readonly api = inject(ApiClient);
  private readonly toast = inject(ToastService);

  readonly saved = output<void>();

  protected readonly typeLabels = TRANSACTION_TYPE_LABELS;
  protected readonly text = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly draft = signal<ParsedTransaction | null>(null);
  /** The sentence the draft came from: what was typed, or the transcript of the recording. */
  private readonly source = signal('');
  protected readonly editing = signal(false);

  protected readonly canRecord =
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== 'undefined';
  protected readonly recording = signal(false);
  private recorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;

  protected readonly canConfirm = computed(() => !!this.draft()?.accountId);

  protected async analyze(): Promise<void> {
    const text = this.text().trim();
    if (!text || this.busy()) {
      return;
    }
    await this.run(async () => {
      const result = await firstValueFrom(this.api.aiText(text, true));
      this.source.set(text);
      this.draft.set(result.draft);
    });
  }

  protected async toggleRecording(): Promise<void> {
    if (this.recording()) {
      this.recorder?.stop();
      return;
    }

    this.error.set(null);
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      this.error.set('دسترسی به میکروفن داده نشد.');
      return;
    }

    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(this.stream);
    recorder.ondataavailable = (event) => chunks.push(event.data);
    recorder.onstop = () => {
      this.releaseMicrophone();
      this.recording.set(false);
      void this.sendRecording(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
    };
    this.recorder = recorder;
    recorder.start();
    this.recording.set(true);
  }

  private async sendRecording(audio: Blob): Promise<void> {
    if (audio.size === 0) {
      return;
    }
    const extension = audio.type.includes('mp4')
      ? 'm4a'
      : audio.type.includes('ogg')
        ? 'ogg'
        : 'webm';
    await this.run(async () => {
      const result = await firstValueFrom(this.api.aiVoice(audio, `voice.${extension}`, true));
      const transcript = result.transcript ?? '';
      this.text.set(transcript);
      this.source.set(transcript);
      this.draft.set(result.draft);
    });
  }

  protected async confirm(): Promise<void> {
    const draft = this.draft();
    if (!draft?.accountId || this.busy()) {
      return;
    }
    await this.run(async () => {
      await firstValueFrom(this.api.aiText(this.source(), false, draft.accountId));
      this.finish('تراکنش ثبت شد.');
    });
  }

  protected onEdited(): void {
    this.editing.set(false);
    this.finish('تراکنش ثبت شد.');
  }

  protected discard(): void {
    this.draft.set(null);
    this.error.set(null);
  }

  private finish(message: string): void {
    this.toast.success(message);
    this.draft.set(null);
    this.text.set('');
    this.saved.emit();
  }

  private async run(action: () => Promise<void>): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      await action();
    } catch (error) {
      this.error.set(describeError(error));
    } finally {
      this.busy.set(false);
    }
  }

  private releaseMicrophone(): void {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
  }

  ngOnDestroy(): void {
    if (this.recorder?.state === 'recording') {
      this.recorder.onstop = null;
      this.recorder.stop();
    }
    this.releaseMicrophone();
  }

  protected asRequest(draft: ParsedTransaction) {
    return {
      type: draft.type,
      amount: draft.amount,
      date: draft.date,
      description: draft.description,
      accountId: draft.accountId ?? '',
      destinationAccountId: draft.destinationAccountId,
      categoryId: draft.categoryId,
    };
  }
}
