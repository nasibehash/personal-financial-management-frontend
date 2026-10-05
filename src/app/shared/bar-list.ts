import { Component, input } from '@angular/core';
import { MoneyPipe, PercentPipe } from './pipes';

export interface BarItem {
  label: string;
  amount: number;
  percent: number;
}

/** A ranked list of horizontal bars, e.g. spending per category. */
@Component({
  selector: 'app-bar-list',
  imports: [MoneyPipe, PercentPipe],
  template: `
    <ul>
      @for (item of items(); track item.label) {
        <li>
          <div class="line">
            <span>{{ item.label }}</span>
            <span class="muted small num">{{ item.percent | percent }}</span>
            <span class="spacer"></span>
            <strong class="num" [class]="tone()">{{ item.amount | money }}</strong>
          </div>
          <div class="track">
            <div class="fill" [class]="tone()" [style.inline-size.%]="item.percent"></div>
          </div>
        </li>
      }
    </ul>
  `,
  styles: `
    ul {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 0.8rem;
    }
    .line {
      display: flex;
      gap: 0.5rem;
      align-items: baseline;
    }
    .spacer {
      flex: 1;
    }
    .track {
      block-size: 0.5rem;
      border-radius: 999px;
      background: var(--surface-2);
      overflow: hidden;
      margin-block-start: 0.2rem;
    }
    .fill {
      block-size: 100%;
      border-radius: 999px;
      background: var(--expense);
    }
    .fill.income {
      background: var(--income);
    }
  `,
})
export class BarList {
  readonly items = input.required<BarItem[]>();
  readonly tone = input<'income' | 'expense'>('expense');
}
