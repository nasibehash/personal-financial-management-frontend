import { Component, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ApiClient } from '../../core/api-client';
import { describeError } from '../../core/errors';
import { ACCOUNT_TYPES, Account, AccountRequest } from '../../core/models';
import { AmountInput } from '../../shared/amount-input';
import { ACCOUNT_TYPE_LABELS } from '../../shared/labels';
import { Modal } from '../../shared/modal';
import { ToastService } from '../../shared/toast';

/** Create or edit an account in a dialog. */
@Component({
  selector: 'app-account-form',
  imports: [ReactiveFormsModule, Modal, AmountInput],
  templateUrl: './account-form.html',
})
export class AccountForm {
  private readonly api = inject(ApiClient);
  private readonly toast = inject(ToastService);

  /** The account to edit; leave empty to create one. */
  readonly account = input<Account | null>(null);
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  protected readonly types = ACCOUNT_TYPES;
  protected readonly typeLabels = ACCOUNT_TYPE_LABELS;
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = inject(FormBuilder).group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    type: ['Cash' as Account['type'], Validators.required],
    initialBalance: [0 as number | null],
    isArchived: [false],
  });

  ngOnInit(): void {
    const account = this.account();
    if (account) {
      this.form.setValue({
        name: account.name,
        type: account.type,
        initialBalance: account.initialBalance,
        isArchived: account.isArchived,
      });
    }
  }

  protected invalid(name: 'name'): boolean {
    const control = this.form.controls[name];
    return control.touched && control.invalid;
  }

  protected async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const request: AccountRequest = {
      name: (value.name ?? '').trim(),
      type: value.type ?? 'Cash',
      initialBalance: value.initialBalance ?? 0,
      isArchived: !!value.isArchived,
    };

    this.saving.set(true);
    this.error.set(null);
    try {
      const account = this.account();
      await firstValueFrom(
        account ? this.api.updateAccount(account.id, request) : this.api.createAccount(request),
      );
      this.toast.success(account ? 'حساب ذخیره شد.' : 'حساب ساخته شد.');
      this.saved.emit();
    } catch (error) {
      this.error.set(describeError(error));
    } finally {
      this.saving.set(false);
    }
  }
}
