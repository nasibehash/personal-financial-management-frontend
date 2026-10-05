import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-loading',
  template: `
    <div class="stack" role="status" aria-label="در حال بارگذاری">
      @for (row of rows; track row) {
        <div class="skeleton"></div>
      }
    </div>
  `,
})
export class Loading {
  readonly count = input(3);

  protected get rows(): number[] {
    return Array.from({ length: this.count() }, (_, i) => i);
  }
}

@Component({
  selector: 'app-error',
  template: `
    <div class="alert alert-error row" role="alert">
      <span>{{ message() }}</span>
      <span class="spacer"></span>
      <button type="button" class="btn btn-sm" (click)="retry.emit()">تلاش دوباره</button>
    </div>
  `,
})
export class ErrorBlock {
  readonly message = input.required<string>();
  readonly retry = output<void>();
}

@Component({
  selector: 'app-empty',
  template: `
    <div class="empty">
      <p class="icon" aria-hidden="true">{{ icon() }}</p>
      <p>
        <strong>{{ title() }}</strong>
      </p>
      @if (hint()) {
        <p class="muted">{{ hint() }}</p>
      }
      <ng-content />
    </div>
  `,
  styles: `
    .empty {
      text-align: center;
      padding: 2rem 1rem;
    }
    .icon {
      font-size: 2rem;
      margin: 0;
    }
  `,
})
export class EmptyState {
  readonly title = input.required<string>();
  readonly hint = input('');
  readonly icon = input('🗂️');
}
