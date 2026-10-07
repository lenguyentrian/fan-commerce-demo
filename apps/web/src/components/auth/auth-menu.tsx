'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { routes } from '@fc/core';
import { Button, Skeleton } from '@fc/ui';

import { hardNavigate } from '@/lib/navigation';
import { useCartStore } from '@/store/cart-store';
import { useSessionStatus, useSessionStore, useSessionUser } from '@/store/session-store';

/**
 * The session-aware corner of the header.
 *
 * Why this is a client island instead of a cookie read in the root layout:
 * calling `cookies()` anywhere in the layout marks every route as dynamic,
 * which would throw away static rendering for the whole catalogue. Isolating
 * the session read here keeps `/` on ISR and `/products/[slug]` on SSG while
 * the header still reflects who is signed in.
 *
 * Cost: a brief skeleton on first paint. Fine for a header affordance; it
 * would not be fine for a page's main content.
 */
export function AuthMenu() {
  const user = useSessionUser();
  const status = useSessionStatus();
  const load = useSessionStore((state) => state.load);
  const clearSession = useSessionStore((state) => state.clear);
  const resetCart = useCartStore((state) => state.reset);

  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await fetch(routes.logout(), { method: 'POST' });
      clearSession();
      resetCart();
      hardNavigate('/');
    } finally {
      setIsSigningOut(false);
    }
  }

  if (status !== 'ready') {
    return <Skeleton className="h-9 w-28" label="Đang kiểm tra phiên đăng nhập" />;
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="inline-flex h-9 items-center rounded-[var(--radius-control)] bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700"
      >
        Đăng nhập
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Link
        href="/orders"
        className="rounded-[var(--radius-control)] px-3 py-2 text-sm hover:bg-[var(--fc-surface-sunken)]"
      >
        Đơn hàng
      </Link>
      <span className="hidden text-sm text-[var(--fc-text-muted)] lg:inline">
        {user.displayName}
      </span>
      <Button variant="ghost" size="sm" onClick={handleSignOut} isLoading={isSigningOut}>
        Đăng xuất
      </Button>
    </div>
  );
}
