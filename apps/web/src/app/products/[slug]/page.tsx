import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { discountPercent, isPreOrder } from '@fc/core';
import { Badge, Card, Price, Stack } from '@fc/ui';

import { AddToCart } from '@/components/catalog/add-to-cart';
import { findProductBySlug, PRODUCTS } from '@/server/catalog-data';

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Pre-render every product at build time. The catalogue is small and stable,
 * so this trades a little build time for a static HTML response per product.
 */
export function generateStaticParams() {
  return PRODUCTS.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = findProductBySlug(slug);

  if (!product) {
    return { title: 'Không tìm thấy sản phẩm' };
  }

  return {
    title: product.name,
    description: product.summary,
    openGraph: {
      title: product.name,
      description: product.summary,
      images: [{ url: product.imageUrl, alt: product.imageAlt }],
    },
  };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const product = findProductBySlug(slug);

  // notFound() renders the 404 boundary with the correct status code —
  // important for crawlers, and better than rendering an empty page.
  if (!product) notFound();

  const discount = discountPercent(product);
  const preOrder = isPreOrder(product);

  return (
    <div className="flex flex-col gap-8">
      <nav aria-label="Breadcrumb" className="text-sm text-[var(--fc-text-muted)]">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href="/" className="hover:underline">
              Trang chủ
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/products" className="hover:underline">
              Sản phẩm
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-[var(--fc-text)]">
            {product.name}
          </li>
        </ol>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="relative aspect-square overflow-hidden rounded-[var(--radius-card)] bg-[var(--fc-surface)]">
          <Image
            src={product.imageUrl}
            alt={product.imageAlt}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            priority
            className="object-cover"
          />
        </div>

        <Stack gap={6}>
          <Stack gap={3}>
            <div className="flex flex-wrap gap-2">
              <Badge tone="neutral">{product.artist}</Badge>
              {preOrder ? <Badge tone="warning">Pre-order</Badge> : null}
              {discount ? <Badge tone="brand">Giảm {discount}%</Badge> : null}
            </div>

            <h1 className="text-2xl font-bold sm:text-3xl">{product.name}</h1>
            <p className="text-[var(--fc-text-muted)]">{product.summary}</p>
            <Price value={product.price} compareAt={product.compareAtPrice} size="lg" />
          </Stack>

          <AddToCart product={product} />

          <Card>
            <h2 className="mb-2 font-semibold">Chi tiết</h2>
            <p className="text-sm leading-relaxed text-[var(--fc-text-muted)]">
              {product.description}
            </p>

            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-[var(--fc-text-muted)]">Loại</dt>
                <dd className="font-medium">{product.kind}</dd>
              </div>
              <div>
                <dt className="text-[var(--fc-text-muted)]">Ngày mở bán</dt>
                <dd className="font-medium">
                  {new Date(product.releasedAt).toLocaleDateString('vi-VN')}
                </dd>
              </div>
            </dl>
          </Card>
        </Stack>
      </div>
    </div>
  );
}
