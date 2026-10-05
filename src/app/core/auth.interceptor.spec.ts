import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthStore } from './auth-store';
import { authInterceptor } from './auth.interceptor';
import { authResponse } from './testing';

describe('authInterceptor', () => {
  beforeEach(() => localStorage.clear());

  const setup = async (signedIn: boolean) => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    const store = TestBed.inject(AuthStore);
    const http = TestBed.inject(HttpTestingController);
    if (signedIn) {
      const done = store.login({ email: 'a@b.c', password: 'x' });
      http.expectOne('/api/auth/login').flush(authResponse());
      await done;
    }
    return { store, http, client: TestBed.inject(HttpClient), router: TestBed.inject(Router) };
  };

  it('sends the token with API calls', async () => {
    const { client, http } = await setup(true);

    client.get('/api/accounts').subscribe();

    expect(http.expectOne('/api/accounts').request.headers.get('Authorization')).toBe(
      'Bearer jwt-token',
    );
  });

  it('sends nothing when signed out, to other hosts or for the login calls', async () => {
    const { client, http } = await setup(false);
    client.get('/api/accounts').subscribe({ error: () => undefined });
    expect(http.expectOne('/api/accounts').request.headers.has('Authorization')).toBe(false);

    TestBed.resetTestingModule();
    const signedIn = await setup(true);
    signedIn.client.get('https://example.com/data').subscribe();
    expect(
      signedIn.http.expectOne('https://example.com/data').request.headers.has('Authorization'),
    ).toBe(false);
    signedIn.client.post('/api/auth/login', {}).subscribe({ error: () => undefined });
    expect(signedIn.http.expectOne('/api/auth/login').request.headers.has('Authorization')).toBe(
      false,
    );
  });

  it('signs the user out and returns to login when the API answers 401', async () => {
    const { client, http, store, router } = await setup(true);
    vi.spyOn(router, 'url', 'get').mockReturnValue('/transactions');
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    let failed = false;

    client.get('/api/transactions').subscribe({ error: () => (failed = true) });
    http.expectOne('/api/transactions').flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(failed).toBe(true);
    expect(store.isAuthenticated()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/transactions' },
    });
  });

  it('does not sign out for a wrong password on the login call or for other errors', async () => {
    const { client, http, store } = await setup(true);

    client.post('/api/auth/login', {}).subscribe({ error: () => undefined });
    http.expectOne('/api/auth/login').flush({}, { status: 401, statusText: 'Unauthorized' });
    client.get('/api/accounts').subscribe({ error: () => undefined });
    http.expectOne('/api/accounts').flush({}, { status: 500, statusText: 'Server Error' });

    expect(store.isAuthenticated()).toBe(true);
  });
});
