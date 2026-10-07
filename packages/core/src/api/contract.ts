/**
 * The API contract, in one file.
 *
 * Route strings live here (not sprinkled through components) so the web app
 * and the Flutter app hit the same endpoints, and so renaming a route is a
 * single-file change that TypeScript then enforces everywhere.
 */
import { productListResponseSchema, productSchema, type ProductListQuery } from '../domain/catalog';
import { orderListResponseSchema, orderSchema } from '../domain/order';
import { sessionResponseSchema } from '../domain/auth';

export const API_PREFIX = '/api';

export const routes = {
  products: () => `${API_PREFIX}/products`,
  product: (slug: string) => `${API_PREFIX}/products/${encodeURIComponent(slug)}`,
  login: () => `${API_PREFIX}/auth/login`,
  logout: () => `${API_PREFIX}/auth/logout`,
  session: () => `${API_PREFIX}/auth/session`,
  orders: () => `${API_PREFIX}/orders`,
  checkout: () => `${API_PREFIX}/checkout`,
  health: () => `${API_PREFIX}/health`,
} as const;

/** Response schemas, keyed for use with the typed client. */
export const responseSchemas = {
  products: productListResponseSchema,
  product: productSchema,
  session: sessionResponseSchema,
  orders: orderListResponseSchema,
  order: orderSchema,
} as const;

export function productListSearchParams(query: Partial<ProductListQuery>): string {
  const params = new URLSearchParams();
  if (query.kind) params.set('kind', query.kind);
  if (query.q) params.set('q', query.q);
  if (query.page && query.page !== 1) params.set('page', String(query.page));
  if (query.pageSize && query.pageSize !== 12) params.set('pageSize', String(query.pageSize));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/** Header names shared by client and server. */
export const headers = {
  requestId: 'x-request-id',
  appVersion: 'x-app-version',
  clientPlatform: 'x-client-platform',
  idempotencyKey: 'x-idempotency-key',
} as const;
