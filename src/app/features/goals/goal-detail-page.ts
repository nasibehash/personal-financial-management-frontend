import { Component, computed, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiClient } from '../../core/api-client';
import { describeError } from '../../core/errors';
import { dayToApiInstant, todayIso } from '../../core/jalali';
import { Goal, GoalDetail, GoalRequest } from '../../core/models';
import { resourceValue } from '../../core/resource-value';
import { AmountInput } from '../../shared/amount-input';
import { ConfirmService } from '../../shared/confirm';
import { GOAL_STATUS_LABELS } from '../../shared/labels';
import { PageHeader } from '../../shared/page-header';
import { JalaliPipe, MoneyPipe } from '../../shared/pipes';
import { ProgressBar } from '../../shared/progress-bar';
import { ErrorBlock, Loading } from '../../shared/state-views';
import { ToastService } from '../../shared/toast';
import { GoalForm } from './goal-form';

@Component({
  selector: 'app-goal-detail-page',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    PageHeader,
    GoalForm,
    AmountInput,
    MoneyPipe,
    JalaliPipe,
    ProgressBar,
    Loading,
    ErrorBlock,
  ],
  templateUrl: './goal-detail-page.html',
  styleUrl: './goal-detail-page.scss',
})
export class GoalDetailPage {
  private readonly api = inject(ApiClient);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  /** The route parameter `:id`. */
  readonly id = input.required<string>();

  protected readonly statusLabels = GOAL_STATUS_LABELS;

  protected readonly detail = rxResource({
    params: () => this.id(),
    stream: ({ params }) => this.api.goal(params),
  });

  protected readonly data = computed<GoalDetail | null>(
    () => resourceValue(this.detail, undefined) ?? null,
  );
  protected readonly loadError = computed(() =>
    this.detail.error() ? describeError(this.detail.error()) : null,
  );

  protected readonly editing = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = inject(FormBuilder).group({
    amount: [null as number | null, [Validators.required, Validators.min(1)]],
    date: [todayIso(), Validators.required],
    note: ['', Validators.maxLength(300)],
  });

  protected invalidAmount(): boolean {
    const control = this.form.controls.amount;
    return control.touched && control.invalid;
  }

  protected async contribute(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.saving.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(
        this.api.addContribution(
          this.id(),
          value.amount ?? 0,
          value.date ? dayToApiInstant(value.date) : null,
          value.note?.trim() || null,
        ),
      );
      this.toast.success('مبلغ به هدف اضافه شد.');
      this.form.reset({ amount: null, date: todayIso(), note: '' });
      this.detail.reload();
    } catch (error) {
      this.error.set(describeError(error));
    } finally {
      this.saving.set(false);
    }
  }

  protected async removeContribution(contributionId: string): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: 'حذف واریز',
      message: 'این مبلغ از پس‌انداز هدف کم شود؟',
      confirmLabel: 'حذف',
      danger: true,
    });
    if (!confirmed) {
      return;
    }

    try {
      await firstValueFrom(this.api.deleteContribution(this.id(), contributionId));
      this.detail.reload();
    } catch (error) {
      this.toast.error(describeError(error));
    }
  }

  protected async setCancelled(goal: Goal, cancelled: boolean): Promise<void> {
    const request: GoalRequest = {
      name: goal.name,
      targetAmount: goal.targetAmount,
      deadline: goal.deadline,
      description: goal.description,
      isCancelled: cancelled,
    };
    try {
      await firstValueFrom(this.api.updateGoal(goal.id, request));
      this.toast.success(cancelled ? 'هدف لغو شد.' : 'هدف دوباره فعال شد.');
      this.detail.reload();
    } catch (error) {
      this.toast.error(describeError(error));
    }
  }

  protected async remove(goal: Goal): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: 'حذف هدف',
      message: `هدف «${goal.name}» با همه‌ی واریزهایش حذف شود؟`,
      confirmLabel: 'حذف',
      danger: true,
    });
    if (!confirmed) {
      return;
    }

    try {
      await firstValueFrom(this.api.deleteGoal(goal.id));
      this.toast.success('هدف حذف شد.');
      await this.router.navigateByUrl('/goals');
    } catch (error) {
      this.toast.error(describeError(error));
    }
  }

  protected onSaved(): void {
    this.editing.set(false);
    this.detail.reload();
  }
}
