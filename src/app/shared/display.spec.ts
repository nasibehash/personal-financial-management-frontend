import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { BarList } from './bar-list';
import { JalaliPipe, MoneyPipe, PercentPipe } from './pipes';
import { ProgressBar } from './progress-bar';
import { TrendChart } from './trend-chart';

describe('pipes', () => {
  it('formats money, percentages and Jalali dates', () => {
    expect(new MoneyPipe().transform(1500000)).toBe('۱٬۵۰۰٬۰۰۰');
    expect(new MoneyPipe().transform(null)).toBe('—');
    expect(new PercentPipe().transform(40)).toBe('۴۰٪');
    expect(new JalaliPipe().transform('2026-10-05T00:00:00Z', 'day')).toBe('۱۳ مهر ۱۴۰۵');
    expect(new JalaliPipe().transform('2026-10-05T12:00:00Z', 'date')).toContain('مهر ۱۴۰۵');
    expect(new JalaliPipe().transform('2026-10-05T12:00:00Z', 'datetime')).toContain('۱۴۰۵');
    expect(new JalaliPipe().transform(null)).toBe('—');
  });
});

describe('ProgressBar', () => {
  const render = async (value: number) => {
    const fixture = TestBed.createComponent(ProgressBar);
    fixture.componentRef.setInput('value', value);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  };

  it('exposes its value to assistive technology and fills proportionally', async () => {
    const bar = (await render(40)).querySelector('[role=progressbar]')!;

    expect(bar.getAttribute('aria-valuenow')).toBe('40');
    expect((bar.querySelector('.fill') as HTMLElement).style.inlineSize).toBe('40%');
  });

  it('keeps the value between 0 and 100', async () => {
    expect(
      (await render(250)).querySelector('[role=progressbar]')!.getAttribute('aria-valuenow'),
    ).toBe('100');
    expect(
      (await render(-5)).querySelector('[role=progressbar]')!.getAttribute('aria-valuenow'),
    ).toBe('0');
  });
});

describe('BarList', () => {
  it('renders one bar per item with its amount and share', async () => {
    const fixture = TestBed.createComponent(BarList);
    fixture.componentRef.setInput('items', [
      { label: 'خوراک', amount: 600000, percent: 60 },
      { label: 'حمل و نقل', amount: 400000, percent: 40 },
    ]);
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('li')).toHaveLength(2);
    expect(element.textContent).toContain('خوراک');
    expect(element.textContent).toContain('۶۰۰٬۰۰۰');
    expect(element.textContent).toContain('۴۰٪');
    expect((element.querySelector('.fill') as HTMLElement).style.inlineSize).toBe('60%');
  });
});

@Component({ imports: [TrendChart], template: '<app-trend-chart [points]="points" />' })
class TrendHost {
  points = [
    { label: 'مهر', income: 1000, expense: 500 },
    { label: 'آبان', income: 0, expense: 1000 },
  ];
}

describe('TrendChart', () => {
  it('scales the bars to the largest value and describes the data', async () => {
    const fixture = TestBed.createComponent(TrendHost);
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    const heights = Array.from(element.querySelectorAll<HTMLElement>('.bar')).map(
      (b) => b.style.blockSize,
    );
    expect(heights).toEqual(['100%', '50%', '0%', '100%']);
    expect(element.querySelector('[role=img]')!.getAttribute('aria-label')).toContain('مهر');
    expect(element.textContent).toContain('درآمد');
  });

  it('copes with no activity at all', async () => {
    const fixture = TestBed.createComponent(TrendChart);
    fixture.componentRef.setInput('points', [{ label: 'مهر', income: 0, expense: 0 }]);
    await fixture.whenStable();

    const bars = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.bar'),
    );
    expect(bars.map((b) => b.style.blockSize)).toEqual(['0%', '0%']);
  });
});
