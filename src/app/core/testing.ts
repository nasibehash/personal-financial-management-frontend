import { AuthResponse } from './models';

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
