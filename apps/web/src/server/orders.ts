/**
 * In-memory order store.
 *
 * The parts worth reading are not the storage (a Map) but the two rules that
 * a transactional product cannot get wrong:
 *
 *  1. Prices are re-derived from the catalogue on the server. The client's
 *     claimed `unitPrice` is ignored. Otherwise anyone can POST a 1 VND tee.
 *  2. Checkout is idempotent per (user, idempotencyKey). A double-tapped
 *     "Pay" button, a retried request after a timeout, or a flaky mobile
 *     network must not produce two orders.
 */
import {
  ApiError,
  applyPromo,
  emptyCart,
  findVariant,
  orderCode,
  orderSchema,
  totals,
  type CartLine,
  type CheckoutRequest,
  type Order,
  type SessionUser,
} from '@fc/core';

import { findProductById } from './catalog-data';

/**
 * The store is pinned to `globalThis`, not to module scope.
 *
 * Reason, learned the hard way: Next compiles route handlers and page renders
 * into separate module graphs. A plain `const map = new Map()` at module scope
 * therefore gets instantiated more than once in the same process — checkout
 * writes to one copy, the orders page reads another, and the order silently
 * "disappears" with no error anywhere. Pinning to globalThis gives both sides
 * the same instance (the same trick used for Prisma clients in dev).
 *
 * Still per-process: with more than one server instance this would need a real
 * database. That is the point at which this file gets replaced, not patched.
 */
interface OrderStore {
  byUser: Map<string, Order[]>;
  byIdempotencyKey: Map<string, Order>;
  sequence: number;
}

const STORE_KEY = Symbol.for('fan-commerce.orderStore');

function store(): OrderStore {
  const globals = globalThis as typeof globalThis & { [STORE_KEY]?: OrderStore };
  globals[STORE_KEY] ??= {
    byUser: new Map(),
    byIdempotencyKey: new Map(),
    sequence: 0,
  };
  return globals[STORE_KEY];
}

function rebuildLines(requested: readonly CartLine[]): CartLine[] {
  return requested.map((line) => {
    const product = findProductById(line.productId);
    if (!product) {
      throw new ApiError('NOT_FOUND', `Sản phẩm không còn tồn tại: ${line.productId}`);
    }

    const variant = findVariant(product, line.variantId);
    if (!variant) {
      throw new ApiError('NOT_FOUND', `Phiên bản không còn tồn tại: ${line.variantId}`);
    }
    if (variant.stock !== null && variant.stock < line.quantity) {
      throw new ApiError(
        'INVALID_ARGUMENT',
        `${product.name} (${variant.label}) chỉ còn ${variant.stock} sản phẩm.`,
      );
    }

    // Server-authoritative snapshot. Anything the client sent about price,
    // name or image is discarded.
    return {
      productId: product.id,
      variantId: variant.id,
      slug: product.slug,
      name: product.name,
      variantLabel: variant.label,
      imageUrl: product.imageUrl,
      unitPrice: { amount: product.price.amount, currency: product.price.currency },
      quantity: line.quantity,
    } satisfies CartLine;
  });
}

export function placeOrder(user: SessionUser, request: CheckoutRequest): Order {
  const state = store();
  const idempotencyScope = `${user.id}:${request.idempotencyKey}`;
  const existing = state.byIdempotencyKey.get(idempotencyScope);
  if (existing) {
    return existing;
  }

  const lines = rebuildLines(request.lines);
  const priced = totals(applyPromo({ ...emptyCart, lines }, request.promoCode));

  state.sequence += 1;
  const now = new Date();

  const order = orderSchema.parse({
    id: `o_${now.getTime()}_${state.sequence}`,
    code: orderCode(state.sequence, now),
    userId: user.id,
    // A real integration would start as `pending` and flip on a payment
    // webhook. COD skips the gateway entirely, which is why it differs here.
    status: request.paymentMethod === 'cod' ? 'pending' : 'paid',
    lines,
    subtotal: priced.subtotal,
    discount: priced.discount,
    shipping: priced.shipping,
    total: priced.total,
    promoCode: request.promoCode,
    paymentMethod: request.paymentMethod,
    shippingAddress: request.shippingAddress,
    createdAt: now.toISOString(),
  });

  state.byUser.set(user.id, [order, ...(state.byUser.get(user.id) ?? [])]);
  state.byIdempotencyKey.set(idempotencyScope, order);

  return order;
}

/** Scoped by user id — an order list endpoint must never leak across accounts. */
export function listOrders(userId: string): Order[] {
  return store().byUser.get(userId) ?? [];
}

export function findOrder(userId: string, orderId: string): Order | undefined {
  return listOrders(userId).find((order) => order.id === orderId);
}

/** Test helper. Not reachable from any route. */
export function __resetOrders(): void {
  const state = store();
  state.byUser.clear();
  state.byIdempotencyKey.clear();
  state.sequence = 0;
}
