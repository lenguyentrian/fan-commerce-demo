/**
 * Order + checkout domain.
 *
 * The checkout payload schema is shared with the API route handler, so the
 * server validates exactly what the client claims to send. No second,
 * hand-written validator that can drift.
 */
import { z } from 'zod';

import { cartLineSchema } from './cart';
import { moneySchema } from './catalog';

export const PAYMENT_METHODS = ['card', 'momo', 'vnpay', 'cod'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const ORDER_STATUSES = ['pending', 'paid', 'failed', 'cancelled', 'fulfilled'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Vietnamese mobile numbers: 10 digits starting with 0, or +84 form. */
export const PHONE_PATTERN = /^(?:0|\+84)(?:3|5|7|8|9)\d{8}$/;

export const shippingAddressSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  phone: z
    .string()
    .trim()
    .regex(PHONE_PATTERN, 'Số điện thoại không hợp lệ / Invalid Vietnamese phone number'),
  line1: z.string().trim().min(5).max(160),
  ward: z.string().trim().min(2).max(80),
  city: z.string().trim().min(2).max(80),
  note: z.string().trim().max(300).optional(),
});

export type ShippingAddress = z.infer<typeof shippingAddressSchema>;

export const checkoutRequestSchema = z.object({
  lines: z.array(cartLineSchema).min(1, 'Cart is empty'),
  promoCode: z.string().nullable().default(null),
  paymentMethod: z.enum(PAYMENT_METHODS),
  shippingAddress: shippingAddressSchema,
  /**
   * Client-generated UUID. The server stores it and returns the existing order
   * if the same key arrives twice — a double-tapped "Pay" button must not
   * create two orders. Same reasoning as the repayment flows in banking apps.
   */
  idempotencyKey: z.string().uuid(),
});

export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;

export const orderSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  userId: z.string().min(1),
  status: z.enum(ORDER_STATUSES),
  lines: z.array(cartLineSchema),
  subtotal: moneySchema,
  discount: moneySchema,
  shipping: moneySchema,
  total: moneySchema,
  promoCode: z.string().nullable(),
  paymentMethod: z.enum(PAYMENT_METHODS),
  shippingAddress: shippingAddressSchema,
  createdAt: z.string().datetime(),
});

export type Order = z.infer<typeof orderSchema>;

export const orderListResponseSchema = z.object({
  items: z.array(orderSchema),
  total: z.number().int().min(0),
});

export type OrderListResponse = z.infer<typeof orderListResponseSchema>;

const STATUS_LABELS: Record<OrderStatus, { vi: string; en: string }> = {
  pending: { vi: 'Chờ thanh toán', en: 'Awaiting payment' },
  paid: { vi: 'Đã thanh toán', en: 'Paid' },
  failed: { vi: 'Thanh toán thất bại', en: 'Payment failed' },
  cancelled: { vi: 'Đã huỷ', en: 'Cancelled' },
  fulfilled: { vi: 'Đã giao', en: 'Fulfilled' },
};

export function orderStatusLabel(status: OrderStatus, locale: 'vi' | 'en' = 'vi'): string {
  return STATUS_LABELS[status][locale];
}

/** Only these statuses can still move to `cancelled`. */
export function canCancel(order: Order): boolean {
  return order.status === 'pending' || order.status === 'paid';
}

export function orderCode(sequence: number, now: Date = new Date()): string {
  const yyyymmdd = now.toISOString().slice(0, 10).replace(/-/g, '');
  return `FC${yyyymmdd}-${String(sequence).padStart(4, '0')}`;
}
