/**
 * Cart domain — pure functions over an immutable cart state.
 *
 * Deliberately framework-free: the Zustand store in the web app and the Bloc
 * in the Flutter app (phase 2) both reduce over these functions rather than
 * reimplementing the rules. That is what keeps web and mobile totals
 * identical, which is the whole point of having a shared core.
 */
import { z } from 'zod';

import {
  availableQuantity,
  findVariant,
  isSoldOut,
  MAX_QUANTITY_PER_LINE,
  moneySchema,
  type Product,
} from './catalog';
import { add, money, multiply, percentOf, subtract, type Money, zero } from './money';

export const cartLineSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  variantLabel: z.string().min(1),
  imageUrl: z.string().min(1),
  unitPrice: moneySchema,
  quantity: z.number().int().min(1).max(MAX_QUANTITY_PER_LINE),
});

export type CartLine = z.infer<typeof cartLineSchema>;

export const cartSchema = z.object({
  lines: z.array(cartLineSchema).default([]),
  promoCode: z.string().nullable().default(null),
});

export type Cart = z.infer<typeof cartSchema>;

export const emptyCart: Cart = { lines: [], promoCode: null };

export class CartError extends Error {
  readonly code: CartErrorCode;

  constructor(code: CartErrorCode, message: string) {
    super(message);
    this.name = 'CartError';
    this.code = code;
  }
}

export type CartErrorCode =
  | 'SOLD_OUT'
  | 'VARIANT_NOT_FOUND'
  | 'QUANTITY_EXCEEDED'
  | 'LINE_NOT_FOUND';

const lineKey = (productId: string, variantId: string) => `${productId}::${variantId}`;

/** Promo rules live in the domain so web and mobile cannot disagree. */
export const PROMO_CODES: Record<string, { percent: number; label: string }> = {
  FAN10: { percent: 10, label: 'Fan Club -10%' },
  VAC15: { percent: 15, label: 'Launch week -15%' },
};

export const FREE_SHIPPING_THRESHOLD: Money = money(500_000);
export const SHIPPING_FEE: Money = money(30_000);

export function addLine(
  cart: Cart,
  product: Product,
  variantId: string,
  quantity = 1,
): Cart {
  if (isSoldOut(product)) {
    throw new CartError('SOLD_OUT', `${product.name} is sold out`);
  }

  const variant = findVariant(product, variantId);
  if (!variant) {
    throw new CartError('VARIANT_NOT_FOUND', `Variant ${variantId} does not exist`);
  }
  if (variant.stock === 0) {
    throw new CartError('SOLD_OUT', `${product.name} (${variant.label}) is sold out`);
  }

  const key = lineKey(product.id, variantId);
  const existing = cart.lines.find((line) => lineKey(line.productId, line.variantId) === key);
  const nextQuantity = (existing?.quantity ?? 0) + quantity;
  const ceiling = availableQuantity(variant);

  if (nextQuantity > ceiling) {
    throw new CartError(
      'QUANTITY_EXCEEDED',
      `Only ${ceiling} of ${product.name} (${variant.label}) can be ordered`,
    );
  }

  if (existing) {
    return setQuantity(cart, product.id, variantId, nextQuantity, ceiling);
  }

  const line: CartLine = {
    productId: product.id,
    variantId,
    slug: product.slug,
    name: product.name,
    variantLabel: variant.label,
    imageUrl: product.imageUrl,
    unitPrice: product.price,
    quantity: nextQuantity,
  };

  return { ...cart, lines: [...cart.lines, line] };
}

export function setQuantity(
  cart: Cart,
  productId: string,
  variantId: string,
  quantity: number,
  ceiling: number = MAX_QUANTITY_PER_LINE,
): Cart {
  const key = lineKey(productId, variantId);
  const exists = cart.lines.some((line) => lineKey(line.productId, line.variantId) === key);
  if (!exists) {
    throw new CartError('LINE_NOT_FOUND', `No cart line for ${key}`);
  }
  if (quantity <= 0) {
    return removeLine(cart, productId, variantId);
  }
  if (quantity > ceiling) {
    throw new CartError('QUANTITY_EXCEEDED', `Quantity ${quantity} exceeds the limit of ${ceiling}`);
  }

  return {
    ...cart,
    lines: cart.lines.map((line) =>
      lineKey(line.productId, line.variantId) === key ? { ...line, quantity } : line,
    ),
  };
}

export function removeLine(cart: Cart, productId: string, variantId: string): Cart {
  const key = lineKey(productId, variantId);
  return {
    ...cart,
    lines: cart.lines.filter((line) => lineKey(line.productId, line.variantId) !== key),
  };
}

export function applyPromo(cart: Cart, code: string | null): Cart {
  if (code === null) return { ...cart, promoCode: null };
  const normalized = code.trim().toUpperCase();
  return { ...cart, promoCode: normalized in PROMO_CODES ? normalized : null };
}

export function clearCart(cart: Cart): Cart {
  return { ...emptyCart, promoCode: cart.promoCode };
}

export function itemCount(cart: Cart): number {
  return cart.lines.reduce((total, line) => total + line.quantity, 0);
}

export interface CartTotals {
  readonly subtotal: Money;
  readonly discount: Money;
  readonly shipping: Money;
  readonly total: Money;
  readonly promoLabel: string | null;
  readonly freeShippingApplied: boolean;
}

/**
 * Order of operations matters and is asserted by tests: discount applies to the
 * subtotal, then free shipping is decided on the DISCOUNTED subtotal. Changing
 * that order changes what customers pay, so it is pinned here, not in the UI.
 */
export function totals(cart: Cart): CartTotals {
  const subtotal = cart.lines.reduce<Money>(
    (acc, line) => add(acc, multiply(money(line.unitPrice.amount, line.unitPrice.currency), line.quantity)),
    zero(),
  );

  const promo = cart.promoCode ? PROMO_CODES[cart.promoCode] : undefined;
  const discount = promo ? percentOf(subtotal, promo.percent) : zero();
  const discountedSubtotal = subtract(subtotal, discount);

  const hasPhysicalGoods = cart.lines.length > 0;
  const freeShippingApplied =
    !hasPhysicalGoods || discountedSubtotal.amount >= FREE_SHIPPING_THRESHOLD.amount;
  const shipping = freeShippingApplied ? zero() : SHIPPING_FEE;

  return {
    subtotal,
    discount,
    shipping,
    total: add(discountedSubtotal, shipping),
    promoLabel: promo?.label ?? null,
    freeShippingApplied,
  };
}
