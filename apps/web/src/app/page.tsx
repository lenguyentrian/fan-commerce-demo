import Link from 'next/link';

import { ProductGrid } from '@/components/catalog/product-grid';
import { queryProducts } from '@/server/catalog-data';

/**
 * Home page.
 *
 * Statically rendered and revalidated hourly: the catalogue changes rarely, so
 * every visitor can be served from the CDN instead of re-rendering per request.
 */
export const revalidate = 3600;

export default function HomePage() {
  const featured = queryProducts({ page: 1, pageSize: 8 });

  return (
    <div className="flex flex-col gap-10">
      <section className="rounded-[var(--radius-card)] bg-linear-to-br from-brand-600 to-brand-700 px-6 py-12 text-white sm:px-10 sm:py-16">
        <p className="text-sm font-semibold tracking-wide uppercase opacity-80">
          Fan Commerce Platform
        </p>
        <h1 className="mt-3 max-w-2xl text-3xl font-bold sm:text-4xl">
          Merch chính thức, vé concert và membership — một nơi duy nhất
        </h1>
        <p className="mt-4 max-w-xl text-white/85">
          Demo kỹ thuật minh hoạ một hành trình thương mại hoàn chỉnh: duyệt sản phẩm, giỏ hàng,
          đăng nhập, thanh toán và lịch sử đơn hàng.
        </p>
        <Link
          href="/products"
          className="mt-6 inline-flex h-11 items-center rounded-[var(--radius-control)] bg-white px-5 text-sm font-semibold text-brand-700 hover:bg-white/90"
        >
          Xem tất cả sản phẩm
        </Link>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-xl font-semibold">Nổi bật</h2>
          <Link href="/products" className="text-sm font-medium text-brand-600 hover:underline">
            Tất cả
          </Link>
        </div>

        <ProductGrid products={featured.items} />
      </section>
    </div>
  );
}
