/**
 * Typed HTTP client.
 *
 * Responsibilities, deliberately in one place rather than per-call:
 *  - attach correlation headers (request id, app version, platform)
 *  - enforce a deadline on every request
 *  - normalize every failure into `ApiError`
 *  - validate the response against a Zod schema at the boundary
 *  - retry only transient failures, and only for idempotent methods
 *
 * This mirrors the Dio interceptor layer in the Flutter app so both clients
 * behave identically under a flaky network.
 */
import type { ZodType } from 'zod';

import { ApiError, apiErrorBodySchema, codeFromHttpStatus } from './errors';
import { headers as headerNames } from './contract';

export interface ApiClientOptions {
  /** Absolute base URL on the server, empty string in the browser. */
  baseUrl?: string;
  /** Per-request deadline in ms. */
  timeoutMs?: number;
  appVersion?: string;
  platform?: 'web' | 'ios' | 'android';
  /** Injected for tests; defaults to global fetch. */
  fetchImpl?: typeof fetch;
  /** Called on 401 so the app can clear its session state once, centrally. */
  onUnauthenticated?: () => void;
  maxRetries?: number;
  /** Injected so retry backoff does not make tests slow. */
  sleep?: (ms: number) => Promise<void>;
  /**
   * Called when a response does not match its schema — a broken API contract,
   * which is a bug rather than a user error. The host decides whether that is
   * a console warning in development or a report to an error tracker.
   */
  onSchemaMismatch?: (path: string, issues: unknown) => void;
}

export interface RequestOptions<T> {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  schema?: ZodType<T>;
  signal?: AbortSignal;
  idempotencyKey?: string;
  /** Next.js fetch cache hints; ignored by non-Next runtimes. */
  next?: { revalidate?: number | false; tags?: string[] };
  /**
   * Spelled out rather than using the DOM's `RequestCache` type: this package
   * compiles without the DOM lib so that it stays portable, and a
   * browser-only type would break that for one string union.
   */
  cache?: 'default' | 'no-store' | 'reload' | 'no-cache' | 'force-cache' | 'only-if-cached';
}

const IDEMPOTENT_METHODS = new Set(['GET', 'DELETE']);

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export class ApiClient {
  private readonly options: Required<
    Pick<ApiClientOptions, 'baseUrl' | 'timeoutMs' | 'appVersion' | 'platform' | 'maxRetries'>
  > &
    ApiClientOptions;

  constructor(options: ApiClientOptions = {}) {
    this.options = {
      baseUrl: options.baseUrl ?? '',
      timeoutMs: options.timeoutMs ?? 8_000,
      appVersion: options.appVersion ?? '0.1.0',
      platform: options.platform ?? 'web',
      maxRetries: options.maxRetries ?? 2,
      ...options,
    };
  }

  async request<T>(path: string, init: RequestOptions<T> = {}): Promise<T> {
    const method = init.method ?? 'GET';
    const canRetry = IDEMPOTENT_METHODS.has(method) || Boolean(init.idempotencyKey);
    const attempts = canRetry ? this.options.maxRetries + 1 : 1;

    let lastError: ApiError | undefined;

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        return await this.attempt<T>(path, init, method);
      } catch (caught) {
        const error = ApiError.fromUnknown(caught);
        lastError = error;

        if (error.requiresReauth) {
          this.options.onUnauthenticated?.();
          throw error;
        }
        if (!error.isRetryable || attempt === attempts - 1) {
          throw error;
        }
        // Exponential backoff: 150ms, 300ms, ...
        const sleep = this.options.sleep ?? defaultSleep;
        await sleep(150 * 2 ** attempt);
      }
    }

    throw lastError ?? new ApiError('INTERNAL', 'Request failed');
  }

  private async attempt<T>(
    path: string,
    init: RequestOptions<T>,
    method: string,
  ): Promise<T> {
    const fetchImpl = this.options.fetchImpl ?? fetch;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.options.timeoutMs);

    // Respect a caller-provided signal in addition to our deadline.
    const onCallerAbort = () => controller.abort();
    init.signal?.addEventListener('abort', onCallerAbort, { once: true });

    const requestHeaders: Record<string, string> = {
      accept: 'application/json',
      [headerNames.requestId]: newRequestId(),
      [headerNames.appVersion]: this.options.appVersion,
      [headerNames.clientPlatform]: this.options.platform,
    };
    if (init.body !== undefined) {
      requestHeaders['content-type'] = 'application/json';
    }
    if (init.idempotencyKey) {
      requestHeaders[headerNames.idempotencyKey] = init.idempotencyKey;
    }

    try {
      const response = await fetchImpl(`${this.options.baseUrl}${path}`, {
        method,
        headers: requestHeaders,
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
        signal: controller.signal,
        credentials: 'same-origin',
        ...(init.cache ? { cache: init.cache } : {}),
        ...(init.next ? ({ next: init.next } as Record<string, unknown>) : {}),
      });

      if (!response.ok) {
        throw await toApiError(response);
      }

      if (response.status === 204) {
        return undefined as T;
      }

      const json: unknown = await response.json();
      if (!init.schema) {
        return json as T;
      }

      const parsed = init.schema.safeParse(json);
      if (!parsed.success) {
        // A contract break is a bug, not a user error. Report it through the
        // injected hook rather than reading process.env here: this package has
        // no Node globals, so "am I in development?" is the host's question to
        // answer, not ours.
        this.options.onSchemaMismatch?.(path, parsed.error.issues);
        throw new ApiError('INTERNAL', 'Dữ liệu trả về không đúng định dạng.');
      }
      return parsed.data;
    } finally {
      clearTimeout(timer);
      init.signal?.removeEventListener('abort', onCallerAbort);
    }
  }

  get<T>(path: string, options: Omit<RequestOptions<T>, 'method' | 'body'> = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  post<T>(path: string, body: unknown, options: Omit<RequestOptions<T>, 'method' | 'body'> = {}) {
    return this.request<T>(path, { ...options, method: 'POST', body });
  }
}

async function toApiError(response: Response): Promise<ApiError> {
  const fallbackCode = codeFromHttpStatus(response.status);
  try {
    const body: unknown = await response.json();
    const parsed = apiErrorBodySchema.safeParse(body);
    if (parsed.success) {
      return new ApiError(parsed.data.error.code, parsed.data.error.message, parsed.data.error.fields);
    }
  } catch {
    // Non-JSON error body (proxy HTML page, empty 502, ...) — fall through.
  }
  return new ApiError(fallbackCode, defaultMessageFor(fallbackCode));
}

function defaultMessageFor(code: string): string {
  switch (code) {
    case 'UNAUTHENTICATED':
      return 'Phiên đăng nhập đã hết hạn.';
    case 'PERMISSION_DENIED':
      return 'Bạn không có quyền thực hiện thao tác này.';
    case 'NOT_FOUND':
      return 'Không tìm thấy dữ liệu.';
    case 'RESOURCE_EXHAUSTED':
      return 'Bạn thao tác quá nhanh. Vui lòng thử lại sau.';
    default:
      return 'Đã có lỗi xảy ra. Vui lòng thử lại.';
  }
}

export function newRequestId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
