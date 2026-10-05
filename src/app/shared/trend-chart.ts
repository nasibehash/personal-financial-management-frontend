import { Component, computed, input } from '@angular/core';
import { formatMoney } from '../core/format';

export interface TrendPoint {
  label: string;
  income: number;
  expense: number;
}

/** Income and expense per month as paired bars. Months run right to left, like the rest of the page. */
@Component({
  selector: 'app-trend-chart',
  template: `
    <div class="chart" role="img" [attr.aria-label]="summary()">
      @for (bar of bars(); track bar.label) {
        <div class="col">
          <div class="pair">
            <div
              class="bar income"
              [style.block-size.%]="bar.incomeHeight"
              [attr.title]="bar.incomeTitle"
            ></div>
            <div
              class="bar expense"
              [style.block-size.%]="bar.expenseHeight"
              [attr.title]="bar.expenseTitle"
            ></div>
          </div>
          <span class="label small muted">{{ bar.label }}</span>
        </div>
      }
    </div>
    <p class="legend small muted">
      <span class="dot income"></span> درآمد <span class="dot expense"></span> هزینه
    </p>
  `,
  styles: `
    .chart {
      display: flex;
      gap: 0.5rem;
      align-items: stretch;
      block-size: 12rem;
    }
    .col {
      flex: 1;
      min-inline-size: 0;
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }
    .pair {
      flex: 1;
      display: flex;
      gap: 3px;
      align-items: flex-end;
      justify-content: center;
    }
    .bar {
      inline-size: 40%;
      max-inline-size: 1.6rem;
      min-block-size: 2px;
      border-radius: 0.3rem 0.3rem 0 0;
    }
    .bar.income,
    .dot.income {
      background: var(--income);
    }
    .bar.expense,
    .dot.expense {
      background: var(--expense);
    }
    .label {
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .legend {
      margin: 0.5rem 0 0;
      display: flex;
      gap: 0.4rem;
      align-items: center;
    }
    .dot {
      display: inline-block;
      inline-size: 0.7rem;
      block-size: 0.7rem;
      border-radius: 50%;
      margin-inline-start: 0.6rem;
    }
  `,
})
export class TrendChart {
  readonly points = input.required<TrendPoint[]>();

  protected readonly bars = computed(() => {
    const max = Math.max(1, ...this.points().flatMap((p) => [p.income, p.expense]));
    return this.points().map((p) => ({
      label: p.label,
      incomeHeight: (p.income / max) * 100,
      expenseHeight: (p.expense / max) * 100,
      incomeTitle: `${p.label} — درآمد: ${formatMoney(p.income)}`,
      expenseTitle: `${p.label} — هزینه: ${formatMoney(p.expense)}`,
    }));
  });

  protected readonly summary = computed(() =>
    this.points()
      .map((p) => `${p.label}: درآمد ${formatMoney(p.income)}، هزینه ${formatMoney(p.expense)}`)
      .join('؛ '),
  );
}
