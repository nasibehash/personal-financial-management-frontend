import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { ParsedTransaction } from '../../core/models';
import { ACCOUNTS, fakeLookups, setValue, settle, startLoading } from '../../core/testing';
import { Lookups } from '../../core/lookups';
import { SmartEntry } from './smart-entry';

const draft = (overrides: Partial<ParsedTransaction> = {}): ParsedTransaction => ({
  type: 'Expense',
  amount: 250000,
  date: '2026-10-04T12:00:00Z',
  description: 'ناهار',
  accountId: ACCOUNTS[0].id,
  accountName: ACCOUNTS[0].name,
  destinationAccountId: null,
  destinationAccountName: null,
  categoryId: null,
  categoryName: 'خوراک',
  method: 'rules',
  ...overrides,
});

describe('SmartEntry', () => {
  beforeEach(() => localStorage.clear());

  const setup = () => {
    TestBed.configureTestingModule({
      imports: [SmartEntry],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Lookups, useValue: fakeLookups() },
      ],
    });
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(SmartEntry);
    fixture.detectChanges();
    return { fixture, http, element: fixture.nativeElement as HTMLElement };
  };

  const click = (element: HTMLElement, text: string) =>
    Array.from(element.querySelectorAll<HTMLButtonElement>('button'))
      .find((b) => b.textContent?.includes(text))!
      .click();

  it('previews the sentence before saving anything', async () => {
    const { fixture, http, element } = setup();

    setValue(element.querySelector('textarea')!, 'دیروز ناهار ۲۵۰ هزار');
    await settle(fixture);
    click(element, 'بررسی');
    await startLoading();

    const request = http.expectOne('/api/ai/transactions/text');
    expect(request.request.body).toMatchObject({ text: 'دیروز ناهار ۲۵۰ هزار', preview: true });
    request.flush({ transcript: null, draft: draft(), transaction: null });
    await settle(fixture);

    expect(element.querySelector('.preview')?.textContent).toContain('خوراک');
  });

  it('saves the confirmed draft with its account', async () => {
    const { fixture, http, element } = setup();

    setValue(element.querySelector('textarea')!, 'ناهار ۲۵۰ هزار');
    await settle(fixture);
    click(element, 'بررسی');
    await startLoading();
    http
      .expectOne('/api/ai/transactions/text')
      .flush({ transcript: null, draft: draft(), transaction: null });
    await settle(fixture);

    click(element, 'تأیید و ثبت');
    await startLoading();
    const save = http.expectOne('/api/ai/transactions/text');
    expect(save.request.body).toMatchObject({
      preview: false,
      accountId: ACCOUNTS[0].id,
    });
    save.flush({ transcript: null, draft: draft(), transaction: null });
    await settle(fixture);

    expect(element.querySelector('.preview')).toBeNull();
  });

  it('cannot confirm a draft without an account', async () => {
    const { fixture, http, element } = setup();

    setValue(element.querySelector('textarea')!, 'ناهار ۲۵۰ هزار');
    await settle(fixture);
    click(element, 'بررسی');
    await startLoading();
    http.expectOne('/api/ai/transactions/text').flush({
      transcript: null,
      draft: draft({ accountId: null, accountName: null }),
      transaction: null,
    });
    await settle(fixture);

    const confirm = Array.from(element.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes('تأیید و ثبت'),
    )!;
    expect(confirm.disabled).toBe(true);
  });

  it('shows the error when the assistant fails', async () => {
    const { fixture, http, element } = setup();

    setValue(element.querySelector('textarea')!, 'abc');
    await settle(fixture);
    click(element, 'بررسی');
    await startLoading();
    http
      .expectOne('/api/ai/transactions/text')
      .flush({ title: 'x' }, { status: 503, statusText: 'Unavailable' });
    await settle(fixture);

    expect(element.querySelector('.alert-error')).not.toBeNull();
  });
});
