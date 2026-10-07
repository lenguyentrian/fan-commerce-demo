import { NextResponse, type NextRequest } from 'next/server';

import { isProtectedPath } from '@fc/core';

import { readSessionToken, SESSION_COOKIE } from '@/server/session';

/**
 * Edge proxy (the convention formerly called `middleware`, renamed in
 * Next.js 16 — see https://nextjs.org/docs/messages/middleware-to-proxy).
 *
 * Blocks *navigation* to protected routes and preserves the intended
 * destination so login can send the user back.
 *
 * This is a UX guard, not the security boundary. The real authorization check
 * lives in `requireUser()` inside each route handler and page — a proxy alone
 * can be sidestepped by calling an API endpoint directly.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  return readSessionToken(request.cookies.get(SESSION_COOKIE)?.value).then((user) => {
    if (user) {
      return NextResponse.next();
    }

    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  });
}

/**
 * Next parses this literal at build time, so it cannot be computed from
 * `PROTECTED_PATHS`. The duplication is deliberate and guarded:
 * `src/__tests__/proxy-matcher.test.ts` reads this file and fails CI if the
 * two ever drift.
 */
export const config = {
  matcher: [
    '/checkout',
    '/checkout/:path*',
    '/orders',
    '/orders/:path*',
    '/account',
    '/account/:path*',
  ],
};
