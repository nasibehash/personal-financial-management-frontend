import { describe, expect, it } from 'vitest';
import {
  formatMoney,
  formatMoneyWithUnit,
  formatPercent,
  groupDigits,
  normalizeDigits,
  parseAmount,
} from './format';

describe('format', () => {
  it('formats money with Persian digits and separators', () => {
    expect(formatMoney(1250000)).toBe('۱٬۲۵۰٬۰۰۰');
    expect(formatMoneyWithUnit(5000)).toBe('۵٬۰۰۰ تومان');
  });

  it('formats percentages and missing values', () => {
    expect(formatPercent(12.34)).toBe('۱۲٫۳٪');
    expect(formatPercent(null)).toBe('—');
    expect(formatPercent(undefined)).toBe('—');
  });

  it('normalizes Persian and Arabic digits and separators', () => {
    expect(normalizeDigits('۱٬۲۵۰')).toBe('1250');
    expect(normalizeDigits('٣٤٥')).toBe('345');
    expect(normalizeDigits('12 500,000')).toBe('12500000');
    expect(normalizeDigits('۱٫۵')).toBe('1.5');
  });

  it('parses what the user typed', () => {
    expect(parseAmount('۲۵۰٬۰۰۰')).toBe(250000);
    expect(parseAmount('1,500,000')).toBe(1500000);
    expect(parseAmount('12.5')).toBe(12.5);
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('abc')).toBeNull();
    expect(parseAmount('-5')).toBeNull();
    expect(parseAmount('1.2.3')).toBeNull();
  });

  it('groups digits while typing', () => {
    expect(groupDigits('1250000')).toBe('1,250,000');
    expect(groupDigits('۱۲۵۰۰۰۰')).toBe('1,250,000');
    expect(groupDigits('12')).toBe('12');
    expect(groupDigits('1234.5')).toBe('1,234.5');
    expect(groupDigits('abc')).toBe('');
  });
});
