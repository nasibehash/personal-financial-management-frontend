import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfirmHost, ConfirmService } from './confirm';
import { Modal } from './modal';
import { ToastHost, ToastService } from './toast';

describe('ToastService', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows a message and removes it after a while', () => {
    const toasts = TestBed.inject(ToastService);

    toasts.success('ذخیره شد');
    toasts.error('خطا');
    expect(toasts.toasts().map((t) => t.kind)).toEqual(['success', 'error']);

    vi.advanceTimersByTime(4100);
    expect(toasts.toasts().map((t) => t.kind)).toEqual(['error']);
    vi.advanceTimersByTime(4000);
    expect(toasts.toasts()).toEqual([]);
  });
});

describe('ToastHost', () => {
  it('renders the messages and lets the user dismiss them', async () => {
    const toasts = TestBed.inject(ToastService);
    const fixture = TestBed.createComponent(ToastHost);
    toasts.success('ذخیره شد');
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('ذخیره شد');

    toasts.dismiss(toasts.toasts()[0].id);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('ذخیره شد');
  });
});

describe('ConfirmService', () => {
  it('resolves with the answer', async () => {
    const service = TestBed.inject(ConfirmService);

    const yes = service.ask({ message: 'مطمئنی؟' });
    expect(service.pending()?.options.message).toBe('مطمئنی؟');
    service.answer(true);
    expect(await yes).toBe(true);
    expect(service.pending()).toBeNull();

    const no = service.ask({ message: 'مطمئنی؟' });
    service.answer(false);
    expect(await no).toBe(false);
  });

  it('ignores an answer when nothing is pending', () => {
    expect(() => TestBed.inject(ConfirmService).answer(true)).not.toThrow();
  });

  it('renders the question with its buttons in the host', async () => {
    const service = TestBed.inject(ConfirmService);
    const fixture = TestBed.createComponent(ConfirmHost);
    const answer = service.ask({
      message: 'این تراکنش حذف شود؟',
      confirmLabel: 'حذف',
      danger: true,
    });
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('این تراکنش حذف شود؟');
    const buttons = Array.from(element.querySelectorAll('.form-actions button'));
    expect(buttons.map((b) => b.textContent?.trim())).toEqual(['انصراف', 'حذف']);
    expect(buttons[1].classList).toContain('btn-danger');

    (buttons[1] as HTMLButtonElement).click();
    expect(await answer).toBe(true);
  });
});

@Component({
  imports: [Modal],
  template: `<app-modal title="عنوان" (closed)="closedCount = closedCount + 1"
    ><p>محتوا</p></app-modal
  >`,
})
class ModalHost {
  closedCount = 0;
}

describe('Modal', () => {
  it('opens right away with its title and content', async () => {
    const fixture = TestBed.createComponent(ModalHost);
    await fixture.whenStable();

    const dialog = (fixture.nativeElement as HTMLElement).querySelector('dialog')!;
    expect(dialog.hasAttribute('open')).toBe(true);
    expect(dialog.textContent).toContain('عنوان');
    expect(dialog.textContent).toContain('محتوا');
  });

  it('tells the parent when it is closed', async () => {
    const fixture = TestBed.createComponent(ModalHost);
    await fixture.whenStable();

    const close = (fixture.nativeElement as HTMLElement).querySelector(
      'header button',
    ) as HTMLButtonElement;
    close.click();

    expect(fixture.componentInstance.closedCount).toBe(1);
  });
});
