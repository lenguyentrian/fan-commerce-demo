import type { NextConfig } from 'next';

/**
 * Security headers are set here rather than per-route so a new page cannot
 * accidentally ship without them. CSP is intentionally strict; `unsafe-inline`
 * for styles is required by Next's inlined critical CSS.
 */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Next injects inline bootstrap scripts; 'unsafe-inline' is dropped in
      // favour of nonces once a real CSP nonce middleware is added.
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // The shared packages ship raw TypeScript. Next compiles them with the app,
  // which keeps the monorepo build-step-free.
  //
  // `jose` is listed too, even though Next handles ESM natively: next/jest
  // derives its `transformIgnorePatterns` from this list, so including it is
  // what lets Jest load an ESM-only dependency in `session.test.ts`.
  transpilePackages: ['@fc/core', '@fc/ui', 'jose'],

  // Generates types for every route so a typo in a <Link href> is a compile
  // error rather than a 404 someone finds in staging.
  typedRoutes: true,

  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
