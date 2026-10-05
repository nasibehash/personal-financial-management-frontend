import { Pipe, PipeTransform } from '@angular/core';
import { formatMoney, formatPercent } from '../core/format';
import { formatJalaliDate, formatJalaliDateTime, formatJalaliDay } from '../core/jalali';

@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    return value === null || value === undefined ? '—' : formatMoney(value);
  }
}

@Pipe({ name: 'percent' })
export class PercentPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    return formatPercent(value);
  }
}

/** `day`: a date without time (goal deadline); `date`: an instant as a date; `datetime`: an instant with time. */
@Pipe({ name: 'jalali' })
export class JalaliPipe implements PipeTransform {
  transform(value: string | null | undefined, kind: 'day' | 'date' | 'datetime' = 'date'): string {
    if (!value) {
      return '—';
    }
    switch (kind) {
      case 'day':
        return formatJalaliDay(value);
      case 'datetime':
        return formatJalaliDateTime(value);
      default:
        return formatJalaliDate(value);
    }
  }
}
