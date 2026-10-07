import { checkoutRequestSchema, type CartLine, type SessionUser } from '@fc/core';

import { __resetOrders, listOrders, placeOrder } from './orders';

const user: SessionUser = {
  id: 'u_fan',
  email: 'fan@fancommerce.dev',
  displayName: 'Fan',
  role: 'fan',
  tier: 'gold',
};

const otherUser: SessionUser = { ...user, id: 'u_other' };

/** The real tour tee: p_tour_tee / v_m, 450.000 VND, stock 8. */
function line(overrides: Partial<CartLine> = {}): CartLine {
  return {
    productId: 'p_tour_tee',
    variantId: 'v_m',
    slug: 'anh-trai-tour-tee',
    name: 'Anh Trai World Tour Tee',
    variantLabel: 'M',
    imageUrl: '/images/products/tour-tee.svg',
    unitPrice: { amount: 450_000, currency: 'VND' },
    quantity: 1,
    ...overrides,
  };
}

function request(overrides: Record<string, unknown> = {}) {
  return checkoutRequestSchema.parse({
    lines: [line()],
    paymentMethod: 'momo',
    shippingAddress: {
      fullName: 'Nguyen Van A',
      phone: '0901234567',
      line1: '123 Nguyen Hue Street',
      ward: 'Ben Nghe',
      city: 'Ho Chi Minh City',
    },
    idempotencyKey: '11111111-1111-4111-8111-111111111111',
    ...overrides,
  });
}

beforeEach(__resetOrders);

describe('placeOrder() pricing authority', () => {
  it('ignores a client-supplied price and re-derives it from the catalogue', () => {
    const order = placeOrder(
      user,
      request({ lines: [line({ unitPrice: { amount: 1, currency: 'VND' } })] }),
    );

    expect(order.lines[0]?.unitPrice.amount).toBe(450_000);
    expect(order.subtotal.amount).toBe(450_000);
  });

  it('ignores a client-supplied product name', () => {
    const order = placeOrder(user, request({ lines: [line({ name: 'Free Stuff' })] }));
    expect(order.lines[0]?.name).toBe('Anh Trai World Tour Tee');
  });

  it('applies the promo discount server-side', () => {
    const order = placeOrder(
      user,
      request({ lines: [line({ quantity: 2 })], promoCode: 'FAN10' }),
    );

    // 900.000 - 10% = 810.000, above the free-shipping threshold
    expect(order.discount.amount).toBe(90_000);
    expect(order.shipping.amount).toBe(0);
    expect(order.total.amount).toBe(810_000);
  });

  it('rejects an unknown product', () => {
    expect(() => placeOrder(user, request({ lines: [line({ productId: 'p_nope' })] }))).toThrow(
      /không còn tồn tại/,
    );
  });

  it('rejects an unknown variant', () => {
    expect(() => placeOrder(user, request({ lines: [line({ variantId: 'v_nope' })] }))).toThrow(
      /không còn tồn tại/,
    );
  });

  it('rejects a quantity above the remaining stock', () => {
    // v_m has stock 8
    expect(() => placeOrder(user, request({ lines: [line({ quantity: 9 })] }))).toThrow(
      /chỉ còn 8/,
    );
  });
});

describe('placeOrder() idempotency', () => {
  it('returns the same order for a repeated key', () => {
    const first = placeOrder(user, request());
    const second = placeOrder(user, request());

    expect(second.id).toBe(first.id);
    expect(listOrders(user.id)).toHaveLength(1);
  });

  it('creates a new order for a different key', () => {
    placeOrder(user, request());
    placeOrder(user, request({ idempotencyKey: '22222222-2222-4222-8222-222222222222' }));

    expect(listOrders(user.id)).toHaveLength(2);
  });

  it('scopes the key per user so two users cannot collide', () => {
    const mine = placeOrder(user, request());
    const theirs = placeOrder(otherUser, request());

    expect(theirs.id).not.toBe(mine.id);
    expect(listOrders(user.id)).toHaveLength(1);
    expect(listOrders(otherUser.id)).toHaveLength(1);
  });
});

describe('placeOrder() status and isolation', () => {
  it('marks COD as pending and gateway payments as paid', () => {
    expect(placeOrder(user, request({ paymentMethod: 'cod' })).status).toBe('pending');
    expect(
      placeOrder(user, request({
        paymentMethod: 'card',
        idempotencyKey: '33333333-3333-4333-8333-333333333333',
      })).status,
    ).toBe('paid');
  });

  it('never returns another user orders', () => {
    placeOrder(user, request());
    expect(listOrders(otherUser.id)).toEqual([]);
  });

  it('generates a dated, zero-padded order code', () => {
    expect(placeOrder(user, request()).code).toMatch(/^FC\d{8}-\d{4}$/);
  });
});
