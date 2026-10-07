import { ApiError } from '@fc/core';

import { findProductBySlug } from '@/server/catalog-data';
import { jsonOk, withErrorHandling } from '@/server/http';

interface RouteContext {
  params: Promise<{ slug: string }>;
}

/** GET /api/products/:slug */
export const GET = withErrorHandling(async (_request: Request, context: RouteContext) => {
  const { slug } = await context.params;
  const product = findProductBySlug(slug);

  if (!product) {
    throw new ApiError('NOT_FOUND', 'Không tìm thấy sản phẩm.');
  }

  return jsonOk(product);
});
