import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Lookups } from './lookups';
import { Account, AuthResponse, Category, Transaction } from './models';

/** Helpers shared by the specs. */

export function setValue(
  element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
  value: string,
): void {
  element.value = value;
  element.dispatchEvent(new Event(element instanceof HTMLSelectElement ? 'change' : 'input'));
}

export function submit(form: HTMLFormElement): void {
  form.dispatchEvent(new Event('submit'));
}

export function authResponse(overrides: Partial<AuthResponse> = {}): AuthResponse {
  return {
    token: 'jwt-token',
    expiresAtUtc: new Date(Date.now() + 3_600_000).toISOString(),
    user: { id: 'user-1', fullName: 'سارا احمدی', email: 'sara@example.com' },
    ...overrides,
  };
}

/** Runs pending effects (which start resource requests) so the test can `expectOne` them. */
export async function startLoading(): Promise<void> {
  TestBed.tick();
  await Promise.resolve();
}

/**
 * Lets promises and effects finish and renders the view. It does not use `whenStable()`, which would wait
 * for requests the test has not answered yet.
 */
export async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await new Promise((resolve) => setTimeout(resolve));
    TestBed.tick();
    fixture.detectChanges();
  }
}

export function account(overrides: Partial<Account> = {}): Account {
  return {
    id: 'acc-1',
    name: 'کیف پول',
    type: 'Cash',
    initialBalance: 1000,
    balance: 1500,
    isArchived: false,
    ...overrides,
  };
}

export const CATEGORIES: Category[] = [
  { id: 'e1', name: 'خوراک', type: 'Expense' },
  { id: 'e2', name: 'حمل و نقل', type: 'Expense' },
  { id: 'i1', name: 'حقوق', type: 'Income' },
];

export const ACCOUNTS: Account[] = [
  account(),
  account({ id: 'acc-2', name: 'حساب ملی', type: 'BankAccount' }),
];

/** A stand-in for the lookup store with fixed accounts and categories (no requests). */
export function fakeLookups(
  accounts: Account[] = ACCOUNTS,
  categories: Category[] = CATEGORIES,
): Lookups {
  return {
    accountList: () => accounts,
    categoryList: () => categories,
    expenseCategories: () => categories.filter((c) => c.type === 'Expense'),
    incomeCategories: () => categories.filter((c) => c.type === 'Income'),
    refresh: () => undefined,
  } as unknown as Lookups;
}

export function transaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-1',
    type: 'Expense',
    amount: 250000,
    date: '2026-10-05T12:00:00Z',
    description: 'ناهار',
    accountId: 'acc-1',
    accountName: 'کیف پول',
    destinationAccountId: null,
    destinationAccountName: null,
    categoryId: 'e1',
    categoryName: 'خوراک',
    source: 'Manual',
    ...overrides,
  };
}
