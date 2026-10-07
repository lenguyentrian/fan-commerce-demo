/**
 * Catalog domain: the things a fan can buy.
 *
 * Zod schemas are the single source of truth. Types are inferred from them so
 * a drifting API response fails loudly at the boundary instead of silently
 * producing `undefined` three components deep.
 */
import { z } from 'zod';

import { money, type Money } from './money';

export const PRODUCT_KINDS = ['merch', 'ticket', 'membership', 'digital'] as const;
export type ProductKind = (typeof PRODUCT_KINDS)[number];

export const moneySchema = z.object({
  amount: z.number().int(),
  currency: z.enum(['VND', 'USD']),
});

export const productVariantSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  /** null means "not tracked" (e.g. digital goods); 0 means sold out. */
  stock: z.number().int().min(0).nullable(),
});

export const productSchema = z.object({
  id: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, 'slug must be lowercase kebab-case'),
  name: z.string().min(1),
  kind: z.enum(PRODUCT_KINDS),
  artist: z.string().min(1),
  summary: z.string().min(1),
  description: z.string().min(1),
  price: moneySchema,
  /** Original price when the item is discounted. */
  compareAtPrice: moneySchema.nullable().default(null),
  imageUrl: z.string().min(1),
  imageAlt: z.string().min(1),
  tags: z.array(z.string()).default([]),
  variants: z.array(productVariantSchema).min(1),
  rating: z.number().min(0).max(5).nullable().default(null),
  /** Wall-clock release time; used to flag pre-orders. */
  releasedAt: z.string().datetime(),
});

export type ProductVariant = z.infer<typeof productVariantSchema>;
export type Product = z.infer<typeof productSchema>;

export const productListQuerySchema = z.object({
  kind: z.enum(PRODUCT_KINDS).optional(),
  q: z.string().trim().min(1).max(80).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(12),
});

export type ProductListQuery = z.infer<typeof productListQuerySchema>;

export const productListResponseSchema = z.object({
  items: z.array(productSchema),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
});

export type ProductListResponse = z.infer<typeof productListResponseSchema>;

export function priceOf(product: Product): Money {
  return money(product.price.amount, product.price.currency);
}

export function discountPercent(product: Product): number | null {
  if (!product.compareAtPrice || product.compareAtPrice.amount <= product.price.amount) {
    return null;
  }
  const saved = product.compareAtPrice.amount - product.price.amount;
  return Math.round((saved / product.compareAtPrice.amount) * 100);
}

export function isSoldOut(product: Product): boolean {
  return product.variants.every((variant) => variant.stock === 0);
}

export function isPreOrder(product: Product, now: Date = new Date()): boolean {
  return new Date(product.releasedAt).getTime() > now.getTime();
}

export function findVariant(product: Product, variantId: string): ProductVariant | undefined {
  return product.variants.find((variant) => variant.id === variantId);
}

/**
 * Null stock means untracked, so the only real ceiling is the per-order cap.
 */
export const MAX_QUANTITY_PER_LINE = 10;

export function availableQuantity(variant: ProductVariant): number {
  if (variant.stock === null) return MAX_QUANTITY_PER_LINE;
  return Math.min(variant.stock, MAX_QUANTITY_PER_LINE);
}
