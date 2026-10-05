import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthStore } from './auth-store';
import { authResponse } from './testing';

describe('AuthStore', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.useRealTimers());

  const setup = () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    return {
      store: TestBed.inject(AuthStore),
      http: TestBed.inject(HttpTestingController),
      router: TestBed.inject(Router),
    };
  };

  it('starts signed out', () => {
    const { store } = setup();

    expect(store.isAuthenticated()).toBe(false);
    expect(store.user()).toBeNull();
    expect(store.token()).toBeNull();
  });

  it('signs in and keeps the session in localStorage', async () => {
    const { store, http } = setup();

    const done = store.login({ email: 'sara@example.com', password: 'Passw0rd123' });
    http.expectOne('/api/auth/login').flush(authResponse());
    await done;

    expect(store.isAuthenticated()).toBe(true);
    expect(store.user()?.fullName).toBe('سارا احمدی');
    expect(store.token()).toBe('jwt-token');
    expect(JSON.parse(localStorage.getItem('pfm.auth')!).token).toBe('jwt-token');
  });

  it('registers and signs in', async () => {
    const { store, http } = setup();

    const done = store.register({
      fullName: 'سارا احمدی',
      email: 'sara@example.com',
      password: 'Passw0rd123',
    });
    const request = http.expectOne('/api/auth/register');
    expect(request.request.body.fullName).toBe('سارا احمدی');
    request.flush(authResponse());
    await done;

    expect(store.isAuthenticated()).toBe(true);
  });

  it('stays signed out when the login fails', async () => {
    const { store, http } = setup();

    const done = store.login({ email: 'sara@example.com', password: 'wrong' });
    http
      .expectOne('/api/auth/login')
      .flush({ title: 'Unauthorized.' }, { status: 401, statusText: 'Unauthorized' });

    await expect(done).rejects.toBeTruthy();
    expect(store.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('pfm.auth')).toBeNull();
  });

  it('restores a valid stored session', () => {
    localStorage.setItem('pfm.auth', JSON.stringify(authResponse()));

    const { store } = setup();

    expect(store.isAuthenticated()).toBe(true);
    expect(store.user()?.email).toBe('sara@example.com');
  });

  it('ignores and removes expired or corrupt stored sessions', () => {
    localStorage.setItem(
      'pfm.auth',
      JSON.stringify(authResponse({ expiresAtUtc: new Date(Date.now() - 1000).toISOString() })),
    );
    expect(setup().store.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('pfm.auth')).toBeNull();

    TestBed.resetTestingModule();
    localStorage.setItem('pfm.auth', '{not json');
    expect(setup().store.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('pfm.auth')).toBeNull();
  });

  it('notices when the token expires while the app is open', async () => {
    const { store, http } = setup();
    const done = store.login({ email: 'a@b.c', password: 'x' });
    http
      .expectOne('/api/auth/login')
      .flush(authResponse({ expiresAtUtc: new Date(Date.now() + 5000).toISOString() }));
    await done;
    expect(store.hasValidSession()).toBe(true);

    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 10_000);

    expect(store.hasValidSession()).toBe(false);
    expect(store.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('pfm.auth')).toBeNull();
  });

  it('signs out and goes to the login page, remembering where the user was', async () => {
    const { store, http, router } = setup();
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const done = store.login({ email: 'a@b.c', password: 'x' });
    http.expectOne('/api/auth/login').flush(authResponse());
    await done;

    store.logout('/goals');

    expect(store.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('pfm.auth')).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login'], { queryParams: { returnUrl: '/goals' } });

    store.logout('/');
    expect(navigate).toHaveBeenLastCalledWith(['/login'], { queryParams: {} });
  });
});
