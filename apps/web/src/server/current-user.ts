import { cookies } from 'next/headers';

import { ApiError, hasRole, type Role, type SessionUser } from '@fc/core';

import { readSessionToken, SESSION_COOKIE } from './session';

/** Reads the session for Server Components and route handlers. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  return readSessionToken(store.get(SESSION_COOKIE)?.value);
}

/**
 * Authorization gate for route handlers.
 *
 * Middleware already blocks unauthenticated *navigation*, but API routes must
 * check again: middleware can be bypassed by calling the endpoint directly,
 * and "the UI hides the button" is not an access control.
 */
export async function requireUser(required: Role = 'fan'): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new ApiError('UNAUTHENTICATED', 'Vui lòng đăng nhập để tiếp tục.');
  }
  if (!hasRole(user, required)) {
    throw new ApiError('PERMISSION_DENIED', 'Bạn không có quyền thực hiện thao tác này.');
  }
  return user;
}
