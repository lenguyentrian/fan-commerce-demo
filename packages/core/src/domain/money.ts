/**
 * Money value object.
 *
 * Rule for this codebase: money is NEVER a float. It is stored as an integer
 * number of minor units (VND has 0 decimals, so 1 minor unit = 1 dong).
 * Floats introduce rounding drift that shows up as off-by-one-dong totals in
 * order reconciliation — the kind of bug that is cheap to prevent and
 * expensive to find in production.
 *
 * This file is intentionally dependency-free so the same rules can be ported
 * 1:1 to `packages/core_dart` in phase 2 (see docs/ROADMAP.md).
 */

export type CurrencyCode = 'VND' | 'USD';

export interface Money {
  /** Integer amount in minor units. */
  readonly amount: number;
  readonly currency: CurrencyCode;
}

const MINOR_UNIT_DIGITS: Record<CurrencyCode, number> = {
  VND: 0,
  USD: 2,
};

export class MoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MoneyError';
  }
}

export function money(amount: number, currency: CurrencyCode = 'VND'): Money {
  if (!Number.isInteger(amount)) {
    throw new MoneyError(`Money amount must be an integer in minor units, received ${amount}`);
  }
  if (!Number.isSafeInteger(amount)) {
    throw new MoneyError(`Money amount exceeds safe integer range: ${amount}`);
  }
  return { amount, currency };
}

export const zero = (currency: CurrencyCode = 'VND'): Money => money(0, currency);

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new MoneyError(`Cannot combine ${a.currency} with ${b.currency}`);
  }
}

export function add(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amount + b.amount, a.currency);
}

export function subtract(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amount - b.amount, a.currency);
}

export function multiply(value: Money, factor: number): Money {
  if (!Number.isFinite(factor)) {
    throw new MoneyError(`Multiplication factor must be finite, received ${factor}`);
  }
  // Round half-up on the minor unit so totals stay deterministic across
  // platforms. Dart's `round()` rounds half away from zero, which matches.
  return money(Math.round(value.amount * factor), value.currency);
}

/** Applies a percentage discount (0-100) and returns the discount amount. */
export function percentOf(value: Money, percent: number): Money {
  if (percent < 0 || percent > 100) {
    throw new MoneyError(`Percent must be between 0 and 100, received ${percent}`);
  }
  return multiply(value, percent / 100);
}

export function isZero(value: Money): boolean {
  return value.amount === 0;
}

export function compare(a: Money, b: Money): number {
  assertSameCurrency(a, b);
  return a.amount === b.amount ? 0 : a.amount < b.amount ? -1 : 1;
}

export function sum(values: readonly Money[], currency: CurrencyCode = 'VND'): Money {
  return values.reduce<Money>((acc, item) => add(acc, item), zero(currency));
}

/**
 * Formats for display. Uses Intl so the web app and the Dart port can both
 * rely on ICU rules rather than hand-rolled separators.
 */
export function formatMoney(value: Money, locale = 'vi-VN'): string {
  const digits = MINOR_UNIT_DIGITS[value.currency];
  const major = value.amount / 10 ** digits;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: value.currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(major);
}
