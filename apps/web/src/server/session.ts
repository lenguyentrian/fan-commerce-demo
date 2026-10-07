/**
 * Session handling: a signed JWT in an httpOnly cookie.
 *
 * Why httpOnly rather than localStorage: a token in localStorage is readable
 * by any script that lands on the page, so one XSS becomes full account
 * takeover. httpOnly + SameSite=Lax + Secure keeps the token out of JS reach
 * and off cross-site requests.
 *
 * `jose` is used instead of `jsonwebtoken` because it runs in the Edge runtime,
 * which is where `middleware.ts` verifies the cookie.
 */
import { jwtVerify, SignJWT } from 'jose';

import { sessionUserSchema, type SessionUser } from '@fc/core';

export const SESSION_COOKIE = 'fc_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8h

const ISSUER = 'fan-commerce-demo';
const AUDIENCE = 'fan-commerce-web';

/**
 * In this demo the secret falls back to a fixed development value so the app
 * runs with zero configuration. In any real environment the fallback is
 * refused — see `assertProductionSecret`.
 */
const DEV_FALLBACK_SECRET = 'dev-only-insecure-secret-change-me-32chars';

function sessionSecret(): Uint8Array {
  const raw = process.env.SESSION_SECRET ?? DEV_FALLBACK_SECRET;
  return new TextEncoder().encode(raw);
}

/** Called from instrumentation so a misconfigured deploy fails loudly. */
export function assertProductionSecret(): void {
  if (process.env.NODE_ENV !== 'production') return;
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret === DEV_FALLBACK_SECRET || secret.length < 32) {
    throw new Error(
      'SESSION_SECRET must be set to a random value of at least 32 characters in production.',
    );
  }
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    tier: user.tier,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(user.id)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(sessionSecret());
}

/**
 * Verifies signature, issuer, audience and expiry, then re-validates the
 * payload shape. A token that is cryptographically valid but structurally
 * wrong (claims renamed in a later version) is treated as no session rather
 * than trusted blindly.
 */
export async function readSessionToken(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, sessionSecret(), {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ['HS256'],
    });

    const parsed = sessionUserSchema.safeParse({
      id: payload.sub,
      email: payload.email,
      displayName: payload.displayName,
      role: payload.role,
      tier: payload.tier,
    });

    return parsed.success ? parsed.data : null;
  } catch {
    // Expired, tampered with, or signed by an old secret — all the same to us.
    return null;
  }
}

export interface SessionCookieOptions {
  httpOnly: true;
  sameSite: 'lax';
  secure: boolean;
  path: '/';
  maxAge: number;
}

/**
 * Builds the cookie attributes for a specific request.
 *
 * `secure` is derived from the actual request protocol rather than from
 * NODE_ENV. Both shortcuts are wrong:
 *
 *  - `secure: NODE_ENV === 'production'` drops the cookie entirely whenever a
 *    production build is served over plain HTTP — which is exactly what the
 *    E2E suite and most local smoke tests do. The symptom is a login that
 *    returns 200 and then behaves as though it never happened.
 *  - `secure: false` would let the cookie travel over HTTP in production.
 *
 * Reading `x-forwarded-proto` first is what makes this correct behind a load
 * balancer that terminates TLS.
 */
export function sessionCookieOptions(request: Request): SessionCookieOptions {
  const forwarded = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const protocol = forwarded ?? new URL(request.url).protocol.replace(':', '');

  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: protocol === 'https',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  };
}
