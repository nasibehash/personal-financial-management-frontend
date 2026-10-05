import { Component, Injectable, inject, signal } from '@angular/core';
import { Modal } from './modal';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}

interface Pending {
  options: ConfirmOptions;
  resolve: (confirmed: boolean) => void;
}

/** Asks the user to confirm something: `if (await confirm.ask({ message: '...' })) { ... }`. */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly pending = signal<Pending | null>(null);

  ask(options: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => this.pending.set({ options, resolve }));
  }

  answer(confirmed: boolean): void {
    const current = this.pending();
    if (current) {
      this.pending.set(null);
      current.resolve(confirmed);
    }
  }
}

@Component({
  selector: 'app-confirm-host',
  imports: [Modal],
  template: `
    @if (service.pending(); as pending) {
      <app-modal [title]="pending.options.title ?? 'تأیید'" (closed)="service.answer(false)">
        <p>{{ pending.options.message }}</p>
        <div class="form-actions">
          <button type="button" class="btn" (click)="service.answer(false)">انصراف</button>
          <button
            type="button"
            class="btn"
            [class.btn-danger]="pending.options.danger"
            [class.btn-primary]="!pending.options.danger"
            (click)="service.answer(true)"
          >
            {{ pending.options.confirmLabel ?? 'تأیید' }}
          </button>
        </div>
      </app-modal>
    }
  `,
})
export class ConfirmHost {
  protected readonly service = inject(ConfirmService);
}
