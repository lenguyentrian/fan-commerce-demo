/**
 * Auth domain: credentials, session shape and role-based authorization.
 *
 * Password *hashing* deliberately does not live here — it is server-only and
 * belongs in `apps/web/src/server`. Keeping this file free of Node built-ins
 * is what lets the Flutter port reuse it.
 */
import { z } from 'zod';

export const ROLES = ['fan', 'admin'] as const;
export type Role = (typeof ROLES)[number];

export const loginRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email không hợp lệ / Invalid email'),
  password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự / Password must be at least 8 characters'),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const sessionUserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  displayName: z.string().min(1),
  role: z.enum(ROLES),
  /** Fan-club tier drives the FAN10 promo eligibility in the demo. */
  tier: z.enum(['none', 'silver', 'gold']).default('none'),
});

export type SessionUser = z.infer<typeof sessionUserSchema>;

export const sessionResponseSchema = z.object({
  user: sessionUserSchema.nullable(),
});

export type SessionResponse = z.infer<typeof sessionResponseSchema>;

/** Routes that require a signed-in user. Consumed by the web middleware. */
export const PROTECTED_PATHS = ['/checkout', '/orders', '/account'] as const;

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some((base) => pathname === base || pathname.startsWith(`${base}/`));
}

const ROLE_RANK: Record<Role, number> = { fan: 1, admin: 2 };

/** Authorization check: does `user` meet at least `required`? */
export function hasRole(user: SessionUser | null, required: Role): boolean {
  if (!user) return false;
  return ROLE_RANK[user.role] >= ROLE_RANK[required];
}

/**
 * Only internal, same-origin paths may be used as a post-login redirect.
 * Blocks `//evil.com` and `https://evil.com` open-redirect payloads.
 */
export function safeRedirect(target: string | null | undefined, fallback = '/'): string {
  if (!target) return fallback;
  if (!target.startsWith('/')) return fallback;
  if (target.startsWith('//')) return fallback;
  if (target.includes('\\')) return fallback;
  return target;
}
