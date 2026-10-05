import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { goal, settle, startLoading } from '../../core/testing';
import { GoalsPage } from './goals-page';

describe('GoalsPage', () => {
  beforeEach(() => localStorage.clear());

  const setup = async () => {
    TestBed.configureTestingModule({
      imports: [GoalsPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(GoalsPage);
    fixture.detectChanges();
    await startLoading();
    return { fixture, http, element: fixture.nativeElement as HTMLElement };
  };

  it('lists active goals first, with their progress', async () => {
    const { fixture, http, element } = await setup();
    const request = http.expectOne((r) => r.url === '/api/goals');
    expect(request.request.params.get('status')).toBe('Active');
    request.flush([goal()]);
    await settle(fixture);

    expect(element.textContent).toContain('خرید ماشین');
    expect(element.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('25');
  });

  it('reloads when another status is chosen', async () => {
    const { fixture, http, element } = await setup();
    http.expectOne((r) => r.url === '/api/goals').flush([]);
    await settle(fixture);

    const all = Array.from(element.querySelectorAll<HTMLButtonElement>('.segmented button')).find(
      (b) => b.textContent?.includes('همه'),
    )!;
    all.click();
    await startLoading();

    const request = http.expectOne((r) => r.url === '/api/goals');
    expect(request.request.params.has('status')).toBe(false);
    request.flush([]);
  });

  it('shows an empty state', async () => {
    const { fixture, http, element } = await setup();
    http.expectOne((r) => r.url === '/api/goals').flush([]);
    await settle(fixture);

    expect(element.textContent).toContain('هدفی پیدا نشد');
  });
});
