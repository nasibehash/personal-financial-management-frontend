import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-progress',
  template: `
    <div
      class="track"
      role="progressbar"
      aria-valuemin="0"
      aria-valuemax="100"
      [attr.aria-valuenow]="clamped()"
      [attr.aria-label]="label()"
    >
      <div class="fill" [class]="tone()" [style.inline-size.%]="clamped()"></div>
    </div>
  `,
  styles: `
    .track {
      block-size: 0.6rem;
      border-radius: 999px;
      background: var(--surface-2);
      overflow: hidden;
    }
    .fill {
      block-size: 100%;
      border-radius: 999px;
      background: var(--primary);
      transition: inline-size 0.3s;
    }
    .fill.income {
      background: var(--income);
    }
    .fill.warn {
      background: var(--warn);
    }
    .fill.expense {
      background: var(--expense);
    }
  `,
})
export class ProgressBar {
  readonly value = input.required<number>();
  readonly tone = input<'primary' | 'income' | 'warn' | 'expense'>('primary');
  readonly label = input('پیشرفت');

  protected readonly clamped = computed(() => Math.min(Math.max(Math.round(this.value()), 0), 100));
}
