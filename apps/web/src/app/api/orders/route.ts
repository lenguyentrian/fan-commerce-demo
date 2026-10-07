import { requireUser } from '@/server/current-user';
import { jsonOk, withErrorHandling } from '@/server/http';
import { listOrders } from '@/server/orders';

/** GET /api/orders — scoped to the signed-in user, never to a client-supplied id. */
export const GET = withErrorHandling(async () => {
  const user = await requireUser('fan');
  const items = listOrders(user.id);
  return jsonOk({ items, total: items.length });
});
