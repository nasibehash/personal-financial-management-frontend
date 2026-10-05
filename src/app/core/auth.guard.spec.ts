import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { AuthStore } from './auth-store';
import { authGuard, guestGuard, safeReturnUrl } from './auth.guard';
import { authResponse } from './testing';

describe('guards', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
  });

  const run = (guard: typeof authGuard, url: string) =>
    TestBed.runInInjectionContext(() =>
      guard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    );

  const signIn = async () => {
    const done = TestBed.inject(AuthStore).login({ email: 'a@b.c', password: 'x' });
    TestBed.inject(HttpTestingController).expectOne('/api/auth/login').flush(authResponse());
    await done;
  };

  it('sends visitors to the login page and remembers the page they wanted', () => {
    const result = run(authGuard, '/goals') as UrlTree;

    expect(TestBed.inject(Router).serializeUrl(result)).toBe('/login?returnUrl=%2Fgoals');
    expect(TestBed.inject(Router).serializeUrl(run(authGuard, '/') as UrlTree)).toBe('/login');
  });

  it('lets signed-in users in and keeps them away from the login page', async () => {
    await signIn();

    expect(run(authGuard, '/goals')).toBe(true);
    expect(TestBed.inject(Router).serializeUrl(run(guestGuard, '/login') as UrlTree)).toBe('/');
  });

  it('lets visitors see the login page', () => {
    expect(run(guestGuard, '/login')).toBe(true);
  });
});

describe('safeReturnUrl', () => {
  it('only accepts paths inside the app', () => {
    expect(safeReturnUrl('/goals/123')).toBe('/goals/123');
    expect(safeReturnUrl('https://evil.example')).toBe('/');
    expect(safeReturnUrl('//evil.example')).toBe('/');
    expect(safeReturnUrl('')).toBe('/');
    expect(safeReturnUrl(undefined)).toBe('/');
    expect(safeReturnUrl(null)).toBe('/');
  });
});
