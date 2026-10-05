import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Account, AuthResponse } from './models';

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
