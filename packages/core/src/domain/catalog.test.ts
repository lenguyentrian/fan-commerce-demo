import {
  availableQuantity,
  discountPercent,
  findVariant,
  isPreOrder,
  isSoldOut,
  MAX_QUANTITY_PER_LINE,
  productListQuerySchema,
  productSchema,
  type Product,
} from './catalog';

const base = {
  id: 'p_1',
  slug: 'tour-tee',
  name: 'Tour Tee',
  kind: 'merch' as const,
  artist: 'Artist',
  summary: 'Summary',
  description: 'Description',
  price: { amount: 250_000, currency: 'VND' as const },
  imageUrl: '/img/tee.svg',
  imageAlt: 'Tee',
  variants: [{ id: 'v_m', label: 'M', stock: 3 }],
  releasedAt: '2026-01-01T00:00:00.000Z',
};

const parse = (overrides: Record<string, unknown> = {}): Product =>
  productSchema.parse({ ...base, ...overrides });

describe('productSchema', () => {
  it('applies defaults for optional fields', () => {
    const product = parse();
    expect(product.compareAtPrice).toBeNull();
    expect(product.tags).toEqual([]);
    expect(product.rating).toBeNull();
  });

  it('rejects a non-kebab-case slug', () => {
    expect(() => parse({ slug: 'Tour Tee' })).toThrow(/kebab-case/);
  });

  it('rejects a product with no variants', () => {
    expect(() => parse({ variants: [] })).toThrow();
  });

  it('rejects a non-integer price', () => {
    expect(() => parse({ price: { amount: 10.5, currency: 'VND' } })).toThrow();
  });
});

describe('discountPercent()', () => {
  it('returns null without a compare-at price', () => {
    expect(discountPercent(parse())).toBeNull();
  });

  it('returns null when compare-at is not higher', () => {
    expect(discountPercent(parse({ compareAtPrice: { amount: 250_000, currency: 'VND' } }))).toBeNull();
  });

  it('rounds to the nearest percent', () => {
    expect(discountPercent(parse({ compareAtPrice: { amount: 350_000, currency: 'VND' } }))).toBe(29);
  });
});

describe('stock helpers', () => {
  it('detects sold out only when every variant is out', () => {
    expect(isSoldOut(parse())).toBe(false);
    expect(
      isSoldOut(
        parse({
          variants: [
            { id: 'a', label: 'A', stock: 0 },
            { id: 'b', label: 'B', stock: 0 },
          ],
        }),
      ),
    ).toBe(true);
  });

  it('caps untracked stock at the per-order limit', () => {
    expect(availableQuantity({ id: 'x', label: 'X', stock: null })).toBe(MAX_QUANTITY_PER_LINE);
    expect(availableQuantity({ id: 'x', label: 'X', stock: 2 })).toBe(2);
    expect(availableQuantity({ id: 'x', label: 'X', stock: 99 })).toBe(MAX_QUANTITY_PER_LINE);
  });

  it('finds a variant by id', () => {
    expect(findVariant(parse(), 'v_m')?.label).toBe('M');
    expect(findVariant(parse(), 'nope')).toBeUndefined();
  });
});

describe('isPreOrder()', () => {
  it('is true before the release date', () => {
    expect(isPreOrder(parse({ releasedAt: '2030-01-01T00:00:00.000Z' }), new Date('2026-06-01'))).toBe(
      true,
    );
  });

  it('is false on or after the release date', () => {
    expect(isPreOrder(parse(), new Date('2026-06-01'))).toBe(false);
  });
});

describe('productListQuerySchema', () => {
  it('coerces string query params and applies defaults', () => {
    expect(productListQuerySchema.parse({ page: '2' })).toEqual({ page: 2, pageSize: 12 });
  });

  it('caps pageSize so a crafted URL cannot ask for everything', () => {
    expect(() => productListQuerySchema.parse({ pageSize: '500' })).toThrow();
  });

  it('rejects an unknown kind', () => {
    expect(() => productListQuerySchema.parse({ kind: 'weapons' })).toThrow();
  });
});
