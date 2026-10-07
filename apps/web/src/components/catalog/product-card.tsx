import Image from 'next/image';
import Link from 'next/link';

import { discountPercent, isPreOrder, isSoldOut, type Product } from '@fc/core';
import { Badge, Card, Price } from '@fc/ui';

export interface ProductCardProps {
  product: Product;
  /**
   * The first few cards are above the fold on most viewports, so their images
   * get `priority` to improve LCP. Everything else lazy-loads.
   */
  priority?: boolean;
}

export function ProductCard({ product, priority = false }: ProductCardProps) {
  const discount = discountPercent(product);
  const soldOut = isSoldOut(product);
  const preOrder = isPreOrder(product);

  return (
    <Card as="li" padded={false} className="group overflow-hidden">
      <Link
        href={`/products/${product.slug}`}
        className="flex h-full flex-col focus-visible:outline-none"
      >
        <div className="relative aspect-4/3 overflow-hidden bg-[var(--fc-surface-sunken)]">
          <Image
            src={product.imageUrl}
            alt={product.imageAlt}
            fill
            // Tells the browser the real rendered width per breakpoint so it
            // does not download a 1200px image for a 300px slot.
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            priority={priority}
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />

          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
            {soldOut ? <Badge tone="danger">Hết hàng</Badge> : null}
            {!soldOut && preOrder ? <Badge tone="warning">Pre-order</Badge> : null}
            {!soldOut && discount ? <Badge tone="brand">-{discount}%</Badge> : null}
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-2 p-4">
          <p className="text-xs font-medium tracking-wide text-[var(--fc-text-muted)] uppercase">
            {product.artist}
          </p>
          <h3 className="font-semibold group-hover:text-brand-600">{product.name}</h3>
          <p className="line-clamp-2 text-sm text-[var(--fc-text-muted)]">{product.summary}</p>

          <div className="mt-auto flex items-end justify-between gap-2 pt-2">
            <Price value={product.price} compareAt={product.compareAtPrice} />
            {product.rating != null ? (
              <span className="text-sm text-[var(--fc-text-muted)]">
                <span aria-hidden="true">★ </span>
                {product.rating.toFixed(1)}
                <span className="sr-only"> trên 5 điểm</span>
              </span>
            ) : null}
          </div>
        </div>
      </Link>
    </Card>
  );
}
