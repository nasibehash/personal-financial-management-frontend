import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ApiClient } from '../../core/api-client';
import { describeError } from '../../core/errors';
import { Lookups } from '../../core/lookups';
import { Account, Transaction, TransactionRequest, TransactionType } from '../../core/models';
import { dayToApiInstant, instantToInputDay, jalaliOfIsoDay, todayIso } from '../../core/jalali';
import { AmountInput } from '../../shared/amount-input';
import { TRANSACTION_TYPE_LABELS } from '../../shared/labels';
import { Modal } from '../../shared/modal';
import { ToastService } from '../../shared/toast';

const TYPES: TransactionType[] = ['Expense', 'Income', 'Transfer'];

/** Create or edit a transaction in a dialog; can also start from a draft (for example one the assistant understood). */
@Component({
  selector: 'app-transaction-form',
  imports: [ReactiveFormsModule, Modal, AmountInput],
  templateUrl: './transaction-form.html',
  styleUrl: './transaction-form.scss',
})
export class TransactionForm implements OnInit {
  private readonly api = inject(ApiClient);
  private readonly lookups = inject(Lookups);
  private readonly toast = inject(ToastService);

  /** The transaction to edit; leave empty to create one. */
  readonly transaction = input<Transaction | null>(null);
  /** Initial values for a new transaction. */
  readonly draft = input<Partial<TransactionRequest> | null>(null);
  readonly saved = output<Transaction>();
  readonly cancelled = output<void>();

  protected readonly types = TYPES;
  protected readonly typeLabels = TRANSACTION_TYPE_LABELS;
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    type: ['Expense' as TransactionType],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    accountId: ['', Validators.required],
    destinationAccountId: [''],
    categoryId: ['', Validators.required],
    date: [todayIso(), Validators.required],
    description: ['', Validators.maxLength(500)],
  });

  private readonly type = signal<TransactionType>('Expense');
  private originalDay: string | null = null;

  protected readonly isTransfer = computed(() => this.type() === 'Transfer');

  /** Active accounts, plus the account of the transaction being edited even if it has been archived since. */
  protected readonly accounts = computed<Pick<Account, 'id' | 'name'>[]>(() => {
    const active = this.lookups.accountList();
    const current = this.transaction();
    const extra: Pick<Account, 'id' | 'name'>[] = [];
    if (current && !active.some((a) => a.id === current.accountId)) {
      extra.push({ id: current.accountId, name: current.accountName });
    }
    if (
      current?.destinationAccountId &&
      !active.some((a) => a.id === current.destinationAccountId)
    ) {
      extra.push({ id: current.destinationAccountId, name: current.destinationAccountName ?? '' });
    }
    return [...active, ...extra];
  });

  protected readonly categories = computed(() => {
    const type = this.type();
    if (type === 'Transfer') {
      return [];
    }
    return type === 'Income' ? this.lookups.incomeCategories() : this.lookups.expenseCategories();
  });

  constructor() {
    this.form.controls.type.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((type) => this.applyType(type));
    this.applyType('Expense');
  }

  ngOnInit(): void {
    const transaction = this.transaction();
    const draft = this.draft();

    if (transaction) {
      this.originalDay = instantToInputDay(transaction.date);
      this.form.setValue({
        type: transaction.type,
        amount: transaction.amount,
        accountId: transaction.accountId,
        destinationAccountId: transaction.destinationAccountId ?? '',
        categoryId: transaction.categoryId ?? '',
        date: this.originalDay,
        description: transaction.description ?? '',
      });
    } else if (draft) {
      this.form.patchValue({
        type: draft.type ?? 'Expense',
        amount: draft.amount ?? null,
        accountId: draft.accountId ?? '',
        destinationAccountId: draft.destinationAccountId ?? '',
        categoryId: draft.categoryId ?? '',
        date: draft.date ? instantToInputDay(draft.date) : todayIso(),
        description: draft.description ?? '',
      });
    }

    if (!this.form.controls.accountId.value && this.accounts().length === 1) {
      this.form.controls.accountId.setValue(this.accounts()[0].id);
    }
  }

  protected setType(type: TransactionType): void {
    this.form.controls.type.setValue(type);
  }

  protected jalali(day: string): string {
    return jalaliOfIsoDay(day);
  }

  protected showError(
    name: 'amount' | 'accountId' | 'destinationAccountId' | 'categoryId' | 'date' | 'description',
  ): boolean {
    const control = this.form.controls[name];
    return control.touched && control.invalid;
  }

  protected get sameAccount(): boolean {
    const { accountId, destinationAccountId } = this.form.getRawValue();
    return this.isTransfer() && !!accountId && accountId === destinationAccountId;
  }

  protected async save(): Promise<void> {
    if (this.form.invalid || this.sameAccount) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const isTransfer = value.type === 'Transfer';
    const request: TransactionRequest = {
      type: value.type,
      amount: value.amount ?? 0,
      accountId: value.accountId,
      categoryId: isTransfer ? null : value.categoryId,
      destinationAccountId: isTransfer ? value.destinationAccountId : null,
      // Keep the exact time of an existing transaction unless its day was changed.
      date:
        this.transaction() && value.date === this.originalDay
          ? this.transaction()!.date
          : dayToApiInstant(value.date),
      description: value.description.trim() || null,
    };

    this.saving.set(true);
    this.error.set(null);
    try {
      const existing = this.transaction();
      const result = await firstValueFrom(
        existing
          ? this.api.updateTransaction(existing.id, request)
          : this.api.createTransaction(request),
      );
      this.toast.success(existing ? 'تراکنش ذخیره شد.' : 'تراکنش ثبت شد.');
      this.saved.emit(result);
    } catch (error) {
      this.error.set(describeError(error));
    } finally {
      this.saving.set(false);
    }
  }

  /** Transfers need a destination and no category; income and expenses the other way round. */
  private applyType(type: TransactionType): void {
    this.type.set(type);
    const { categoryId, destinationAccountId } = this.form.controls;

    if (type === 'Transfer') {
      categoryId.clearValidators();
      categoryId.setValue('', { emitEvent: false });
      destinationAccountId.setValidators(Validators.required);
    } else {
      destinationAccountId.clearValidators();
      destinationAccountId.setValue('', { emitEvent: false });
      categoryId.setValidators(Validators.required);
      const valid = this.categories().some((c) => c.id === categoryId.value);
      if (!valid) {
        categoryId.setValue('', { emitEvent: false });
      }
    }
    categoryId.updateValueAndValidity({ emitEvent: false });
    destinationAccountId.updateValueAndValidity({ emitEvent: false });
  }
}
