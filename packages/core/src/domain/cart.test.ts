import {
  addLine,
  applyPromo,
  CartError,
  clearCart,
  emptyCart,
  itemCount,
  removeLine,
  setQuantity,
  SHIPPING_FEE,
  totals,
  type Cart,
} from './cart';
import { type Product, productSchema } from './catalog';
import { money } from './money';

function makeProduct(overrides: Partial<Product> = {}): Product {
  return productSchema.parse({
    id: 'p_tee',
    slug: 'anh-trai-tour-tee',
    name: 'Anh Trai Tour Tee',
    kind: 'merch',
    artist: 'Anh Trai Collective',
    summary: 'Official tour tee',
    description: 'Heavyweight cotton tour tee.',
    price: { amount: 250_000, currency: 'VND' },
    compareAtPrice: { amount: 350_000, currency: 'VND' },
    imageUrl: '/img/tee.svg',
    imageAlt: 'Black tour tee',
    tags: ['tour'],
    variants: [
      { id: 'v_m', label: 'M', stock: 5 },
      { id: 'v_l', label: 'L', stock: 0 },
      { id: 'v_xl', label: 'XL', stock: null },
    ],
    rating: 4.8,
    releasedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  });
}

describe('addLine()', () => {
  it('adds a new line', () => {
    const cart = addLine(emptyCart, makeProduct(), 'v_m', 2);
    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0]).toMatchObject({ variantId: 'v_m', quantity: 2 });
  });

  it('merges into the existing line for the same variant', () => {
    let cart = addLine(emptyCart, makeProduct(), 'v_m', 2);
    cart = addLine(cart, makeProduct(), 'v_m', 1);
    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0]?.quantity).toBe(3);
  });

  it('keeps separate lines per variant', () => {
    let cart = addLine(emptyCart, makeProduct(), 'v_m');
    cart = addLine(cart, makeProduct(), 'v_xl');
    expect(cart.lines).toHaveLength(2);
  });

  it('does not mutate the input cart', () => {
    const before = emptyCart;
    addLine(before, makeProduct(), 'v_m');
    expect(before.lines).toHaveLength(0);
  });

  it('rejects a sold-out variant', () => {
    expect(() => addLine(emptyCart, makeProduct(), 'v_l')).toThrow(CartError);
    try {
      addLine(emptyCart, makeProduct(), 'v_l');
    } catch (error) {
      expect((error as CartError).code).toBe('SOLD_OUT');
    }
  });

  it('rejects an unknown variant', () => {
    try {
      addLine(emptyCart, makeProduct(), 'v_nope');
      throw new Error('expected to throw');
    } catch (error) {
      expect((error as CartError).code).toBe('VARIANT_NOT_FOUND');
    }
  });

  it('rejects going past available stock', () => {
    try {
      addLine(emptyCart, makeProduct(), 'v_m', 6);
      throw new Error('expected to throw');
    } catch (error) {
      expect((error as CartError).code).toBe('QUANTITY_EXCEEDED');
    }
  });

  it('caps untracked stock at the per-order limit', () => {
    expect(() => addLine(emptyCart, makeProduct(), 'v_xl', 10)).not.toThrow();
    expect(() => addLine(emptyCart, makeProduct(), 'v_xl', 11)).toThrow(CartError);
  });

  it('rejects a fully sold-out product', () => {
    const soldOut = makeProduct({ variants: [{ id: 'v_m', label: 'M', stock: 0 }] });
    try {
      addLine(emptyCart, soldOut, 'v_m');
      throw new Error('expected to throw');
    } catch (error) {
      expect((error as CartError).code).toBe('SOLD_OUT');
    }
  });
});

describe('setQuantity() / removeLine()', () => {
  const seeded = (): Cart => addLine(emptyCart, makeProduct(), 'v_m', 2);

  it('updates quantity', () => {
    const cart = setQuantity(seeded(), 'p_tee', 'v_m', 4, 5);
    expect(cart.lines[0]?.quantity).toBe(4);
  });

  it('removes the line when quantity drops to zero', () => {
    const cart = setQuantity(seeded(), 'p_tee', 'v_m', 0);
    expect(cart.lines).toHaveLength(0);
  });

  it('throws for a missing line', () => {
    try {
      setQuantity(emptyCart, 'p_tee', 'v_m', 1);
      throw new Error('expected to throw');
    } catch (error) {
      expect((error as CartError).code).toBe('LINE_NOT_FOUND');
    }
  });

  it('throws above the ceiling', () => {
    expect(() => setQuantity(seeded(), 'p_tee', 'v_m', 99, 5)).toThrow(CartError);
  });

  it('removes a line by id', () => {
    expect(removeLine(seeded(), 'p_tee', 'v_m').lines).toHaveLength(0);
  });

  it('is a no-op when removing something absent', () => {
    expect(removeLine(seeded(), 'p_tee', 'v_other').lines).toHaveLength(1);
  });
});

describe('applyPromo()', () => {
  it('normalizes casing and whitespace', () => {
    expect(applyPromo(emptyCart, ' fan10 ').promoCode).toBe('FAN10');
  });

  it('drops unknown codes', () => {
    expect(applyPromo(emptyCart, 'NOPE').promoCode).toBeNull();
  });

  it('clears with null', () => {
    const cart = applyPromo(emptyCart, 'FAN10');
    expect(applyPromo(cart, null).promoCode).toBeNull();
  });
});

describe('totals()', () => {
  it('is all zero for an empty cart', () => {
    const result = totals(emptyCart);
    expect(result.subtotal).toEqual(money(0));
    expect(result.total).toEqual(money(0));
    expect(result.freeShippingApplied).toBe(true);
  });

  it('charges shipping below the free-shipping threshold', () => {
    const cart = addLine(emptyCart, makeProduct(), 'v_m', 1); // 250.000
    const result = totals(cart);
    expect(result.subtotal).toEqual(money(250_000));
    expect(result.shipping).toEqual(SHIPPING_FEE);
    expect(result.total).toEqual(money(280_000));
  });

  it('waives shipping at the threshold', () => {
    const cart = addLine(emptyCart, makeProduct(), 'v_m', 2); // 500.000
    const result = totals(cart);
    expect(result.freeShippingApplied).toBe(true);
    expect(result.total).toEqual(money(500_000));
  });

  it('applies the discount before deciding on free shipping', () => {
    // 2 x 250.000 = 500.000, -10% = 450.000 -> below threshold, so shipping applies.
    const cart = applyPromo(addLine(emptyCart, makeProduct(), 'v_m', 2), 'FAN10');
    const result = totals(cart);
    expect(result.discount).toEqual(money(50_000));
    expect(result.shipping).toEqual(SHIPPING_FEE);
    expect(result.total).toEqual(money(480_000));
    expect(result.promoLabel).toBe('Fan Club -10%');
  });

  it('keeps totals integral with an odd discount percentage', () => {
    // 3 x 250.000 = 750.000, -15% = 112.500 discount -> 637.500
    const cart = applyPromo(addLine(emptyCart, makeProduct(), 'v_m', 3), 'VAC15');
    const result = totals(cart);
    expect(Number.isInteger(result.discount.amount)).toBe(true);
    expect(result.discount).toEqual(money(112_500));
    expect(result.total).toEqual(money(637_500));
  });
});

describe('itemCount() / clearCart()', () => {
  it('counts units, not lines', () => {
    let cart = addLine(emptyCart, makeProduct(), 'v_m', 2);
    cart = addLine(cart, makeProduct(), 'v_xl', 3);
    expect(cart.lines).toHaveLength(2);
    expect(itemCount(cart)).toBe(5);
  });

  it('clears lines but keeps the promo code', () => {
    const cart = applyPromo(addLine(emptyCart, makeProduct(), 'v_m'), 'FAN10');
    const cleared = clearCart(cart);
    expect(cleared.lines).toHaveLength(0);
    expect(cleared.promoCode).toBe('FAN10');
  });
});
