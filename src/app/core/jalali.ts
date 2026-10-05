// Dates are shown in the Persian (Jalali) calendar. Everything is done with the platform's Intl support,
// so no calendar library is needed. "ISO day" means a plain yyyy-MM-dd string.

const DAY_MS = 86_400_000;

const jalaliParts = new Intl.DateTimeFormat('fa-IR-u-ca-persian-nu-latn', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  timeZone: 'UTC',
});

const dateOnly = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  dateStyle: 'medium',
  timeZone: 'UTC',
});
const dateLocal = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { dateStyle: 'medium' });
const dateTime = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  dateStyle: 'medium',
  timeStyle: 'short',
});
const monthName = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

export interface JalaliDate {
  year: number;
  month: number;
  day: number;
}

/** The Jalali year/month/day of a UTC calendar day. */
export function toJalali(date: Date): JalaliDate {
  const parts = jalaliParts.formatToParts(date);
  const read = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: read('year'), month: read('month'), day: read('day') };
}

export function parseIsoDay(day: string): Date {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function toIsoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Today in the user's time zone as an ISO day. */
export function todayIso(now = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/** The calendar day of an instant in the user's time zone, for date inputs. */
export function instantToInputDay(value: string): string {
  return todayIso(new Date(value));
}

/** Noon UTC on that day, so the date stays the same in every time zone. */
export function dayToApiInstant(day: string): string {
  return `${day}T12:00:00Z`;
}

export interface DayRange {
  from: string;
  to: string;
}

function startOfJalaliMonth(date: Date): Date {
  return new Date(date.getTime() - (toJalali(date).day - 1) * DAY_MS);
}

function startOfNextJalaliMonth(start: Date): Date {
  let next = new Date(start.getTime() + 29 * DAY_MS);
  while (toJalali(next).day !== 1) {
    next = new Date(next.getTime() + DAY_MS);
  }
  return next;
}

/**
 * The Jalali month `offset` months from the current one (0 = this month, -1 = last month).
 * The current month ends today; other months are complete.
 */
export function jalaliMonthRange(offset: number, today = todayIso()): DayRange {
  const now = parseIsoDay(today);
  let start = startOfJalaliMonth(now);

  for (let i = 0; i > offset; i--) {
    start = startOfJalaliMonth(new Date(start.getTime() - DAY_MS));
  }
  for (let i = 0; i < offset; i++) {
    start = startOfNextJalaliMonth(start);
  }

  const lastDay = new Date(startOfNextJalaliMonth(start).getTime() - DAY_MS);
  const to = offset === 0 ? now : lastDay;
  return { from: toIsoDay(start), to: toIsoDay(to) };
}

/** The first day of the Jalali year that contains today, up to today. */
export function jalaliYearRange(today = todayIso()): DayRange {
  const now = parseIsoDay(today);
  const { month } = toJalali(now);
  const monthsBack = month - 1;
  return { from: jalaliMonthRange(-monthsBack, today).from, to: today };
}

function monthParts(day: string): { month: string; year: string } {
  const parts = monthName.formatToParts(parseIsoDay(day));
  return {
    month: parts.find((p) => p.type === 'month')?.value ?? '',
    year: parts.find((p) => p.type === 'year')?.value ?? '',
  };
}

/** "مهر ۱۴۰۵" for the Jalali month that contains the given ISO day. */
export function jalaliMonthLabel(day: string): string {
  const { month, year } = monthParts(day);
  return `${month} ${year}`;
}

/** Just the month name ("مهر"). */
export function jalaliMonthShort(day: string): string {
  return monthParts(day).month;
}

/** A date without a time (goal start/deadline): shown as stored, without time-zone shifting. */
export function formatJalaliDay(value: string): string {
  return dateOnly.format(new Date(value));
}

/** An instant (a transaction's date) in the user's time zone. */
export function formatJalaliDate(value: string): string {
  return dateLocal.format(new Date(value));
}

export function formatJalaliDateTime(value: string): string {
  return dateTime.format(new Date(value));
}

/** The Jalali date of an ISO day, shown next to a date input. */
export function jalaliOfIsoDay(day: string): string {
  return day ? dateOnly.format(parseIsoDay(day)) : '';
}
