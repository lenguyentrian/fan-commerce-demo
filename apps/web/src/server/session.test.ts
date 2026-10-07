/**
 * @jest-environment node
 *
 * `jose` signs with WebCrypto, which jsdom does not provide. Node's
 * environment has it, and this file tests server-only code anyway.
 */
import { SignJWT } from 'jose';

import type { SessionUser } from '@fc/core';

import { createSessionToken, readSessionToken, sessionCookieOptions } from './session';

const user: SessionUser = {
  id: 'u_fan',
  email: 'fan@fancommerce.dev',
  displayName: 'Fan',
  role: 'fan',
  tier: 'gold',
};

const secret = () => new TextEncoder().encode('dev-only-insecure-secret-change-me-32chars');

describe('session tokens', () => {
  it('round-trips a user', async () => {
    const token = await createSessionToken(user);
    await expect(readSessionToken(token)).resolves.toEqual(user);
  });

  it('returns null for a missing token', async () => {
    await expect(readSessionToken(undefined)).resolves.toBeNull();
  });

  it('returns null for a malformed token', async () => {
    await expect(readSessionToken('not.a.jwt')).resolves.toBeNull();
  });

  it('rejects a token signed with a different secret', async () => {
    const forged = await new SignJWT({ role: 'admin' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('u_attacker')
      .setIssuer('fan-commerce-demo')
      .setAudience('fan-commerce-web')
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode('a-completely-different-secret-value-32'));

    await expect(readSessionToken(forged)).resolves.toBeNull();
  });

  it('rejects a token from another audience', async () => {
    const wrongAudience = await new SignJWT({
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      tier: user.tier,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(user.id)
      .setIssuer('fan-commerce-demo')
      .setAudience('some-other-app')
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(secret());

    await expect(readSessionToken(wrongAudience)).resolves.toBeNull();
  });

  it('rejects an expired token', async () => {
    const expired = await new SignJWT({
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      tier: user.tier,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(user.id)
      .setIssuer('fan-commerce-demo')
      .setAudience('fan-commerce-web')
      .setIssuedAt(Math.floor(Date.now() / 1000) - 7200)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 3600)
      .sign(secret());

    await expect(readSessionToken(expired)).resolves.toBeNull();
  });

  it('rejects a valid signature with a payload that no longer matches the schema', async () => {
    const structurallyWrong = await new SignJWT({ role: 'wizard' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(user.id)
      .setIssuer('fan-commerce-demo')
      .setAudience('fan-commerce-web')
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(secret());

    await expect(readSessionToken(structurallyWrong)).resolves.toBeNull();
  });
});

describe('sessionCookieOptions()', () => {
  const requestOver = (url: string, headers: Record<string, string> = {}) =>
    new Request(url, { headers });

  it('is always httpOnly, SameSite=Lax and root-scoped', () => {
    const options = sessionCookieOptions(requestOver('https://fancommerce.dev/api/auth/login'));
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe('lax');
    expect(options.path).toBe('/');
    expect(options.maxAge).toBeGreaterThan(0);
  });

  it('sets Secure for an https request', () => {
    expect(sessionCookieOptions(requestOver('https://fancommerce.dev/x')).secure).toBe(true);
  });

  it('omits Secure over plain http, so the cookie is not silently dropped', () => {
    // The exact case that made a 200 login behave as though it never happened.
    expect(sessionCookieOptions(requestOver('http://127.0.0.1:3100/x')).secure).toBe(false);
  });

  it('trusts x-forwarded-proto when TLS is terminated upstream', () => {
    const behindProxy = requestOver('http://10.0.0.5/x', { 'x-forwarded-proto': 'https' });
    expect(sessionCookieOptions(behindProxy).secure).toBe(true);
  });

  it('uses the first value of a multi-hop x-forwarded-proto', () => {
    const multiHop = requestOver('http://10.0.0.5/x', { 'x-forwarded-proto': 'https, http' });
    expect(sessionCookieOptions(multiHop).secure).toBe(true);
  });
});
