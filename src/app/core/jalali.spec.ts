import { describe, expect, it } from 'vitest';
import {
  dayToApiInstant,
  jalaliMonthLabel,
  jalaliMonthShort,
  formatJalaliDay,
  instantToInputDay,
  jalaliMonthRange,
  jalaliOfIsoDay,
  jalaliYearRange,
  parseIsoDay,
  toIsoDay,
  toJalali,
  todayIso,
} from './jalali';

describe('jalali', () => {
  it('converts a day to the Jalali calendar', () => {
    expect(toJalali(parseIsoDay('2026-10-05'))).toEqual({ year: 1405, month: 7, day: 13 });
    expect(toJalali(parseIsoDay('2026-03-21'))).toEqual({ year: 1405, month: 1, day: 1 });
    expect(toJalali(parseIsoDay('2027-03-20'))).toEqual({ year: 1405, month: 12, day: 29 });
  });

  it('formats Jalali dates with Persian digits', () => {
    expect(jalaliOfIsoDay('2026-10-05')).toBe('۱۳ مهر ۱۴۰۵');
    expect(jalaliOfIsoDay('')).toBe('');
    expect(formatJalaliDay('2026-10-05T00:00:00Z')).toBe('۱۳ مهر ۱۴۰۵');
  });

  it('labels a Jalali month with its name and year', () => {
    expect(jalaliMonthLabel('2026-10-05')).toBe('مهر ۱۴۰۵');
    expect(jalaliMonthLabel('2026-03-25')).toBe('فروردین ۱۴۰۵');
    expect(jalaliMonthShort('2026-10-05')).toBe('مهر');
  });

  it('gives the current Jalali month up to today', () => {
    expect(jalaliMonthRange(0, '2026-10-05')).toEqual({ from: '2026-09-23', to: '2026-10-05' });
  });

  it('gives whole previous and next Jalali months', () => {
    expect(jalaliMonthRange(-1, '2026-10-05')).toEqual({ from: '2026-08-23', to: '2026-09-22' });
    expect(jalaliMonthRange(-2, '2026-10-05')).toEqual({ from: '2026-07-23', to: '2026-08-22' });
    expect(jalaliMonthRange(1, '2026-10-05')).toEqual({ from: '2026-10-23', to: '2026-11-21' });
  });

  it('handles the six-month boundary and the short last month', () => {
    // Shahrivar (31 days) ends on 22 Sep, Esfand 1404 has 29 days (non-leap)
    expect(jalaliMonthRange(0, '2026-09-22')).toEqual({ from: '2026-08-23', to: '2026-09-22' });
    expect(jalaliMonthRange(-1, '2026-03-25')).toEqual({ from: '2026-02-20', to: '2026-03-20' });
  });

  it('crosses the Gregorian year boundary', () => {
    expect(jalaliMonthRange(-3, '2026-02-10').from).toBe('2025-10-23');
  });

  it('gives the Jalali year so far', () => {
    expect(jalaliYearRange('2026-10-05')).toEqual({ from: '2026-03-21', to: '2026-10-05' });
  });

  it('keeps a picked day the same in every time zone', () => {
    expect(dayToApiInstant('2026-10-05')).toBe('2026-10-05T12:00:00Z');
    expect(instantToInputDay('2026-10-05T12:00:00Z')).toBe('2026-10-05');
  });

  it('builds ISO days', () => {
    expect(toIsoDay(parseIsoDay('2026-01-09'))).toBe('2026-01-09');
    expect(todayIso(new Date(2026, 0, 9))).toBe('2026-01-09');
  });
});
