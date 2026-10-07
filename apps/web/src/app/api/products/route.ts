import { productListQuerySchema } from '@fc/core';

import { queryProducts } from '@/server/catalog-data';
import { jsonOk, parseSearchParams, withErrorHandling } from '@/server/http';

/**
 * GET /api/products?kind=&q=&page=&pageSize=
 *
 * Public, cacheable. Query params are schema-validated so `pageSize=100000`
 * is a 400 rather than a cheap way to make the server do work.
 */
export const GET = withErrorHandling(async (request: Request) => {
  const query = parseSearchParams(request, productListQuerySchema);
  return jsonOk(queryProducts(query));
});
