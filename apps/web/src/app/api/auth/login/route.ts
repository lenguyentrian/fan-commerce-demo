import { cookies } from 'next/headers';

import { ApiError, loginRequestSchema } from '@fc/core';

import {
  clientKey,
  jsonOk,
  limits,
  parseJsonBody,
  rateLimit,
  withErrorHandling,
} from '@/server/http';
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from '@/server/session';
import { verifyCredentials } from '@/server/users';

/**
 * POST /api/auth/login
 *
 * Returns the same generic message for "unknown email" and "wrong password" so
 * the endpoint cannot be used to enumerate accounts. Rate limited per IP.
 */
export const POST = withErrorHandling(async (request: Request) => {
  rateLimit(clientKey(request, 'login'), limits.login.max, limits.login.windowMs);

  const credentials = await parseJsonBody(request, loginRequestSchema);
  const user = await verifyCredentials(credentials.email, credentials.password);

  if (!user) {
    throw new ApiError('UNAUTHENTICATED', 'Email hoặc mật khẩu không đúng.');
  }

  const token = await createSessionToken(user);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, sessionCookieOptions(request));

  return jsonOk({ user });
});
