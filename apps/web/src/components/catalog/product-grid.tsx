import type { Product } from '@fc/core';
import { EmptyState, Skeleton } from '@fc/ui';

import { ProductCard } from './product-card';

export function ProductGrid({ products }: { products: readonly Product[] }) {
  if (products.length === 0) {
    return (
      <EmptyState
        title="Không tìm thấy sản phẩm"
        description="Thử bỏ bộ lọc hoặc tìm với từ khoá khác."
      />
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {products.map((product, index) => (
        <ProductCard key={product.id} product={product} priority={index < 4} />
      ))}
    </ul>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <li key={index}>
          <Skeleton className="aspect-4/3 w-full" label="Đang tải sản phẩm" />
          <Skeleton className="mt-3 h-4 w-2/3" label="" />
          <Skeleton className="mt-2 h-4 w-1/3" label="" />
        </li>
      ))}
    </ul>
  );
}
