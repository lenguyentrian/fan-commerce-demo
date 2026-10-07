/**
 * Route-handler plumbing: one place that turns thrown errors into responses.
 *
 * Without this, every handler grows its own try/catch and they slowly drift —
 * some leak stack traces, some return 200 with an error body. This is the same
 * reasoning as a centralised Dio interceptor on the mobile side.
 */
import { NextResponse } from 'next/server';
import { ZodError, type ZodType } from 'zod';

import { ApiError, fieldErrorsFromIssues } from '@fc/core';

export function jsonOk<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, init);
}

export function jsonError(error: ApiError): NextResponse {
  return NextResponse.json(error.toBody(), { status: error.status });
}

/**
 * Wraps a handler so that:
 *  - `ApiError` becomes its mapped status + safe body
 *  - `ZodError` becomes 400 with per-field messages
 *  - anything else becomes a generic 500, with the real error logged
 *    server-side only (never echoed to the client)
 */
export function withErrorHandling<Args extends unknown[]>(
  handler: (...args: Args) => Promise<NextResponse>,
): (...args: Args) => Promise<NextResponse> {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (caught) {
      if (caught instanceof ApiError) {
        return jsonError(caught);
      }
      if (caught instanceof ZodError) {
        return jsonError(
          new ApiError(
            'INVALID_ARGUMENT',
            'Dữ liệu không hợp lệ.',
            fieldErrorsFromIssues(caught.issues),
          ),
        );
      }
      // Logged server-side only; the client gets a generic message.
      console.error('[api] unhandled error', caught);
      return jsonError(new ApiError('INTERNAL', 'Đã có lỗi xảy ra. Vui lòng thử lại.'));
    }
  };
}

/** Parses a JSON body against a schema, converting failures into ApiError. */
export async function parseJsonBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new ApiError('INVALID_ARGUMENT', 'Body phải là JSON hợp lệ.');
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new ApiError(
      'INVALID_ARGUMENT',
      'Dữ liệu không hợp lệ.',
      fieldErrorsFromIssues(parsed.error.issues),
    );
  }
  return parsed.data;
}

/** Parses URL search params against a schema. */
export function parseSearchParams<T>(request: Request, schema: ZodType<T>): T {
  const url = new URL(request.url);
  const parsed = schema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) {
    throw new ApiError(
      'INVALID_ARGUMENT',
      'Tham số truy vấn không hợp lệ.',
      fieldErrorsFromIssues(parsed.error.issues),
    );
  }
  return parsed.data;
}

/**
 * Naive fixed-window rate limiter, per key, in memory.
 *
 * Enough to stop a trivial credential-stuffing loop against the demo login.
 * Explicitly NOT production-grade: a real deploy needs a shared store
 * (Redis) because this one resets per instance and per deployment.
 */
const windows = new Map<string, { count: number; resetAt: number }>();

/**
 * Limits are read from the environment with secure defaults.
 *
 * The reason is practical: the Playwright suite drives dozens of logins from a
 * single IP, which legitimately trips an 8-per-minute limit. Rather than
 * weakening the shipped default or special-casing "if test", the ceiling is a
 * config value that the E2E webServer raises (see playwright.config.ts).
 */
export const limits = {
  login: {
    max: Number(process.env.RATE_LIMIT_LOGIN_MAX ?? 8),
    windowMs: Number(process.env.RATE_LIMIT_LOGIN_WINDOW_MS ?? 60_000),
  },
  checkout: {
    max: Number(process.env.RATE_LIMIT_CHECKOUT_MAX ?? 10),
    windowMs: Number(process.env.RATE_LIMIT_CHECKOUT_WINDOW_MS ?? 60_000),
  },
} as const;

export function rateLimit(key: string, limit: number, windowMs: number): void {
  const now = Date.now();
  const entry = windows.get(key);

  if (!entry || entry.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  entry.count += 1;
  if (entry.count > limit) {
    throw new ApiError('RESOURCE_EXHAUSTED', 'Bạn thao tác quá nhanh. Vui lòng thử lại sau.');
  }
}

/** Best-effort client key for rate limiting. */
export function clientKey(request: Request, scope: string): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() ?? 'local';
  return `${scope}:${ip}`;
}
