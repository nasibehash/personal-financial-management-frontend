import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  TestRequest,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Lookups } from '../../core/lookups';
import { Paged, Transaction } from '../../core/models';
import { fakeLookups, setValue, settle, startLoading, transaction } from '../../core/testing';
import { ConfirmService } from '../../shared/confirm';
import { ToastService } from '../../shared/toast';
import { TransactionsPage } from './transactions-page';

const page = (
  items: Transaction[],
  overrides: Partial<Paged<Transaction>> = {},
): Paged<Transaction> => ({
  items,
  page: 1,
  pageSize: 20,
  totalCount: items.length,
  totalPages: items.length ? 1 : 0,
  ...overrides,
});

describe('TransactionsPage', () => {
  beforeEach(() => localStorage.clear());

  const list = (http: HttpTestingController): TestRequest =>
    http.expectOne((r) => r.url === '/api/transactions');

  const setup = async (first: Paged<Transaction> = page([transaction()])) => {
    TestBed.configureTestingModule({
      imports: [TransactionsPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Lookups, useValue: fakeLookups() },
      ],
    });
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(TransactionsPage);
    fixture.detectChanges();
    await startLoading();
    const request = list(http);
    request.flush(first);
    await settle(fixture);
    return { fixture, http, first: request, element: fixture.nativeElement as HTMLElement };
  };

  const next = async (
    fixture: ComponentFixture<unknown>,
    http: HttpTestingController,
    result: Paged<Transaction> = page([transaction()]),
  ) => {
    await startLoading();
    const request = list(http);
    request.flush(result);
    await settle(fixture);
    return request;
  };

  const button = (root: Element, text: string) =>
    Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes(text),
    )!;

  it('asks for the first page without filters and lists the transactions', async () => {
    const { first, element } = await setup(
      page([
        transaction(),
        transaction({
          id: 'tx-2',
          type: 'Income',
          amount: 30000000,
          description: null,
          categoryName: 'حقوق',
          source: 'Voice',
        }),
        transaction({
          id: 'tx-3',
          type: 'Transfer',
          amount: 5000000,
          description: null,
          categoryId: null,
          categoryName: null,
          destinationAccountId: 'acc-2',
          destinationAccountName: 'حساب ملی',
        }),
      ]),
    );

    expect(first.request.params.keys().sort()).toEqual(['page', 'pageSize']);
    expect(first.request.params.get('pageSize')).toBe('20');
    const rows = element.querySelectorAll('.rows .tx');
    expect(rows).toHaveLength(3);

    expect(rows[0].textContent).toContain('ناهار');
    expect(rows[0].querySelector('.amount')!.textContent).toContain('−۲۵۰٬۰۰۰');
    expect(rows[0].querySelector('.amount')!.classList).toContain('expense');

    expect(rows[1].textContent).toContain('حقوق'); // no description: falls back to the category
    expect(rows[1].textContent).toContain('با صدا');
    expect(rows[1].querySelector('.amount')!.textContent).toContain('+۳۰٬۰۰۰٬۰۰۰');
    expect(rows[1].querySelector('.amount')!.classList).toContain('income');

    expect(rows[2].textContent).toContain('انتقال بین حساب‌ها');
    expect(rows[2].textContent).toContain('کیف پول ← حساب ملی');
    expect(rows[2].querySelector('.amount')!.classList).not.toContain('income');
  });

  it('filters by type, account, category and dates and starts again from page 1', async () => {
    const { fixture, http, element } = await setup(
      page([transaction()], { totalPages: 3, totalCount: 50 }),
    );
    button(element, 'بعدی').click();
    const second = await next(
      fixture,
      http,
      page([transaction()], { page: 2, totalPages: 3, totalCount: 50 }),
    );
    expect(second.request.params.get('page')).toBe('2');

    setValue(element.querySelector<HTMLSelectElement>('#f-type')!, 'Expense');
    let request = await next(fixture, http);
    expect(request.request.params.get('type')).toBe('Expense');
    expect(request.request.params.get('page')).toBe('1');

    setValue(element.querySelector<HTMLSelectElement>('#f-account')!, 'acc-2');
    request = await next(fixture, http);
    expect(request.request.params.get('accountId')).toBe('acc-2');

    setValue(element.querySelector<HTMLSelectElement>('#f-category')!, 'e1');
    request = await next(fixture, http);
    expect(request.request.params.get('categoryId')).toBe('e1');

    const from = element.querySelector<HTMLInputElement>('#f-from')!;
    from.value = '2026-10-01';
    from.dispatchEvent(new Event('change'));
    request = await next(fixture, http);
    expect(request.request.params.get('from')).toBe('2026-10-01');

    const to = element.querySelector<HTMLInputElement>('#f-to')!;
    to.value = '2026-10-31';
    to.dispatchEvent(new Event('change'));
    request = await next(fixture, http);
    expect(request.request.params.get('to')).toBe('2026-10-31');
  });

  it('searches after the user stops typing', async () => {
    const { fixture, http, element } = await setup();

    setValue(element.querySelector<HTMLInputElement>('#f-search')!, 'ناهار');
    await settle(fixture);
    http.expectNone((r) => r.url === '/api/transactions'); // still waiting for more typing

    await new Promise((resolve) => setTimeout(resolve, 450));
    const request = await next(fixture, http);
    expect(request.request.params.get('search')).toBe('ناهار');
  });

  it('applies the Jalali month presets and can clear the filters', async () => {
    const { fixture, http, element } = await setup();

    button(element, 'ماه قبل').click();
    let request = await next(fixture, http);
    expect(request.request.params.get('from')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(request.request.params.get('to')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(request.request.params.get('from')! < request.request.params.get('to')!).toBe(true);

    button(element, 'پاک کردن فیلترها').click();
    request = await next(fixture, http);
    expect(request.request.params.keys().sort()).toEqual(['page', 'pageSize']);
  });

  it('moves between pages', async () => {
    const { fixture, http, element } = await setup(
      page([transaction()], { totalPages: 3, totalCount: 41 }),
    );
    expect(element.querySelector('.pager')!.textContent).toContain('صفحه ۱ از ۳');
    expect(button(element, 'قبلی').disabled).toBe(true);

    button(element, 'بعدی').click();
    const request = await next(
      fixture,
      http,
      page([transaction()], { page: 2, totalPages: 3, totalCount: 41 }),
    );

    expect(request.request.params.get('page')).toBe('2');
    expect(element.querySelector('.pager')!.textContent).toContain('صفحه ۲ از ۳');
    expect(button(element, 'قبلی').disabled).toBe(false);
  });

  it('shows different empty states with and without filters', async () => {
    const { fixture, http, element } = await setup(page([]));
    expect(element.textContent).toContain('هنوز تراکنشی ثبت نشده');

    setValue(element.querySelector<HTMLSelectElement>('#f-type')!, 'Income');
    await next(fixture, http, page([]));

    expect(element.textContent).toContain('تراکنشی با این فیلترها پیدا نشد');
  });

  it('shows an error with a retry', async () => {
    TestBed.configureTestingModule({
      imports: [TransactionsPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Lookups, useValue: fakeLookups() },
      ],
    });
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(TransactionsPage);
    fixture.detectChanges();
    await startLoading();
    list(http).flush({}, { status: 500, statusText: 'Server Error' });
    await settle(fixture);
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.alert-error')).not.toBeNull();

    button(element, 'تلاش دوباره').click();
    await next(fixture, http);
    expect(element.querySelectorAll('.rows .tx')).toHaveLength(1);
  });

  it('deletes after confirmation and reloads', async () => {
    const { fixture, http, element } = await setup();
    const ask = vi.spyOn(TestBed.inject(ConfirmService), 'ask');

    ask.mockResolvedValueOnce(false);
    button(element, 'حذف').click();
    await settle(fixture);
    http.expectNone('/api/transactions/tx-1');

    ask.mockResolvedValueOnce(true);
    button(element, 'حذف').click();
    await settle(fixture);
    const del = http.expectOne('/api/transactions/tx-1');
    expect(del.request.method).toBe('DELETE');
    del.flush(null);
    await settle(fixture);

    expect(
      TestBed.inject(ToastService)
        .toasts()
        .map((t) => t.message),
    ).toContain('تراکنش حذف شد.');
    await next(fixture, http, page([]));
  });

  it('goes back a page when the last transaction of a later page is deleted', async () => {
    const { fixture, http, element } = await setup(
      page([transaction()], { totalPages: 2, totalCount: 21 }),
    );
    button(element, 'بعدی').click();
    await next(
      fixture,
      http,
      page([transaction({ id: 'last' })], { page: 2, totalPages: 2, totalCount: 21 }),
    );
    vi.spyOn(TestBed.inject(ConfirmService), 'ask').mockResolvedValue(true);

    button(element, 'حذف').click();
    await settle(fixture);
    http.expectOne('/api/transactions/last').flush(null);
    await settle(fixture);

    const request = await next(
      fixture,
      http,
      page([transaction()], { totalPages: 1, totalCount: 20 }),
    );
    expect(request.request.params.get('page')).toBe('1');
  });

  it('opens the form for a new or an existing transaction and reloads after saving', async () => {
    const { fixture, http, element } = await setup();

    button(element, 'تراکنش جدید').click();
    await settle(fixture);
    expect(element.querySelector('dialog')!.textContent).toContain('تراکنش جدید');
    button(element, 'انصراف').click();
    await settle(fixture);
    expect(element.querySelector('dialog')).toBeNull();

    button(element, 'ویرایش').click();
    await settle(fixture);
    expect(element.querySelector('dialog')!.textContent).toContain('ویرایش تراکنش');
    setValue(element.querySelector<HTMLInputElement>('#tx-description')!, 'ناهار و قهوه');
    element.querySelector<HTMLFormElement>('dialog form')!.dispatchEvent(new Event('submit'));
    http.expectOne('/api/transactions/tx-1').flush(transaction({ description: 'ناهار و قهوه' }));
    await settle(fixture);

    expect(element.querySelector('dialog')).toBeNull();
    await next(fixture, http, page([transaction({ description: 'ناهار و قهوه' })]));
    expect(element.querySelector('.rows')!.textContent).toContain('ناهار و قهوه');
  });
});
