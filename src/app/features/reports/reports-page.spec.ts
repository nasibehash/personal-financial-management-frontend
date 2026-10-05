import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { jalaliMonthRange } from '../../core/jalali';
import { settle, startLoading } from '../../core/testing';
import { ReportsPage } from './reports-page';

const summary = (income: number, expense: number) => ({
  from: '',
  to: '',
  totalIncome: income,
  totalExpense: expense,
  netAmount: income - expense,
  savingsRate: null,
  transactionCount: 0,
  averageDailyExpense: 0,
  totalBalance: 0,
});

describe('ReportsPage', () => {
  beforeEach(() => localStorage.clear());

  const setup = async () => {
    TestBed.configureTestingModule({
      imports: [ReportsPage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(ReportsPage);
    fixture.detectChanges();
    await startLoading();
    return { fixture, http, element: fixture.nativeElement as HTMLElement };
  };

  const answerAll = (http: HttpTestingController) => {
    for (const r of http.match(() => true)) {
      if (r.request.url.endsWith('/reports/summary')) {
        r.flush(summary(1000, 400));
      } else if (r.request.url.endsWith('/reports/comparison')) {
        const totals = { from: '2026-01-01', to: '2026-01-31', income: 0, expense: 0, net: 0 };
        r.flush({
          current: totals,
          previous: totals,
          incomeChangePercent: null,
          expenseChangePercent: null,
        });
      } else {
        r.flush({ type: 'Expense', total: 0, categories: [] });
      }
    }
  };

  it('asks for the current Jalali month by default', async () => {
    const { http } = await setup();
    const range = jalaliMonthRange(0);

    const requests = http.match((r) => r.url === '/api/reports/summary');
    expect(requests.some((r) => r.request.params.get('from') === range.from)).toBe(true);
    expect(
      requests.some(
        (r) =>
          r.request.params.get('from') === range.from && r.request.params.get('to') === range.to,
      ),
    ).toBe(true);
  });

  it('loads one summary per month for the trend', async () => {
    const { http } = await setup();

    // 1 for the selected period + 6 months for the trend
    expect(http.match((r) => r.url === '/api/reports/summary')).toHaveLength(7);
  });

  it('switches the breakdown to income', async () => {
    const { fixture, http, element } = await setup();
    answerAll(http);
    await settle(fixture);

    const income = Array.from(element.querySelectorAll<HTMLButtonElement>('button')).find(
      (b) => b.getAttribute('aria-pressed') !== null && b.textContent?.includes('درآمد'),
    )!;
    income.click();
    await startLoading();

    const breakdown = http.expectOne((r) => r.url === '/api/reports/category-breakdown');
    expect(breakdown.request.params.get('type')).toBe('Income');
    breakdown.flush({ type: 'Income', total: 0, categories: [] });
    http.match(() => true);
  });

  it('does not request anything for an incomplete custom range', async () => {
    const { fixture, http, element } = await setup();
    answerAll(http);
    await settle(fixture);

    const custom = Array.from(element.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes('بازه دلخواه'),
    )!;
    custom.click();
    await startLoading();

    expect(http.match((r) => r.url === '/api/reports/category-breakdown')).toHaveLength(0);
    expect(http.match((r) => r.url === '/api/reports/comparison')).toHaveLength(0);
  });

  it('shows an error when a report fails', async () => {
    const { fixture, http, element } = await setup();
    for (const r of http.match((r) => r.url === '/api/reports/summary')) {
      if (r.cancelled) {
        continue;
      }
      r.flush({ title: 'x' }, { status: 500, statusText: 'Server Error' });
    }
    http.match(() => true);
    await settle(fixture);

    expect(element.querySelector('[role="alert"], .alert-error')).not.toBeNull();
  });
});
