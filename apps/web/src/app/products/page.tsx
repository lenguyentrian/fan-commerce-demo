import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

import { PRODUCT_KINDS, productListQuerySchema } from '@fc/core';

import { ProductGrid, ProductGridSkeleton } from '@/components/catalog/product-grid';
import { SearchField } from '@/components/catalog/search-field';
import { queryProducts } from '@/server/catalog-data';

export const metadata: Metadata = {
  title: 'Sản phẩm',
  description: 'Merch, vé concert, membership và nội dung số.',
};

const KIND_LABELS: Record<string, string> = {
  merch: 'Merch',
  ticket: 'Vé',
  membership: 'Membership',
  digital: 'Digital',
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const raw = await searchParams;

  // A crafted URL is untrusted input. `safeParse` + fallback means
  // `?page=-5&pageSize=9999` renders page 1 instead of throwing a 500.
  const parsed = productListQuerySchema.safeParse(raw);
  const query = parsed.success ? parsed.data : productListQuerySchema.parse({});

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Sản phẩm</h1>

        <SearchField defaultValue={query.q ?? ''} />

        <nav aria-label="Lọc theo loại">
          <ul className="flex flex-wrap gap-2">
            <FilterChip href="/products" label="Tất cả" active={!query.kind} />
            {PRODUCT_KINDS.map((kind) => (
              <FilterChip
                key={kind}
                href={`/products?kind=${kind}`}
                label={KIND_LABELS[kind] ?? kind}
                active={query.kind === kind}
              />
            ))}
          </ul>
        </nav>
      </div>

      {/*
        Suspense keyed by the query: changing a filter shows the skeleton again
        instead of leaving the previous results on screen looking current.
      */}
      <Suspense key={JSON.stringify(query)} fallback={<ProductGridSkeleton />}>
        <Results query={query} />
      </Suspense>
    </div>
  );
}

async function Results({ query }: { query: ReturnType<typeof productListQuerySchema.parse> }) {
  const page = queryProducts(query);

  return (
    <div className="flex flex-col gap-6">
      <p role="status" data-testid="result-count" className="text-sm text-[var(--fc-text-muted)]">
        {page.total} sản phẩm
      </p>

      <ProductGrid products={page.items} />

      {page.totalPages > 1 ? (
        <nav aria-label="Phân trang" className="flex items-center justify-center gap-2">
          {Array.from({ length: page.totalPages }, (_, index) => index + 1).map((pageNumber) => {
            const params = new URLSearchParams();
            if (query.kind) params.set('kind', query.kind);
            if (query.q) params.set('q', query.q);
            if (pageNumber > 1) params.set('page', String(pageNumber));
            const qs = params.toString();

            return (
              <Link
                key={pageNumber}
                href={`/products${qs ? `?${qs}` : ''}`}
                aria-current={pageNumber === page.page ? 'page' : undefined}
                className={
                  pageNumber === page.page
                    ? 'grid size-10 place-items-center rounded-[var(--radius-control)] bg-brand-600 text-sm font-semibold text-white'
                    : 'grid size-10 place-items-center rounded-[var(--radius-control)] border border-[var(--fc-border)] text-sm hover:bg-[var(--fc-surface-sunken)]'
                }
              >
                {pageNumber}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}

function FilterChip({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <li>
      <Link
        href={href}
        aria-current={active ? 'true' : undefined}
        className={
          active
            ? 'inline-flex h-9 items-center rounded-full bg-brand-600 px-4 text-sm font-medium text-white'
            : 'inline-flex h-9 items-center rounded-full border border-[var(--fc-border)] bg-[var(--fc-surface)] px-4 text-sm hover:bg-[var(--fc-surface-sunken)]'
        }
      >
        {label}
      </Link>
    </li>
  );
}
