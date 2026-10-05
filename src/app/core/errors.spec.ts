import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';
import { describeError } from './errors';

const failure = (status: number, error?: unknown) => new HttpErrorResponse({ status, error });

describe('describeError', () => {
  it('explains a missing connection', () => {
    expect(describeError(failure(0))).toContain('ارتباط با سرور');
  });

  it('lists each validation message once', () => {
    const message = describeError(
      failure(400, { errors: { Name: ['الزامی است'], Other: ['الزامی است', 'کوتاه است'] } }),
    );

    expect(message).toContain('الزامی است');
    expect(message).toContain('کوتاه است');
    expect(message.match(/الزامی است/g)).toHaveLength(1);
  });

  it('adds the server detail to business errors', () => {
    expect(describeError(failure(400, { detail: 'The account is archived.' }))).toContain(
      'The account is archived.',
    );
    expect(describeError(failure(409, { detail: 'Duplicate' }))).toContain('(Duplicate)');
    expect(describeError(failure(404, { detail: 'Account was not found' }))).toContain('پیدا نشد');
    expect(describeError(failure(503, { detail: 'Voice input is not configured.' }))).toContain(
      'Voice input',
    );
  });

  it('has generic messages for the rest', () => {
    expect(describeError(failure(401))).toContain('رمز عبور');
    expect(describeError(failure(403))).toContain('دسترسی');
    expect(describeError(failure(500))).toContain('سرور');
    expect(describeError(failure(418))).toBe('درخواست انجام نشد.');
    expect(describeError(new Error('boom'))).toContain('غیرمنتظره');
  });
});
