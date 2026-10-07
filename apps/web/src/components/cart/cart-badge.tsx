'use client';

import Link from 'next/link';

import { useCartHydrated, useCartItemCount } from '@/store/cart-store';

export function CartBadge() {
  const hydrated = useCartHydrated();
  const count = useCartItemCount();
  // Before hydration the server-rendered count is always 0; showing the
  // persisted value too early causes a hydration mismatch.
  const display = hydrated ? count : 0;

  return (
    <Link
      href="/cart"
      className="relative rounded-[var(--radius-control)] px-3 py-2 text-sm hover:bg-[var(--fc-surface-sunken)]"
      aria-label={
        display > 0 ? `Giỏ hàng, ${display} sản phẩm` : 'Giỏ hàng, chưa có sản phẩm'
      }
    >
      <span aria-hidden="true">Giỏ hàng</span>
      {display > 0 ? (
        <span
          aria-hidden="true"
          className="absolute -top-0.5 -right-0.5 grid min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-xs font-semibold text-white"
        >
          {display}
        </span>
      ) : null}
    </Link>
  );
}
