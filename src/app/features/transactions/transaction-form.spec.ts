import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { todayIso } from '../../core/jalali';
import { Lookups } from '../../core/lookups';
import { Account } from '../../core/models';
import {
  ACCOUNTS,
  account,
  fakeLookups,
  setValue,
  settle,
  submit,
  transaction,
} from '../../core/testing';
import { ToastService } from '../../shared/toast';
import { TransactionForm } from './transaction-form';

describe('TransactionForm', () => {
  const setup = async (inputs: Record<string, unknown> = {}, accounts: Account[] = ACCOUNTS) => {
    TestBed.configureTestingModule({
      imports: [TransactionForm],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Lookups, useValue: fakeLookups(accounts) },
      ],
    });
    const fixture = TestBed.createComponent(TransactionForm);
    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }
    const saved: unknown[] = [];
    fixture.componentInstance.saved.subscribe((t) => saved.push(t));
    await settle(fixture);
    return {
      fixture,
      saved,
      http: TestBed.inject(HttpTestingController),
      element: fixture.nativeElement as HTMLElement,
    };
  };

  const $ = <T extends Element>(element: Element, selector: string) =>
    element.querySelector<T>(selector)!;
  const typeButton = (element: Element, label: string) =>
    Array.from(element.querySelectorAll<HTMLButtonElement>('.segmented button')).find((b) =>
      b.textContent?.includes(label),
    )!;
  const form = (element: Element) => $<HTMLFormElement>(element, 'dialog form');

  const fillExpense = (element: Element) => {
    setValue($<HTMLInputElement>(element, 'app-amount-input input'), '250000');
    setValue($<HTMLSelectElement>(element, '#tx-account'), 'acc-1');
    setValue($<HTMLSelectElement>(element, '#tx-category'), 'e1');
    setValue($<HTMLInputElement>(element, '#tx-description'), '  ناهار با دوستان ');
  };

  it('records an expense', async () => {
    const { fixture, saved, http, element } = await setup();
    fillExpense(element);

    submit(form(element));
    const post = http.expectOne('/api/transactions');
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual({
      type: 'Expense',
      amount: 250000,
      accountId: 'acc-1',
      categoryId: 'e1',
      destinationAccountId: null,
      date: `${todayIso()}T12:00:00Z`,
      description: 'ناهار با دوستان',
    });
    post.flush(transaction());
    await settle(fixture);

    expect(saved).toHaveLength(1);
    expect(
      TestBed.inject(ToastService)
        .toasts()
        .map((t) => t.message),
    ).toContain('تراکنش ثبت شد.');
  });

  it('records an income with an income category', async () => {
    const { fixture, http, element } = await setup();
    typeButton(element, 'درآمد').click();
    await settle(fixture);
    setValue($<HTMLInputElement>(element, 'app-amount-input input'), '30000000');
    setValue($<HTMLSelectElement>(element, '#tx-account'), 'acc-1');
    const options = Array.from(
      element.querySelectorAll<HTMLOptionElement>('#tx-category option'),
    ).map((o) => o.textContent?.trim());
    expect(options).toEqual(['انتخاب کنید', 'حقوق']);
    setValue($<HTMLSelectElement>(element, '#tx-category'), 'i1');

    submit(form(element));

    const body = http.expectOne('/api/transactions').request.body;
    expect(body).toMatchObject({ type: 'Income', amount: 30000000, categoryId: 'i1' });
  });

  it('shows what is missing and sends nothing', async () => {
    const { fixture, http, element } = await setup();

    submit(form(element));
    await settle(fixture);

    const text = element.querySelector('dialog')!.textContent!;
    expect(text).toContain('مبلغ را وارد کنید');
    expect(text).toContain('یک حساب انتخاب کنید');
    expect(text).toContain('یک دسته‌بندی انتخاب کنید');
    http.expectNone('/api/transactions');
  });

  it('preselects the account when there is only one', async () => {
    const { element } = await setup({}, [account()]);

    expect($<HTMLSelectElement>(element, '#tx-account').value).toBe('acc-1');
  });

  it('records a transfer between two different accounts without a category', async () => {
    const { fixture, http, element } = await setup();
    typeButton(element, 'انتقال').click();
    await settle(fixture);
    expect(element.querySelector('#tx-category')).toBeNull();
    expect(element.querySelector('label[for=tx-account]')!.textContent).toContain('از حساب');

    setValue($<HTMLInputElement>(element, 'app-amount-input input'), '5000000');
    setValue($<HTMLSelectElement>(element, '#tx-account'), 'acc-1');
    setValue($<HTMLSelectElement>(element, '#tx-destination'), 'acc-1');
    submit(form(element));
    await settle(fixture);
    expect(element.querySelector('dialog')!.textContent).toContain(
      'حساب مبدأ و مقصد باید متفاوت باشند',
    );
    http.expectNone('/api/transactions');

    setValue($<HTMLSelectElement>(element, '#tx-destination'), 'acc-2');
    submit(form(element));
    const body = http.expectOne('/api/transactions').request.body;
    expect(body).toMatchObject({
      type: 'Transfer',
      amount: 5000000,
      accountId: 'acc-1',
      destinationAccountId: 'acc-2',
      categoryId: null,
    });
  });

  it('forgets a category that does not fit the new type', async () => {
    const { fixture, element } = await setup();
    setValue($<HTMLSelectElement>(element, '#tx-category'), 'e1');

    typeButton(element, 'درآمد').click();
    await settle(fixture);

    expect($<HTMLSelectElement>(element, '#tx-category').value).toBe('');
  });

  it('fills in a transaction being edited and keeps its exact time when the day is unchanged', async () => {
    const original = transaction({ date: '2026-10-05T09:30:00Z' });
    const { fixture, http, element } = await setup({ transaction: original });
    expect($<HTMLInputElement>(element, 'app-amount-input input').value).toBe('250,000');
    expect($<HTMLSelectElement>(element, '#tx-account').value).toBe('acc-1');
    expect($<HTMLSelectElement>(element, '#tx-category').value).toBe('e1');
    expect($<HTMLInputElement>(element, '#tx-description').value).toBe('ناهار');

    setValue($<HTMLInputElement>(element, 'app-amount-input input'), '270000');
    submit(form(element));
    const put = http.expectOne('/api/transactions/tx-1');
    expect(put.request.method).toBe('PUT');
    expect(put.request.body.amount).toBe(270000);
    expect(put.request.body.date).toBe('2026-10-05T09:30:00Z');
    put.flush(original);
    await settle(fixture);
  });

  it('uses noon on the new day when the date is changed', async () => {
    const { http, element } = await setup({ transaction: transaction() });

    setValue($<HTMLInputElement>(element, '#tx-date'), '2026-09-30');
    submit(form(element));

    expect(http.expectOne('/api/transactions/tx-1').request.body.date).toBe('2026-09-30T12:00:00Z');
  });

  it('can start from a draft, for example one understood from a sentence', async () => {
    const { http, element } = await setup({
      draft: {
        type: 'Expense',
        amount: 20000,
        accountId: 'acc-2',
        categoryId: 'e2',
        date: '2026-10-04T12:00:00Z',
        description: 'نان',
      },
    });
    expect($<HTMLSelectElement>(element, '#tx-account').value).toBe('acc-2');
    expect($<HTMLSelectElement>(element, '#tx-category').value).toBe('e2');
    expect($<HTMLInputElement>(element, '#tx-date').value).toBe('2026-10-04');

    submit(form(element));

    expect(http.expectOne('/api/transactions').request.body).toMatchObject({
      amount: 20000,
      accountId: 'acc-2',
      categoryId: 'e2',
      description: 'نان',
    });
  });

  it('still lists the account of an edited transaction after the account was archived', async () => {
    const { element } = await setup({
      transaction: transaction({ accountId: 'old', accountName: 'حساب قدیمی' }),
    });

    const names = Array.from(element.querySelectorAll('#tx-account option')).map((o) =>
      o.textContent?.trim(),
    );
    expect(names).toContain('حساب قدیمی');
    expect($<HTMLSelectElement>(element, '#tx-account').value).toBe('old');
  });

  it('keeps the dialog open and shows the problem when saving fails', async () => {
    const { fixture, saved, http, element } = await setup();
    fillExpense(element);

    submit(form(element));
    http
      .expectOne('/api/transactions')
      .flush(
        { detail: "Account 'کیف پول' is archived." },
        { status: 400, statusText: 'Bad Request' },
      );
    await settle(fixture);

    expect(element.querySelector('.alert-error')!.textContent).toContain('is archived');
    expect(element.querySelector('dialog')).not.toBeNull();
    expect(saved).toHaveLength(0);
  });

  it('tells the user when there is no account yet', async () => {
    const { element } = await setup({}, []);

    expect(element.textContent).toContain('یک حساب بسازید');
  });
});
