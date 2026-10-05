import { Component, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiClient } from '../../core/api-client';
import { describeError } from '../../core/errors';
import { FinancialInsights } from '../../core/models';
import { jalaliMonthRange } from '../../core/jalali';

/** Short observations about this month's finances. Generated on demand, since it can take a few seconds. */
@Component({
  selector: 'app-insights-card',
  template: `
    <section class="card stack">
      <div class="row">
        <h2>تحلیل مالی</h2>
        <span class="spacer"></span>
        <button type="button" class="btn btn-sm" [disabled]="busy()" (click)="load()">
          {{ busy() ? 'در حال تحلیل…' : result() ? 'تحلیل دوباره' : 'تحلیل این ماه' }}
        </button>
      </div>

      @if (error(); as message) {
        <div class="alert alert-error" role="alert">{{ message }}</div>
      }

      @if (result(); as r) {
        <ul>
          @for (line of r.insights; track $index) {
            <li>{{ line }}</li>
          }
        </ul>
        <p class="muted small">
          {{
            r.generatedByAi
              ? 'تولیدشده با هوش مصنوعی'
              : 'بر پایه‌ی قوانین ساده (هوش مصنوعی تنظیم نشده)'
          }}
        </p>
      } @else if (!busy() && !error()) {
        <p class="muted">برای دیدن نکته‌هایی درباره‌ی درآمد، هزینه و اهدافتان دکمه را بزنید.</p>
      }
    </section>
  `,
  styles: `
    h2,
    p {
      margin: 0;
    }
    ul {
      margin: 0;
      padding-inline-start: 1.25rem;
      display: grid;
      gap: 0.4rem;
    }
  `,
})
export class InsightsCard {
  private readonly api = inject(ApiClient);

  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly result = signal<FinancialInsights | null>(null);

  protected async load(): Promise<void> {
    const range = jalaliMonthRange(0);
    this.busy.set(true);
    this.error.set(null);
    try {
      this.result.set(await firstValueFrom(this.api.insights(range.from, range.to)));
    } catch (error) {
      this.error.set(describeError(error));
    } finally {
      this.busy.set(false);
    }
  }
}
