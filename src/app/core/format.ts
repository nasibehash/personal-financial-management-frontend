/** The unit shown next to amounts. The backend stores plain numbers, so change it here if you prefer ریال. */
export const CURRENCY_LABEL = 'تومان';

const number = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 2 });
const percent = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 });

export function formatMoney(value: number): string {
  return number.format(value);
}

export function formatMoneyWithUnit(value: number): string {
  return `${formatMoney(value)} ${CURRENCY_LABEL}`;
}

export function formatNumber(value: number): string {
  return number.format(value);
}

export function formatPercent(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : `${percent.format(value)}٪`;
}

/** Turns Persian/Arabic digits and separators into plain ASCII ("۱٬۲۵۰" -> "1250"). */
export function normalizeDigits(text: string): string {
  return text
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[٬،,\s]/g, '')
    .replace(/٫/g, '.');
}

/** Parses what the user typed in an amount field; null when it is empty or not a number. */
export function parseAmount(text: string): number | null {
  const normalized = normalizeDigits(text);
  if (normalized === '' || !/^\d+(\.\d+)?$/.test(normalized)) {
    return null;
  }
  return Number(normalized);
}

/** Groups the digits of an amount while typing: 1250000 -> "1,250,000" (decimals are kept). */
export function groupDigits(text: string): string {
  const normalized = normalizeDigits(text);
  const [integer = '', fraction] = normalized.split('.');
  const digits = integer.replace(/\D/g, '');
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return fraction === undefined ? grouped : `${grouped}.${fraction.replace(/\D/g, '')}`;
}
