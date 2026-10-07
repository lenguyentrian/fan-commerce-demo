import {
  canCancel,
  checkoutRequestSchema,
  orderCode,
  orderStatusLabel,
  shippingAddressSchema,
  type Order,
} from './order';

const validAddress = {
  fullName: 'Nguyen Van A',
  phone: '0901234567',
  line1: '123 Nguyen Hue Street',
  ward: 'Ben Nghe',
  city: 'Ho Chi Minh City',
};

describe('shippingAddressSchema', () => {
  it('accepts a valid Vietnamese address', () => {
    expect(() => shippingAddressSchema.parse(validAddress)).not.toThrow();
  });

  it('trims whitespace', () => {
    const parsed = shippingAddressSchema.parse({ ...validAddress, fullName: '  Nguyen Van A  ' });
    expect(parsed.fullName).toBe('Nguyen Van A');
  });

  it.each(['090123456', '1901234567', '+84901234567', '0201234567'])(
    'validates phone %s',
    (phone) => {
      const result = shippingAddressSchema.safeParse({ ...validAddress, phone });
      const shouldPass = phone === '+84901234567';
      expect(result.success).toBe(shouldPass);
    },
  );

  it('rejects an over-long note', () => {
    expect(
      shippingAddressSchema.safeParse({ ...validAddress, note: 'x'.repeat(301) }).success,
    ).toBe(false);
  });
});

describe('checkoutRequestSchema', () => {
  const line = {
    productId: 'p_1',
    variantId: 'v_1',
    slug: 'tee',
    name: 'Tee',
    variantLabel: 'M',
    imageUrl: '/img/tee.svg',
    unitPrice: { amount: 250_000, currency: 'VND' },
    quantity: 1,
  };

  const payload = {
    lines: [line],
    paymentMethod: 'momo',
    shippingAddress: validAddress,
    idempotencyKey: '3f1a6d2e-9b0c-4f8a-9c21-7e5a1b2c3d4e',
  };

  it('accepts a well-formed payload and defaults promoCode to null', () => {
    const parsed = checkoutRequestSchema.parse(payload);
    expect(parsed.promoCode).toBeNull();
  });

  it('rejects an empty cart', () => {
    expect(checkoutRequestSchema.safeParse({ ...payload, lines: [] }).success).toBe(false);
  });

  it('rejects an unknown payment method', () => {
    expect(
      checkoutRequestSchema.safeParse({ ...payload, paymentMethod: 'bitcoin' }).success,
    ).toBe(false);
  });

  it('requires a UUID idempotency key', () => {
    expect(
      checkoutRequestSchema.safeParse({ ...payload, idempotencyKey: 'not-a-uuid' }).success,
    ).toBe(false);
  });
});

describe('order helpers', () => {
  const order = (status: Order['status']): Order => ({ status }) as Order;

  it('labels statuses in both locales', () => {
    expect(orderStatusLabel('paid', 'vi')).toBe('Đã thanh toán');
    expect(orderStatusLabel('paid', 'en')).toBe('Paid');
  });

  it('allows cancelling only pending or paid orders', () => {
    expect(canCancel(order('pending'))).toBe(true);
    expect(canCancel(order('paid'))).toBe(true);
    expect(canCancel(order('fulfilled'))).toBe(false);
    expect(canCancel(order('cancelled'))).toBe(false);
  });

  it('formats a zero-padded daily order code', () => {
    expect(orderCode(7, new Date('2026-03-09T10:00:00Z'))).toBe('FC20260309-0007');
  });
});
