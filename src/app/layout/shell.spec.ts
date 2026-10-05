import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthStore } from '../core/auth-store';
import { authResponse } from '../core/testing';
import { Shell } from './shell';

describe('Shell', () => {
  beforeEach(() => localStorage.clear());

  const setup = async () => {
    TestBed.configureTestingModule({
      imports: [Shell],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const store = TestBed.inject(AuthStore);
    const done = store.login({ email: 'a@b.c', password: 'x' });
    TestBed.inject(HttpTestingController).expectOne('/api/auth/login').flush(authResponse());
    await done;
    const fixture = TestBed.createComponent(Shell);
    await fixture.whenStable();
    return { fixture, store, element: fixture.nativeElement as HTMLElement };
  };

  it('shows the navigation and who is signed in', async () => {
    const { element } = await setup();

    const links = Array.from(element.querySelectorAll('nav a')).map((a) => a.textContent?.trim());
    expect(links).toEqual([
      'داشبورد',
      'تراکنش‌ها',
      'حساب‌ها',
      'دسته‌بندی‌ها',
      'گزارش‌ها',
      'اهداف',
      'دستیار هوشمند',
    ]);
    expect(element.querySelector('.user-name')?.textContent).toContain('سارا احمدی');
  });

  it('toggles the menu on small screens', async () => {
    const { fixture, element } = await setup();
    const toggle = element.querySelector<HTMLButtonElement>('.menu-toggle')!;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');

    toggle.click();
    await fixture.whenStable();

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(element.querySelector('nav')!.classList).toContain('open');
  });

  it('signs out', async () => {
    const { fixture, store, element } = await setup();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    Array.from(element.querySelectorAll<HTMLButtonElement>('.user button'))
      .find((b) => b.textContent?.includes('خروج'))!
      .click();
    await fixture.whenStable();

    expect(store.isAuthenticated()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/login'], { queryParams: {} });
  });
});
