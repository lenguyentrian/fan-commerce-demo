import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { SESSION_COOKIE } from '@/server/session';
import { withErrorHandling } from '@/server/http';

/** POST /api/auth/logout — clears the session cookie. */
export const POST = withErrorHandling(async () => {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  return new NextResponse(null, { status: 204 });
});
