import { z } from 'zod';

import { ApiClient } from './client';
import { ApiError } from './errors';
import { headers as headerNames } from './contract';

const schema = z.object({ ok: z.literal(true) });

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const noSleep = () => Promise.resolve();

describe('ApiClient happy path', () => {
  it('validates the response against the schema', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse({ ok: true }));
    const client = new ApiClient({ fetchImpl, sleep: noSleep });

    await expect(client.get('/api/ping', { schema })).resolves.toEqual({ ok: true });
  });

  it('attaches correlation headers to every request', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse({ ok: true }));
    const client = new ApiClient({ fetchImpl, appVersion: '1.2.3', platform: 'web', sleep: noSleep });

    await client.get('/api/ping', { schema });

    const sent = fetchImpl.mock.calls[0][1].headers as Record<string, string>;
    expect(sent[headerNames.appVersion]).toBe('1.2.3');
    expect(sent[headerNames.clientPlatform]).toBe('web');
    expect(sent[headerNames.requestId]).toMatch(/.+/);
  });

  it('sends an idempotency key when provided', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse({ ok: true }));
    const client = new ApiClient({ fetchImpl, sleep: noSleep });

    await client.post('/api/checkout', { a: 1 }, { schema, idempotencyKey: 'key-1' });

    const call = fetchImpl.mock.calls[0][1];
    expect((call.headers as Record<string, string>)[headerNames.idempotencyKey]).toBe('key-1');
    expect(call.body).toBe(JSON.stringify({ a: 1 }));
    expect((call.headers as Record<string, string>)['content-type']).toBe('application/json');
  });

  it('returns undefined for 204 without touching the schema', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const client = new ApiClient({ fetchImpl, sleep: noSleep });

    await expect(client.request('/api/logout', { method: 'POST' })).resolves.toBeUndefined();
  });
});

describe('ApiClient error mapping', () => {
  it('maps a structured error body to ApiError with fields', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(
      jsonResponse(
        { error: { code: 'INVALID_ARGUMENT', message: 'bad', fields: { email: 'required' } } },
        400,
      ),
    );
    const client = new ApiClient({ fetchImpl, sleep: noSleep });

    await expect(client.get('/api/x', { schema })).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
      fields: { email: 'required' },
    });
  });

  it('falls back to the status code when the body is not JSON', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValue(new Response('<html>gateway</html>', { status: 502 }));
    const client = new ApiClient({ fetchImpl, sleep: noSleep, maxRetries: 0 });

    await expect(client.get('/api/x', { schema })).rejects.toMatchObject({ code: 'INTERNAL' });
  });

  it('treats a schema mismatch as INTERNAL, not as valid data', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse({ ok: 'yes' }));
    const onSchemaMismatch = jest.fn();
    const client = new ApiClient({ fetchImpl, sleep: noSleep, onSchemaMismatch });

    await expect(client.get('/api/x', { schema })).rejects.toMatchObject({ code: 'INTERNAL' });
    // A broken contract is reported to the host, not swallowed and not logged
    // from inside this package.
    expect(onSchemaMismatch).toHaveBeenCalledWith('/api/x', expect.anything());
  });

  it('still fails closed when no mismatch handler is provided', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse({ ok: 'yes' }));
    const client = new ApiClient({ fetchImpl, sleep: noSleep });

    await expect(client.get('/api/x', { schema })).rejects.toMatchObject({ code: 'INTERNAL' });
  });

  it('calls onUnauthenticated once and does not retry a 401', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValue(jsonResponse({ error: { code: 'UNAUTHENTICATED', message: 'nope' } }, 401));
    const onUnauthenticated = jest.fn();
    const client = new ApiClient({ fetchImpl, onUnauthenticated, sleep: noSleep });

    await expect(client.get('/api/me', { schema })).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthenticated).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe('ApiClient retry policy', () => {
  it('retries a transient failure on GET and succeeds', async () => {
    const fetchImpl = jest
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    const client = new ApiClient({ fetchImpl, sleep: noSleep });

    await expect(client.get('/api/ping', { schema })).resolves.toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('gives up after maxRetries', async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    const client = new ApiClient({ fetchImpl, maxRetries: 2, sleep: noSleep });

    await expect(client.get('/api/ping', { schema })).rejects.toMatchObject({ code: 'UNAVAILABLE' });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('never retries a POST without an idempotency key', async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    const client = new ApiClient({ fetchImpl, sleep: noSleep });

    await expect(client.post('/api/orders', {}, { schema })).rejects.toMatchObject({
      code: 'UNAVAILABLE',
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('retries a POST that carries an idempotency key', async () => {
    const fetchImpl = jest
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    const client = new ApiClient({ fetchImpl, sleep: noSleep });

    await expect(
      client.post('/api/checkout', {}, { schema, idempotencyKey: 'key-1' }),
    ).resolves.toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('does not retry a non-transient 400', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValue(jsonResponse({ error: { code: 'INVALID_ARGUMENT', message: 'bad' } }, 400));
    const client = new ApiClient({ fetchImpl, sleep: noSleep });

    await expect(client.get('/api/x', { schema })).rejects.toBeInstanceOf(ApiError);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe('ApiClient deadline', () => {
  it('aborts and maps to DEADLINE_EXCEEDED', async () => {
    const fetchImpl = jest.fn(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener('abort', () =>
            reject(new DOMException('aborted', 'AbortError')),
          );
        }),
    ) as unknown as typeof fetch;

    const client = new ApiClient({ fetchImpl, timeoutMs: 10, maxRetries: 0, sleep: noSleep });

    await expect(client.get('/api/slow', { schema })).rejects.toMatchObject({
      code: 'DEADLINE_EXCEEDED',
    });
  });
});
