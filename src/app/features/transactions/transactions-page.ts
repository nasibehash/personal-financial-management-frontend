import { Component, computed, effect, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { ApiClient } from '../../core/api-client';
import { describeError } from '../../core/errors';
import { jalaliMonthRange } from '../../core/jalali';
import { Lookups } from '../../core/lookups';
import { Paged, Transaction, TransactionType } from '../../core/models';
import { ConfirmService } from '../../shared/confirm';
import { SOURCE_LABELS, TRANSACTION_TYPE_LABELS } from '../../shared/labels';
import { PageHeader } from '../../shared/page-header';
import { JalaliPipe, MoneyPipe } from '../../shared/pipes';
import { resourceValue } from '../../core/resource-value';
import { EmptyState, ErrorBlock, Loading } from '../../shared/state-views';
import { ToastService } from '../../shared/toast';
import { TransactionForm } from './transaction-form';

const PAGE_SIZE = 20;
const SEARCH_DELAY_MS = 350;

@Component({
  selector: 'app-transactions-page',
  imports: [PageHeader, TransactionForm, MoneyPipe, JalaliPipe, Loading, ErrorBlock, EmptyState],
  templateUrl: './transactions-page.html',
  styleUrl: './transactions-page.scss',
})
export class TransactionsPage {
  private readonly api = inject(ApiClient);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  protected readonly lookups = inject(Lookups);

  protected readonly typeLabels = TRANSACTION_TYPE_LABELS;
  protected readonly sourceLabels = SOURCE_LABELS;

  // filters
  protected readonly from = signal('');
  protected readonly to = signal('');
  protected readonly type = signal<TransactionType | ''>('');
  protected readonly accountId = signal('');
  protected readonly categoryId = signal('');
  protected readonly searchText = signal('');
  private readonly search = signal('');
  protected readonly page = signal(1);

  protected readonly result = rxResource({
    params: () => ({
      from: this.from(),
      to: this.to(),
      type: this.type(),
      accountId: this.accountId(),
      categoryId: this.categoryId(),
      search: this.search(),
      page: this.page(),
    }),
    stream: ({ params }) => this.api.transactions({ ...params, pageSize: PAGE_SIZE }),
  });

  private readonly data = computed<Paged<Transaction> | null>(
    () => resourceValue(this.result, undefined) ?? null,
  );
  protected readonly items = computed(() => this.data()?.items ?? []);
  protected readonly totalCount = computed(() => this.data()?.totalCount ?? 0);
  protected readonly totalPages = computed(() => this.data()?.totalPages ?? 0);
  protected readonly loadError = computed(() =>
    this.result.error() ? describeError(this.result.error()) : null,
  );
  protected readonly hasFilters = computed(
    () =>
      !!(
        this.from() ||
        this.to() ||
        this.type() ||
        this.accountId() ||
        this.categoryId() ||
        this.search() ||
        this.searchText().trim()
      ),
  );

  /** `undefined`: dialog closed, `null`: creating, a transaction: editing it. */
  protected readonly editing = signal<Transaction | null | undefined>(undefined);

  constructor() {
    // wait for the user to stop typing before searching
    effect((onCleanup) => {
      const text = this.searchText().trim();
      const timer = setTimeout(() => {
        if (text !== this.search()) {
          this.search.set(text);
          this.page.set(1);
        }
      }, SEARCH_DELAY_MS);
      onCleanup(() => clearTimeout(timer));
    });
  }

  protected setFrom(event: Event): void {
    this.from.set((event.target as HTMLInputElement).value);
    this.page.set(1);
  }

  protected setTo(event: Event): void {
    this.to.set((event.target as HTMLInputElement).value);
    this.page.set(1);
  }

  protected setType(event: Event): void {
    this.type.set((event.target as HTMLSelectElement).value as TransactionType | '');
    this.page.set(1);
  }

  protected setAccount(event: Event): void {
    this.accountId.set((event.target as HTMLSelectElement).value);
    this.page.set(1);
  }

  protected setCategory(event: Event): void {
    this.categoryId.set((event.target as HTMLSelectElement).value);
    this.page.set(1);
  }

  protected setSearch(event: Event): void {
    this.searchText.set((event.target as HTMLInputElement).value);
  }

  protected thisMonth(): void {
    const range = jalaliMonthRange(0);
    this.from.set(range.from);
    this.to.set(range.to);
    this.page.set(1);
  }

  protected lastMonth(): void {
    const range = jalaliMonthRange(-1);
    this.from.set(range.from);
    this.to.set(range.to);
    this.page.set(1);
  }

  protected clearFilters(): void {
    this.from.set('');
    this.to.set('');
    this.type.set('');
    this.accountId.set('');
    this.categoryId.set('');
    this.searchText.set('');
    this.search.set('');
    this.page.set(1);
  }

  protected goTo(page: number): void {
    this.page.set(Math.min(Math.max(page, 1), Math.max(this.totalPages(), 1)));
  }

  protected onSaved(): void {
    this.editing.set(undefined);
    this.result.reload();
  }

  protected async remove(transaction: Transaction): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: 'حذف تراکنش',
      message: 'این تراکنش حذف شود؟ موجودی حساب‌ها دوباره محاسبه می‌شود.',
      confirmLabel: 'حذف',
      danger: true,
    });
    if (!confirmed) {
      return;
    }

    try {
      await firstValueFrom(this.api.deleteTransaction(transaction.id));
      this.toast.success('تراکنش حذف شد.');
      // the page may now be empty (last item deleted)
      if (this.items().length === 1 && this.page() > 1) {
        this.page.update((p) => p - 1);
      } else {
        this.result.reload();
      }
    } catch (error) {
      this.toast.error(describeError(error));
    }
  }
}
