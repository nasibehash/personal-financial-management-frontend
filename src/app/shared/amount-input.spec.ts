import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { describe, expect, it } from 'vitest';
import { AmountInput } from './amount-input';

@Component({
  imports: [ReactiveFormsModule, AmountInput],
  template: '<app-amount-input [formControl]="control" [allowNegative]="allowNegative" />',
})
class Host {
  control = new FormControl<number | null>(null);
  allowNegative = false;
}

describe('AmountInput', () => {
  const setup = async (allowNegative = false) => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.allowNegative = allowNegative;
    await fixture.whenStable();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    return { fixture, input, control: fixture.componentInstance.control };
  };

  const type = async (
    fixture: { whenStable(): Promise<unknown> },
    input: HTMLInputElement,
    text: string,
  ) => {
    input.value = text;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };

  it('shows the control value with grouped digits', async () => {
    const { fixture, input, control } = await setup();

    control.setValue(1250000);
    await fixture.whenStable();

    expect(input.value).toBe('1,250,000');
  });

  it('groups what is typed and writes a number to the control', async () => {
    const { fixture, input, control } = await setup();

    await type(fixture, input, '2500000');

    expect(input.value).toBe('2,500,000');
    expect(control.value).toBe(2500000);
  });

  it('understands Persian digits', async () => {
    const { fixture, input, control } = await setup();

    await type(fixture, input, '۴۵۰۰۰');

    expect(control.value).toBe(45000);
    expect(input.value).toBe('45,000');
  });

  it('writes null when the field is empty or not a number', async () => {
    const { fixture, input, control } = await setup();
    await type(fixture, input, '123');

    await type(fixture, input, 'abc');

    expect(control.value).toBeNull();
    expect(input.value).toBe('');
  });

  it('shows the amount in words of the currency below the field', async () => {
    const { fixture, input } = await setup();

    await type(fixture, input, '5000');

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('۵٬۰۰۰ تومان');
  });

  it('can be disabled and cleared by the form', async () => {
    const { fixture, input, control } = await setup();
    control.setValue(10);
    control.disable();
    await fixture.whenStable();
    expect(input.disabled).toBe(true);

    control.enable();
    control.reset();
    await fixture.whenStable();
    expect(input.value).toBe('');
  });

  it('rejects a minus sign unless negative values are allowed', async () => {
    const { fixture, input, control } = await setup();

    await type(fixture, input, '-5000');

    expect(control.value).toBe(5000);
    expect(input.value).toBe('5,000');
  });

  it('accepts negative values when allowed', async () => {
    const { fixture, input, control } = await setup(true);

    await type(fixture, input, '-1500000');
    expect(control.value).toBe(-1500000);
    expect(input.value).toBe('-1,500,000');

    control.setValue(-250);
    await fixture.whenStable();
    expect(input.value).toBe('-250');
  });
});
