import { Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { forkJoin, map } from 'rxjs';
import { ApiClient } from '../../core/api-client';
import { AuthStore } from '../../core/auth-store';
import { describeError } from '../../core/errors';
import { jalaliMonthLabel, jalaliMonthRange, jalaliMonthShort } from '../../core/jalali';
import { Lookups } from '../../core/lookups';
import { resourceValue } from '../../core/resource-value';
import { BarItem, BarList } from '../../shared/bar-list';
import { PageHeader } from '../../shared/page-header';
import { JalaliPipe, MoneyPipe } from '../../shared/pipes';
import { ProgressBar } from '../../shared/progress-bar';
import { ErrorBlock } from '../../shared/state-views';
import { TrendChart, TrendPoint } from '../../shared/trend-chart';
import { SmartEntry } from '../assistant/smart-entry';

const TREND_MONTHS = 4;

@Component({
  selector: 'app-dashboard-page',
  imports: [
    RouterLink,
    PageHeader,
    MoneyPipe,
    JalaliPipe,
    BarList,
    TrendChart,
    ProgressBar,
    ErrorBlock,
    SmartEntry,
  ],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
})
export class DashboardPage {
  private readonly api = inject(ApiClient);
  protected readonly auth = inject(AuthStore);
  protected readonly lookups = inject(Lookups);

  private readonly month = jalaliMonthRange(0);
  protected readonly monthLabel = jalaliMonthLabel(this.month.from);

  protected readonly summary = rxResource({
    stream: () => this.api.summary(this.month.from, this.month.to),
  });

  protected readonly breakdown = rxResource({
    stream: () => this.api.categoryBreakdown('Expense', this.month.from, this.month.to),
  });

  protected readonly trend = rxResource({
    stream: () =>
      forkJoin(
        Array.from({ length: TREND_MONTHS }, (_, i) => {
          const range = jalaliMonthRange(i - (TREND_MONTHS - 1));
          return this.api.summary(range.from, range.to).pipe(
            map((s): TrendPoint => ({
              label: jalaliMonthShort(range.from),
              income: s.totalIncome,
              expense: s.totalExpense,
            })),
          );
        }),
      ),
  });

  protected readonly goals = rxResource({ stream: () => this.api.goals('Active') });

  protected readonly recent = rxResource({
    stream: () => this.api.transactions({ page: 1, pageSize: 5 }),
  });

  protected readonly stats = computed(() => resourceValue(this.summary, undefined) ?? null);
  protected readonly trendPoints = computed<TrendPoint[]>(
    () => resourceValue(this.trend, undefined) ?? [],
  );
  protected readonly categoryBars = computed<BarItem[]>(() =>
    (resourceValue(this.breakdown, undefined)?.categories ?? []).slice(0, 5).map((c) => ({
      label: c.categoryName,
      amount: c.total,
      percent: c.percentage,
    })),
  );
  protected readonly activeGoals = computed(() =>
    (resourceValue(this.goals, undefined) ?? []).slice(0, 3),
  );
  protected readonly recentItems = computed(
    () => resourceValue(this.recent, undefined)?.items ?? [],
  );
  protected readonly accounts = computed(() => this.lookups.accountList());

  protected readonly error = computed(() => {
    const failed = [this.summary, this.breakdown, this.trend, this.goals, this.recent].find((r) =>
      r.error(),
    );
    return failed ? describeError(failed.error()) : null;
  });

  protected reload(): void {
    this.summary.reload();
    this.breakdown.reload();
    this.trend.reload();
    this.goals.reload();
    this.recent.reload();
    this.lookups.refresh();
  }
}
