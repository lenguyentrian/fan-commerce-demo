import { productSchema, type Product } from '@fc/core';

/** Shared test fixtures. Built through the schema so they cannot drift. */
export function makeProduct(overrides: Record<string, unknown> = {}): Product {
  return productSchema.parse({
    id: 'p_test',
    slug: 'test-tee',
    name: 'Test Tee',
    kind: 'merch',
    artist: 'Test Artist',
    summary: 'A test tee',
    description: 'A longer description of the test tee.',
    price: { amount: 250_000, currency: 'VND' },
    compareAtPrice: { amount: 350_000, currency: 'VND' },
    imageUrl: '/images/products/tour-tee.svg',
    imageAlt: 'Test tee',
    tags: ['test'],
    variants: [
      { id: 'v_m', label: 'M', stock: 4 },
      { id: 'v_l', label: 'L', stock: 0 },
    ],
    rating: 4.5,
    releasedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  });
}
