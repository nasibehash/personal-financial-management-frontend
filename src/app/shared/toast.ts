import { Component, Injectable, inject, signal } from '@angular/core';

export interface Toast {
  id: number;
  kind: 'success' | 'error';
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private nextId = 0;

  success(message: string): void {
    this.push('success', message, 4000);
  }

  error(message: string): void {
    this.push('error', message, 8000);
  }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }

  private push(kind: Toast['kind'], message: string, ms: number): void {
    const id = ++this.nextId;
    this.toasts.update((list) => [...list, { id, kind, message }]);
    setTimeout(() => this.dismiss(id), ms);
  }
}

@Component({
  selector: 'app-toast-host',
  template: `
    <div class="toasts" aria-live="polite">
      @for (toast of service.toasts(); track toast.id) {
        <div
          class="toast alert"
          [class.alert-error]="toast.kind === 'error'"
          [class.alert-success]="toast.kind === 'success'"
        >
          <span>{{ toast.message }}</span>
          <button type="button" class="close" aria-label="بستن" (click)="service.dismiss(toast.id)">
            ✕
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .toasts {
      position: fixed;
      inset-block-end: 1rem;
      inset-inline: 1rem;
      display: grid;
      gap: 0.5rem;
      justify-items: center;
      pointer-events: none;
      z-index: 50;
    }
    .toast {
      pointer-events: auto;
      display: flex;
      gap: 0.75rem;
      align-items: center;
      max-inline-size: min(34rem, 100%);
      box-shadow: var(--shadow);
      border: 1px solid var(--border);
    }
    .close {
      font: inherit;
      background: none;
      border: 0;
      color: inherit;
      cursor: pointer;
    }
  `,
})
export class ToastHost {
  protected readonly service = inject(ToastService);
}
