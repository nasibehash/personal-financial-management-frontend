import { Injectable, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { ApiClient } from './api-client';
import { AuthStore } from './auth-store';
import { Account, Category } from './models';

/**
 * The user's active accounts and categories, loaded once and shared by every form and filter.
 * They reload when the signed-in user changes; call refresh() after adding or renaming one.
 */
@Injectable({ providedIn: 'root' })
export class Lookups {
  private readonly api = inject(ApiClient);
  private readonly auth = inject(AuthStore);

  readonly accounts = rxResource({
    params: () => this.auth.user()?.id,
    stream: () => this.api.accounts(false),
    defaultValue: [] as Account[],
  });

  readonly categories = rxResource({
    params: () => this.auth.user()?.id,
    stream: () => this.api.categories(),
    defaultValue: [] as Category[],
  });

  readonly expenseCategories = computed(() =>
    this.categories.value().filter((c) => c.type === 'Expense'),
  );
  readonly incomeCategories = computed(() =>
    this.categories.value().filter((c) => c.type === 'Income'),
  );

  refresh(): void {
    this.accounts.reload();
    this.categories.reload();
  }
}
