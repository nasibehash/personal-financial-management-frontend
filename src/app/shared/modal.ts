import { AfterViewInit, Component, ElementRef, input, output, viewChild } from '@angular/core';

let nextId = 0;

/**
 * A modal dialog built on the native <dialog>. It opens as soon as it is created, so show it with
 * `@if (open()) { <app-modal ...> }` and destroy it in the (closed) handler; its content then starts fresh every time.
 */
@Component({
  selector: 'app-modal',
  template: `
    <dialog
      #dialog
      [attr.aria-labelledby]="titleId"
      (close)="closed.emit()"
      (click)="onBackdropClick($event)"
    >
      <header>
        <h2 [id]="titleId">{{ title() }}</h2>
        <button type="button" class="btn btn-ghost btn-sm" aria-label="بستن" (click)="close()">
          ✕
        </button>
      </header>
      <ng-content />
    </dialog>
  `,
  styles: `
    header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
    }
    dialog {
      max-block-size: calc(100dvh - 2rem);
      overflow-y: auto;
    }
  `,
})
export class Modal implements AfterViewInit {
  readonly title = input.required<string>();
  readonly closed = output<void>();

  protected readonly titleId = `modal-title-${nextId++}`;
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  ngAfterViewInit(): void {
    const element = this.dialog().nativeElement;
    if (typeof element.showModal === 'function') {
      element.showModal();
    } else {
      element.setAttribute('open', '');
    }
  }

  protected close(): void {
    const element = this.dialog().nativeElement;
    if (typeof element.close === 'function') {
      element.close();
    } else {
      element.removeAttribute('open');
      this.closed.emit();
    }
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement) {
      this.close();
    }
  }
}
