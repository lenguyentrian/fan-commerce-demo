import Link from 'next/link';

import { AuthMenu } from '@/components/auth/auth-menu';
import { CartBadge } from '@/components/cart/cart-badge';

const NAV_ITEMS = [
  { href: '/', label: 'Trang chủ' },
  { href: '/products', label: 'Tất cả' },
  { href: '/products?kind=merch', label: 'Merch' },
  { href: '/products?kind=ticket', label: 'Vé' },
  { href: '/products?kind=membership', label: 'Membership' },
] as const;

/**
 * Static server component. It reads no cookies and no headers on purpose —
 * see the note in components/auth/auth-menu.tsx for why that matters to
 * static rendering.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--fc-border)] bg-[var(--fc-surface)]/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span
            aria-hidden="true"
            className="grid size-8 place-items-center rounded-lg bg-brand-600 text-sm text-white"
          >
            FC
          </span>
          <span className="hidden sm:inline">Fan Commerce</span>
        </Link>

        <nav aria-label="Điều hướng chính" className="ml-2 hidden md:block">
          <ul className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className="rounded-[var(--radius-control)] px-3 py-2 text-sm text-[var(--fc-text-muted)] transition-colors hover:bg-[var(--fc-surface-sunken)] hover:text-[var(--fc-text)]"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <CartBadge />
          <AuthMenu />
        </div>
      </div>

      {/* Mobile: a scrollable chip row beats a hamburger for five links. */}
      <nav aria-label="Danh mục" className="border-t border-[var(--fc-border)] md:hidden">
        <ul className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2 py-2">
          {NAV_ITEMS.map((item) => (
            <li key={item.label}>
              <Link
                href={item.href}
                className="block rounded-full px-3 py-1.5 text-sm whitespace-nowrap text-[var(--fc-text-muted)] hover:bg-[var(--fc-surface-sunken)]"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
