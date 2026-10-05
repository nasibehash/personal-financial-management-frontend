import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { ApiClient } from './api-client';

describe('ApiClient', () => {
  const setup = () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    return { api: TestBed.inject(ApiClient), http: TestBed.inject(HttpTestingController) };
  };

  it('logs in and registers', () => {
    const { api, http } = setup();
    api.login({ email: 'a@b.c', password: 'x' }).subscribe();
    expect(http.expectOne('/api/auth/login').request.body).toEqual({
      email: 'a@b.c',
      password: 'x',
    });
    api.register({ fullName: 'N', email: 'a@b.c', password: 'x' }).subscribe();
    expect(http.expectOne('/api/auth/register').request.method).toBe('POST');
    http.verify();
  });

  it('sends only the filters that are set when listing transactions', () => {
    const { api, http } = setup();
    api
      .transactions({
        from: '2026-10-01',
        type: 'Expense',
        search: '',
        accountId: undefined,
        page: 2,
        pageSize: 20,
      })
      .subscribe();

    const req = http.expectOne((r) => r.url === '/api/transactions');
    expect(req.request.params.keys().sort()).toEqual(['from', 'page', 'pageSize', 'type']);
    expect(req.request.params.get('type')).toBe('Expense');
    http.verify();
  });

  it('passes the category type and archived flag', () => {
    const { api, http } = setup();
    api.categories('Income').subscribe();
    expect(http.expectOne((r) => r.url === '/api/categories').request.params.get('type')).toBe(
      'Income',
    );
    api.categories().subscribe();
    expect(http.expectOne((r) => r.url === '/api/categories').request.params.keys()).toEqual([]);
    api.accounts(true).subscribe();
    expect(
      http.expectOne((r) => r.url === '/api/accounts').request.params.get('includeArchived'),
    ).toBe('true');
    http.verify();
  });

  it('creates, updates and deletes transactions', () => {
    const { api, http } = setup();
    const request = { type: 'Expense' as const, amount: 5, accountId: 'a', categoryId: 'c' };
    api.createTransaction(request).subscribe();
    expect(http.expectOne('/api/transactions').request.body).toEqual(request);
    api.updateTransaction('t1', request).subscribe();
    expect(http.expectOne('/api/transactions/t1').request.method).toBe('PUT');
    api.deleteTransaction('t1').subscribe();
    expect(http.expectOne('/api/transactions/t1').request.method).toBe('DELETE');
    http.verify();
  });

  it('asks for reports with a date range', () => {
    const { api, http } = setup();
    api.summary('2026-10-01', '2026-10-31').subscribe();
    const summary = http.expectOne((r) => r.url === '/api/reports/summary');
    expect(summary.request.params.get('from')).toBe('2026-10-01');
    expect(summary.request.params.get('to')).toBe('2026-10-31');
    api.categoryBreakdown('Expense', '2026-10-01', '2026-10-31').subscribe();
    expect(
      http.expectOne((r) => r.url === '/api/reports/category-breakdown').request.params.get('type'),
    ).toBe('Expense');
    api.comparison().subscribe();
    http.expectOne((r) => r.url === '/api/reports/comparison');
    http.verify();
  });

  it('manages goals and contributions', () => {
    const { api, http } = setup();
    api.goals('Active').subscribe();
    expect(http.expectOne((r) => r.url === '/api/goals').request.params.get('status')).toBe(
      'Active',
    );
    api.addContribution('g1', 100, null, 'note').subscribe();
    expect(http.expectOne('/api/goals/g1/contributions').request.body).toEqual({
      amount: 100,
      date: null,
      note: 'note',
    });
    api.deleteContribution('g1', 'c1').subscribe();
    expect(http.expectOne('/api/goals/g1/contributions/c1').request.method).toBe('DELETE');
    http.verify();
  });

  it('posts text and voice to the AI endpoints', () => {
    const { api, http } = setup();
    api.aiText('خرید نان ۲۰ هزار', true).subscribe();
    expect(http.expectOne('/api/ai/transactions/text').request.body).toEqual({
      text: 'خرید نان ۲۰ هزار',
      preview: true,
      accountId: null,
    });

    api.aiVoice(new Blob(['x'], { type: 'audio/webm' }), 'voice.webm', true, 'acc').subscribe();
    const voice = http.expectOne('/api/ai/transactions/voice');
    const form = voice.request.body as FormData;
    expect(form.get('preview')).toBe('true');
    expect(form.get('accountId')).toBe('acc');
    expect((form.get('audio') as File).name).toBe('voice.webm');
    http.verify();
  });
});
