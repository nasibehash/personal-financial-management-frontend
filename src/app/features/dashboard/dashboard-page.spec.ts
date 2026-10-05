import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { AuthStore } from '../../core/auth-store';
import { Lookups } from '../../core/lookups';
import { fakeLookups, goal, settle, startLoading, transaction } from '../../core/testing';
import { DashboardPage } from './dashboard-page';

const summary = (income: number, expense: number) => ({
  from: '',
  to: '',
  totalIncome: income,
  totalExpense: expense,
  netAmount: income - expense,
  savingsRate: null,
  transactionCount: 0,
  averageDailyExpense: 0,
  totalBalance: 5000,
});

describe('DashboardPage', () => {
  beforeEach(() => localStorage.clear());

  const setup = async () => {
    TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: Lookups, useValue: fakeLookups() },
      ],
    });
    const http = TestBed.inject(HttpTestingController);
    TestBed.inject(AuthStore);
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    await startLoading();
    return { fixture, http, element: fixture.nativeElement as HTMLElement };
  };

  it('shows the month at a glance', async () => {
    const { fixture, http, element } = await setup();

    for (const r of http.match(() => true)) {
      const url = r.request.url;
      if (url.endsWith('/reports/summary')) {
        r.flush(summary(1000, 400));
      } else if (url.endsWith('/reports/category-breakdown')) {
        r.flush({
          from: '',
          to: '',
          type: 'Expense',
          total: 400,
          categories: [
            {
              categoryId: 'c',
              categoryName: 'خوراک',
              total: 400,
              percentage: 100,
              transactionCount: 1,
            },
          ],
        });
      } else if (url.endsWith('/goals')) {
        r.flush([goal()]);
      } else {
        r.flush({
          items: [transaction({ description: 'ناهار' })],
          page: 1,
          pageSize: 5,
          totalCount: 1,
          totalPages: 1,
        });
      }
    }
    await settle(fixture);

    const text = element.textContent ?? '';
    expect(text).toContain('خوراک');
    expect(text).toContain('خرید ماشین');
    expect(text).toContain('ناهار');
  });

  it('shows an error when something fails to load', async () => {
    const { fixture, http, element } = await setup();

    for (const r of http.match(() => true)) {
      if (r.cancelled) {
        continue;
      }
      r.flush({ title: 'x' }, { status: 500, statusText: 'Server Error' });
    }
    await settle(fixture);

    expect(element.querySelector('[role="alert"], .alert-error')).not.toBeNull();
  });
});
