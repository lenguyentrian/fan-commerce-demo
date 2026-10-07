import {
  add,
  compare,
  formatMoney,
  isZero,
  money,
  MoneyError,
  multiply,
  percentOf,
  subtract,
  sum,
  zero,
} from './money';

describe('money()', () => {
  it('accepts integer minor units', () => {
    expect(money(250_000)).toEqual({ amount: 250_000, currency: 'VND' });
  });

  it('rejects floats so rounding drift cannot enter the domain', () => {
    expect(() => money(10.5)).toThrow(MoneyError);
  });

  it('rejects amounts outside the safe integer range', () => {
    expect(() => money(Number.MAX_SAFE_INTEGER + 2)).toThrow(MoneyError);
  });
});

describe('arithmetic', () => {
  it('adds and subtracts', () => {
    expect(add(money(100), money(250))).toEqual(money(350));
    expect(subtract(money(500), money(120))).toEqual(money(380));
  });

  it('refuses to mix currencies', () => {
    expect(() => add(money(100, 'VND'), money(100, 'USD'))).toThrow(/Cannot combine VND with USD/);
  });

  it('rounds half-up when multiplying', () => {
    // 2 items at 1.5x would be 150.5 -> 151, not 150
    expect(multiply(money(101), 1.5)).toEqual(money(152));
    expect(multiply(money(1), 0.5)).toEqual(money(1));
  });

  it('sums an empty list to zero', () => {
    expect(sum([])).toEqual(zero());
    expect(isZero(sum([]))).toBe(true);
  });

  it('sums a list', () => {
    expect(sum([money(10), money(20), money(30)])).toEqual(money(60));
  });
});

describe('percentOf()', () => {
  it('computes a discount amount', () => {
    expect(percentOf(money(1_000_000), 15)).toEqual(money(150_000));
  });

  it('guards against out-of-range percentages', () => {
    expect(() => percentOf(money(100), -1)).toThrow(MoneyError);
    expect(() => percentOf(money(100), 101)).toThrow(MoneyError);
  });
});

describe('compare()', () => {
  it.each([
    [money(1), money(2), -1],
    [money(2), money(2), 0],
    [money(3), money(2), 1],
  ])('compares %p with %p', (a, b, expected) => {
    expect(compare(a, b)).toBe(expected);
  });
});

describe('formatMoney()', () => {
  it('formats VND without decimals', () => {
    // Intl inserts a non-breaking space before the symbol; assert on digits
    // instead of the exact glyph so the test is not locale-data brittle.
    const output = formatMoney(money(1_250_000));
    expect(output).toMatch(/1[.,]250[.,]000/);
    // Digits only: proves no fractional part was appended for a 0-decimal currency.
    expect(output.replace(/\D/g, '')).toBe('1250000');
  });

  it('formats USD with two decimals', () => {
    expect(formatMoney(money(1999, 'USD'), 'en-US')).toBe('$19.99');
  });
});
