import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { forkJoin, map } from 'rxjs';
import { ApiClient } from '../../core/api-client';
import { describeError } from '../../core/errors';
import { formatPercent } from '../../core/format';
import {
  DayRange,
  formatJalaliDay,
  jalaliMonthLabel,
  jalaliMonthRange,
  jalaliMonthShort,
  jalaliYearRange,
  todayIso,
} from '../../core/jalali';
import { CategoryType } from '../../core/models';
import { resourceValue } from '../../core/resource-value';
import { BarItem, BarList } from '../../shared/bar-list';
import { PageHeader } from '../../shared/page-header';
import { JalaliPipe, MoneyPipe, PercentPipe } from '../../shared/pipes';
import { EmptyState, ErrorBlock, Loading } from '../../shared/state-views';
import { TrendChart, TrendPoint } from '../../shared/trend-chart';

type Preset = 'month' | 'lastMonth' | 'quarter' | 'year' | 'custom';

const PRESETS: { value: Preset; label: string }[] = [
  { value: 'month', label: 'این ماه' },
  { value: 'lastMonth', label: 'ماه قبل' },
  { value: 'quarter', label: '۳ ماه اخیر' },
  { value: 'year', label: 'امسال' },
  { value: 'custom', label: 'بازه دلخواه' },
];

@Component({
  selector: 'app-reports-page',
  imports: [
    PageHeader,
    MoneyPipe,
    JalaliPipe,
    PercentPipe,
    BarList,
    TrendChart,
    Loading,
    ErrorBlock,
    EmptyState,
  ],
  templateUrl: './reports-page.html',
  styleUrl: './reports-page.scss',
})
export class ReportsPage {
  private readonly api = inject(ApiClient);

  protected readonly presets = PRESETS;
  protected readonly preset = signal<Preset>('month');
  protected readonly customFrom = signal('');
  protected readonly customTo = signal('');
  protected readonly breakdownType = signal<CategoryType>('Expense');
  protected readonly trendMonths = signal(6);

  /** The selected period; undefined while a custom range is incomplete or inverted. */
  protected readonly range = computed<DayRange | undefined>(() => {
    switch (this.preset()) {
      case 'month':
        return jalaliMonthRange(0);
      case 'lastMonth':
        return jalaliMonthRange(-1);
      case 'quarter':
        return { from: jalaliMonthRange(-2).from, to: todayIso() };
      case 'year':
        return jalaliYearRange();
      case 'custom': {
        const from = this.customFrom();
        const to = this.customTo();
        return from && to && from <= to ? { from, to } : undefined;
      }
    }
  });

  protected readonly rangeLabel = computed(() => {
    const range = this.range();
    return range ? `از ${formatJalaliDay(range.from)} تا ${formatJalaliDay(range.to)}` : '';
  });

  protected readonly summary = rxResource({
    params: () => this.range(),
    stream: ({ params }) => this.api.summary(params.from, params.to),
  });

  protected readonly comparison = rxResource({
    params: () => this.range(),
    stream: ({ params }) => this.api.comparison(params.from, params.to),
  });

  protected readonly breakdown = rxResource({
    params: () => {
      const range = this.range();
      return range ? { ...range, type: this.breakdownType() } : undefined;
    },
    stream: ({ params }) => this.api.categoryBreakdown(params.type, params.from, params.to),
  });

  /** Income and expense of the last N Jalali months, one summary request per month. */
  protected readonly trend = rxResource({
    params: () => ({ months: this.trendMonths() }),
    stream: ({ params }) => {
      const ranges = Array.from({ length: params.months }, (_, i) =>
        jalaliMonthRange(i - (params.months - 1)),
      );
      return forkJoin(
        ranges.map((range) =>
          this.api.summary(range.from, range.to).pipe(
            map((s): TrendPoint => ({
              label: jalaliMonthShort(range.from),
              income: s.totalIncome,
              expense: s.totalExpense,
            })),
          ),
        ),
      );
    },
  });

  protected readonly trendPoints = computed<TrendPoint[]>(
    () => resourceValue(this.trend, undefined) ?? [],
  );

  protected readonly categoryBars = computed<BarItem[]>(() =>
    (resourceValue(this.breakdown, undefined)?.categories ?? []).map((c) => ({
      label: c.categoryName,
      amount: c.total,
      percent: c.percentage,
    })),
  );

  protected readonly trendLabel = computed(() => {
    const first = jalaliMonthRange(1 - this.trendMonths()).from;
    return `از ${jalaliMonthLabel(first)} تا ${jalaliMonthLabel(jalaliMonthRange(0).from)}`;
  });

  protected readonly error = computed(() => {
    const failed =
      this.summary.error() ??
      this.comparison.error() ??
      this.breakdown.error() ??
      this.trend.error();
    return failed ? describeError(failed) : null;
  });

  protected setPreset(preset: Preset): void {
    this.preset.set(preset);
  }

  protected setCustomFrom(event: Event): void {
    this.customFrom.set((event.target as HTMLInputElement).value);
  }

  protected setCustomTo(event: Event): void {
    this.customTo.set((event.target as HTMLInputElement).value);
  }

  protected setTrendMonths(event: Event): void {
    this.trendMonths.set(Number((event.target as HTMLSelectElement).value));
  }

  protected reload(): void {
    this.summary.reload();
    this.comparison.reload();
    this.breakdown.reload();
    this.trend.reload();
  }

  /** A change in spending is bad when it goes up, a change in income is good when it goes up. */
  protected changeText(change: number | null | undefined): string {
    if (change === null || change === undefined) {
      return 'بدون داده‌ی قبلی';
    }
    const arrow = change > 0 ? '▲' : change < 0 ? '▼' : '=';
    return `${arrow} ${formatPercent(Math.abs(change))}`;
  }

  protected changeClass(change: number | null | undefined, upIsGood: boolean): string {
    if (!change) {
      return 'muted';
    }
    return change > 0 === upIsGood ? 'income' : 'expense';
  }
}
