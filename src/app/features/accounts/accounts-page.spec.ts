import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  TestRequest,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { account, setValue, settle, startLoading, submit } from '../../core/testing';
import { ConfirmService } from '../../shared/confirm';
import { ToastService } from '../../shared/toast';
import { AccountsPage } from './accounts-page';

describe('AccountsPage', () => {
  beforeEach(() => localStorage.clear());

  const setup = async (
    accounts = [
      account(),
      account({ id: 'acc-2', name: 'حساب ملی', type: 'BankAccount', balance: -200 }),
    ],
  ) => {
    TestBed.configureTestingModule({
      imports: [AccountsPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(AccountsPage);
    fixture.detectChanges();
    await startLoading();
    http
      .expectOne((r) => r.url === '/api/accounts' && r.params.get('includeArchived') === 'false')
      .flush(accounts);
    await settle(fixture);
    return { fixture, http, element: fixture.nativeElement as HTMLElement };
  };

  const button = (element: HTMLElement, text: string) =>
    Array.from(element.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes(text),
    )!;

  const reloadList = async (
    fixture: ComponentFixture<unknown>,
    http: HttpTestingController,
    accounts: unknown[] = [],
  ) => {
    await startLoading();
    http.expectOne((r) => r.url === '/api/accounts').flush(accounts);
    await settle(fixture);
  };

  it('lists the accounts with their balances and the total', async () => {
    const { element } = await setup();

    const cards = element.querySelectorAll('article');
    expect(cards).toHaveLength(2);
    expect(cards[0].textContent).toContain('کیف پول');
    expect(cards[0].textContent).toContain('نقد');
    expect(cards[0].textContent).toContain('۱٬۵۰۰');
    expect(cards[1].querySelector('.balance')!.classList).toContain('expense');
    expect(element.querySelector('.total')!.textContent).toContain('۱٬۳۰۰'); // 1500 - 200
  });

  it('leaves archived accounts out of the total and shows them on request', async () => {
    const { fixture, http, element } = await setup([
      account(),
      account({ id: 'x', balance: 500, isArchived: true }),
    ]);
    expect(element.querySelector('.total')!.textContent).toContain('۱٬۵۰۰');
    expect(element.textContent).toContain('بایگانی‌شده');

    const checkbox = element.querySelector<HTMLInputElement>('.summary input[type=checkbox]')!;
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));
    await startLoading();
    http
      .expectOne((r) => r.url === '/api/accounts' && r.params.get('includeArchived') === 'true')
      .flush([]);
    await settle(fixture);
  });

  it('invites the user to create the first account', async () => {
    const { element } = await setup([]);

    expect(element.textContent).toContain('هنوز حسابی ندارید');
    expect(button(element, 'ساخت اولین حساب')).toBeTruthy();
  });

  it('shows an error with a retry when loading fails', async () => {
    TestBed.configureTestingModule({
      imports: [AccountsPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(AccountsPage);
    fixture.detectChanges();
    await startLoading();
    http
      .expectOne((r) => r.url === '/api/accounts')
      .flush({}, { status: 500, statusText: 'Server Error' });
    await settle(fixture);

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.alert-error')!.textContent).toContain('خطایی در سرور');

    button(element, 'تلاش دوباره').click();
    await startLoading();
    http.expectOne((r) => r.url === '/api/accounts').flush([]);
  });

  it('creates an account from the dialog and reloads the list', async () => {
    const { fixture, http, element } = await setup([]);
    button(element, 'حساب جدید').click();
    await settle(fixture);

    setValue(element.querySelector<HTMLInputElement>('#account-name')!, '  کیف پول ');
    setValue(element.querySelector<HTMLInputElement>('app-amount-input input')!, '1500000');
    setValue(element.querySelector<HTMLSelectElement>('#account-type')!, 'Savings');
    submit(element.querySelector('dialog form')!);

    const post: TestRequest = http.expectOne('/api/accounts');
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual({
      name: 'کیف پول',
      type: 'Savings',
      initialBalance: 1500000,
      isArchived: false,
    });
    post.flush(account());
    await settle(fixture);

    expect(element.querySelector('dialog')).toBeNull();
    expect(
      TestBed.inject(ToastService)
        .toasts()
        .map((t) => t.message),
    ).toContain('حساب ساخته شد.');
    await reloadList(fixture, http, [account({ name: 'کیف پول' })]);
    expect(element.querySelectorAll('article')).toHaveLength(1);
  });

  it('validates the name before saving', async () => {
    const { fixture, http, element } = await setup([]);
    button(element, 'حساب جدید').click();
    await settle(fixture);

    submit(element.querySelector('dialog form')!);
    await settle(fixture);

    expect(element.querySelector('dialog')!.textContent).toContain('نام حساب را وارد کنید');
    http.expectNone('/api/accounts');
  });

  it('edits an account, including a negative opening balance', async () => {
    const { fixture, http, element } = await setup([account({ initialBalance: 100 })]);
    button(element, 'ویرایش').click();
    await settle(fixture);
    expect(element.querySelector<HTMLInputElement>('#account-name')!.value).toBe('کیف پول');

    setValue(element.querySelector<HTMLInputElement>('app-amount-input input')!, '-250000');
    submit(element.querySelector('dialog form')!);

    const put = http.expectOne('/api/accounts/acc-1');
    expect(put.request.method).toBe('PUT');
    expect(put.request.body.initialBalance).toBe(-250000);
    put.flush(account());
    await settle(fixture);
    await reloadList(fixture, http, [account()]);
  });

  it('archives an account without losing its other settings', async () => {
    const { fixture, http, element } = await setup([account({ initialBalance: 100 })]);

    button(element, 'بایگانی').click();
    const put = http.expectOne('/api/accounts/acc-1');
    expect(put.request.body).toEqual({
      name: 'کیف پول',
      type: 'Cash',
      initialBalance: 100,
      isArchived: true,
    });
    put.flush(account({ isArchived: true }));
    await settle(fixture);
    await reloadList(fixture, http, []);
  });

  it('deletes only after confirmation', async () => {
    const { fixture, http, element } = await setup([account()]);
    const ask = vi.spyOn(TestBed.inject(ConfirmService), 'ask');

    ask.mockResolvedValueOnce(false);
    button(element, 'حذف').click();
    await settle(fixture);
    http.expectNone('/api/accounts/acc-1');

    ask.mockResolvedValueOnce(true);
    button(element, 'حذف').click();
    await settle(fixture);
    const del = http.expectOne('/api/accounts/acc-1');
    expect(del.request.method).toBe('DELETE');
    del.flush(null);
    await settle(fixture);
    await reloadList(fixture, http, []);
  });

  it('tells the user when an account cannot be deleted', async () => {
    const { fixture, http, element } = await setup([account()]);
    vi.spyOn(TestBed.inject(ConfirmService), 'ask').mockResolvedValue(true);

    button(element, 'حذف').click();
    await settle(fixture);
    http
      .expectOne('/api/accounts/acc-1')
      .flush(
        { detail: 'The account has transactions and cannot be deleted. Archive it instead.' },
        { status: 409, statusText: 'Conflict' },
      );
    await settle(fixture);

    const toasts = TestBed.inject(ToastService).toasts();
    expect(toasts[0].kind).toBe('error');
    expect(toasts[0].message).toContain('Archive it instead');
  });
});
