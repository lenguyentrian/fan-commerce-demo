import { checkoutRequestSchema } from '@fc/core';

import { requireUser } from '@/server/current-user';
import {
  clientKey,
  jsonOk,
  limits,
  parseJsonBody,
  rateLimit,
  withErrorHandling,
} from '@/server/http';
import { placeOrder } from '@/server/orders';

/**
 * POST /api/checkout
 *
 * Authenticated. Re-prices every line from the catalogue (see server/orders.ts)
 * and is idempotent on `idempotencyKey`, so the same key returns the same
 * order instead of creating a duplicate.
 */
export const POST = withErrorHandling(async (request: Request) => {
  const user = await requireUser('fan');
  rateLimit(
    clientKey(request, `checkout:${user.id}`),
    limits.checkout.max,
    limits.checkout.windowMs,
  );

  const payload = await parseJsonBody(request, checkoutRequestSchema);
  const order = placeOrder(user, payload);

  return jsonOk(order, { status: 201 });
});
