import { Component, computed, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { formatMoneyWithUnit, groupDigits, parseAmount } from '../core/format';

/**
 * A money field: accepts Persian or Latin digits, groups thousands while typing and exposes a number (or null).
 * Use it with a form control: <app-amount-input formControlName="amount" />
 */
@Component({
  selector: 'app-amount-input',
  template: `
    <input
      type="text"
      inputmode="decimal"
      autocomplete="off"
      dir="ltr"
      [id]="inputId() ?? ''"
      [class.invalid]="invalid()"
      [disabled]="disabled()"
      [placeholder]="placeholder()"
      [value]="text()"
      (input)="onInput($event)"
      (blur)="touched()"
    />
    @if (hint()) {
      <span class="hint muted small">{{ hint() }}</span>
    }
  `,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => AmountInput), multi: true },
  ],
  styles: `
    :host {
      display: grid;
      gap: 0.2rem;
    }
    input {
      text-align: end;
    }
  `,
})
export class AmountInput implements ControlValueAccessor {
  readonly inputId = input<string | null>(null);
  readonly placeholder = input('');
  readonly invalid = input(false);
  /** Allow a leading minus, e.g. for an account that starts in debt. */
  readonly allowNegative = input(false);

  protected readonly text = signal('');
  protected readonly disabled = signal(false);
  protected readonly hint = computed(() => {
    const value = this.valueOf(this.text());
    return value === null ? '' : formatMoneyWithUnit(value);
  });

  private onChange: (value: number | null) => void = () => undefined;
  protected touched: () => void = () => undefined;

  writeValue(value: number | null): void {
    this.text.set(value === null || value === undefined ? '' : this.format(String(value)));
  }

  registerOnChange(fn: (value: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.touched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  protected onInput(event: Event): void {
    const element = event.target as HTMLInputElement;
    const grouped = this.format(element.value);
    element.value = grouped;
    this.text.set(grouped);
    this.onChange(this.valueOf(grouped));
  }

  private isNegative(text: string): boolean {
    return this.allowNegative() && /^\s*[-−]/.test(text);
  }

  private format(text: string): string {
    const grouped = groupDigits(text.replace(/^\s*[-−]/, ''));
    return this.isNegative(text) ? `-${grouped}` : grouped;
  }

  private valueOf(text: string): number | null {
    const amount = parseAmount(text.replace(/^-/, ''));
    return amount === null ? null : this.isNegative(text) ? -amount : amount;
  }
}
