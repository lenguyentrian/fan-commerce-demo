/**
 * @jest-environment node
 */
import { ApiError } from '@fc/core';

import { clientKey, rateLimit } from './http';

describe('rateLimit()', () => {
  it('allows requests up to the limit', () => {
    const key = `test-${Math.random()}`;
    expect(() => {
      for (let i = 0; i < 5; i += 1) rateLimit(key, 5, 60_000);
    }).not.toThrow();
  });

  it('rejects the request past the limit with RESOURCE_EXHAUSTED', () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 3; i += 1) rateLimit(key, 3, 60_000);

    try {
      rateLimit(key, 3, 60_000);
      throw new Error('expected to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).code).toBe('RESOURCE_EXHAUSTED');
      expect((error as ApiError).status).toBe(429);
    }
  });

  it('counts each key independently', () => {
    const a = `a-${Math.random()}`;
    const b = `b-${Math.random()}`;

    rateLimit(a, 1, 60_000);
    expect(() => rateLimit(b, 1, 60_000)).not.toThrow();
    expect(() => rateLimit(a, 1, 60_000)).toThrow();
  });

  it('resets once the window expires', () => {
    const key = `window-${Math.random()}`;
    rateLimit(key, 1, 1); // 1ms window
    expect(() => rateLimit(key, 1, 1)).toThrow();

    jest.useFakeTimers();
    jest.setSystemTime(Date.now() + 50);
    expect(() => rateLimit(key, 1, 1)).not.toThrow();
    jest.useRealTimers();
  });
});

describe('clientKey()', () => {
  it('uses the first entry of x-forwarded-for', () => {
    const request = new Request('https://example.com', {
      headers: { 'x-forwarded-for': '203.0.113.7, 10.0.0.1' },
    });
    expect(clientKey(request, 'login')).toBe('login:203.0.113.7');
  });

  it('falls back when the header is absent', () => {
    expect(clientKey(new Request('https://example.com'), 'login')).toBe('login:local');
  });

  it('namespaces by scope so login and checkout do not share a budget', () => {
    const request = new Request('https://example.com', {
      headers: { 'x-forwarded-for': '203.0.113.7' },
    });
    expect(clientKey(request, 'login')).not.toBe(clientKey(request, 'checkout'));
  });
});
