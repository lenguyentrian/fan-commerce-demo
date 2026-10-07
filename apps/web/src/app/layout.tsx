import type { Metadata, Viewport } from 'next';

import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';

import './globals.css';

/**
 * Root layout.
 *
 * Deliberately free of `cookies()` / `headers()`: touching either here would
 * mark every route in the app as dynamic and give up static rendering for the
 * whole catalogue. The session-dependent part of the header is an isolated
 * client island instead (components/auth/auth-menu.tsx).
 */
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: {
    default: 'Fan Commerce — Merch, vé và membership chính thức',
    template: '%s · Fan Commerce',
  },
  description:
    'Nền tảng fan commerce: merch chính thức, vé concert và gói membership. Demo kỹ thuật xây bằng Next.js và coding agent.',
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    siteName: 'Fan Commerce',
  },
  // A portfolio demo, not a real storefront.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#111318' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="flex min-h-dvh flex-col antialiased">
        {/* First tab stop: lets keyboard users skip the nav. */}
        <a href="#main" className="skip-link">
          Bỏ qua điều hướng, tới nội dung chính
        </a>

        <SiteHeader />

        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
          {children}
        </main>

        <SiteFooter />
      </body>
    </html>
  );
}
