import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ApiClient } from '../../core/api-client';
import { describeError } from '../../core/errors';
import { dayToApiInstant, instantToInputDay } from '../../core/jalali';
import { Goal, GoalRequest } from '../../core/models';
import { AmountInput } from '../../shared/amount-input';
import { Modal } from '../../shared/modal';
import { ToastService } from '../../shared/toast';

/** Create or edit a savings goal in a dialog. */
@Component({
  selector: 'app-goal-form',
  imports: [ReactiveFormsModule, Modal, AmountInput],
  templateUrl: './goal-form.html',
})
export class GoalForm implements OnInit {
  private readonly api = inject(ApiClient);
  private readonly toast = inject(ToastService);

  /** The goal to edit; leave empty to create one. */
  readonly goal = input<Goal | null>(null);
  readonly saved = output<Goal>();
  readonly cancelled = output<void>();

  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = inject(FormBuilder).group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    targetAmount: [null as number | null, [Validators.required, Validators.min(1)]],
    deadline: [''],
    description: ['', Validators.maxLength(500)],
  });

  ngOnInit(): void {
    const goal = this.goal();
    if (goal) {
      this.form.setValue({
        name: goal.name,
        targetAmount: goal.targetAmount,
        deadline: goal.deadline ? instantToInputDay(goal.deadline) : '',
        description: goal.description ?? '',
      });
    }
  }

  protected invalid(name: 'name' | 'targetAmount'): boolean {
    const control = this.form.controls[name];
    return control.touched && control.invalid;
  }

  protected async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const goal = this.goal();
    const request: GoalRequest = {
      name: (value.name ?? '').trim(),
      targetAmount: value.targetAmount ?? 0,
      deadline: value.deadline ? dayToApiInstant(value.deadline) : null,
      description: value.description?.trim() || null,
      isCancelled: goal?.status === 'Cancelled',
    };

    this.saving.set(true);
    this.error.set(null);
    try {
      const result = await firstValueFrom(
        goal ? this.api.updateGoal(goal.id, request) : this.api.createGoal(request),
      );
      this.toast.success(goal ? 'هدف ذخیره شد.' : 'هدف ساخته شد.');
      this.saved.emit(result);
    } catch (error) {
      this.error.set(describeError(error));
    } finally {
      this.saving.set(false);
    }
  }
}
