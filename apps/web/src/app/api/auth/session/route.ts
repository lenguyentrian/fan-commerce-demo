import { getCurrentUser } from '@/server/current-user';
import { jsonOk, withErrorHandling } from '@/server/http';

/**
 * GET /api/auth/session — returns `{ user: null }` rather than 401 when
 * anonymous, so the client can ask "am I logged in?" without treating a
 * normal state as an error.
 */
export const GET = withErrorHandling(async () => {
  const user = await getCurrentUser();
  return jsonOk({ user });
});
