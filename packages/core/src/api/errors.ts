/**
 * One error shape for the whole product.
 *
 * `ApiErrorCode` is intentionally transport-agnostic: it maps to HTTP status
 * codes today and to gRPC status codes if/when a service moves to gRPC
 * (see proto/README.md). UI code switches on the code, never on the status
 * number, so swapping transports does not touch the presentation layer.
 */
import { z } from 'zod';

export const API_ERROR_CODES = [
  'INVALID_ARGUMENT',
  'UNAUTHENTICATED',
  'PERMISSION_DENIED',
  'NOT_FOUND',
  'ALREADY_EXISTS',
  'RESOURCE_EXHAUSTED',
  'DEADLINE_EXCEEDED',
  'UNAVAILABLE',
  'INTERNAL',
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export const HTTP_STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  INVALID_ARGUMENT: 400,
  UNAUTHENTICATED: 401,
  PERMISSION_DENIED: 403,
  NOT_FOUND: 404,
  ALREADY_EXISTS: 409,
  RESOURCE_EXHAUSTED: 429,
  DEADLINE_EXCEEDED: 504,
  UNAVAILABLE: 503,
  INTERNAL: 500,
};

/** gRPC status numbers for the same codes — handy when porting to gRPC. */
export const GRPC_STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  INVALID_ARGUMENT: 3,
  UNAUTHENTICATED: 16,
  PERMISSION_DENIED: 7,
  NOT_FOUND: 5,
  ALREADY_EXISTS: 6,
  RESOURCE_EXHAUSTED: 8,
  DEADLINE_EXCEEDED: 4,
  UNAVAILABLE: 14,
  INTERNAL: 13,
};

const CODE_BY_HTTP_STATUS = new Map<number, ApiErrorCode>(
  Object.entries(HTTP_STATUS_BY_CODE).map(([code, status]) => [status, code as ApiErrorCode]),
);

export function codeFromHttpStatus(status: number): ApiErrorCode {
  const mapped = CODE_BY_HTTP_STATUS.get(status);
  if (mapped) return mapped;
  if (status >= 500) return 'INTERNAL';
  if (status >= 400) return 'INVALID_ARGUMENT';
  return 'INTERNAL';
}

export const apiErrorBodySchema = z.object({
  error: z.object({
    code: z.enum(API_ERROR_CODES),
    /** Safe to render to the user. Never contains internals or stack traces. */
    message: z.string(),
    /** Field-level validation messages, keyed by field path. */
    fields: z.record(z.string(), z.string()).optional(),
  }),
});

export type ApiErrorBody = z.infer<typeof apiErrorBodySchema>;

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly fields: Readonly<Record<string, string>>;

  constructor(code: ApiErrorCode, message: string, fields: Record<string, string> = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = HTTP_STATUS_BY_CODE[code];
    this.fields = fields;
  }

  /** Retry is only safe for transient codes AND idempotent operations. */
  get isRetryable(): boolean {
    return this.code === 'UNAVAILABLE' || this.code === 'DEADLINE_EXCEEDED';
  }

  get requiresReauth(): boolean {
    return this.code === 'UNAUTHENTICATED';
  }

  toBody(): ApiErrorBody {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(Object.keys(this.fields).length > 0 ? { fields: this.fields } : {}),
      },
    };
  }

  static fromUnknown(cause: unknown): ApiError {
    if (cause instanceof ApiError) return cause;
    if (cause instanceof DOMException && cause.name === 'AbortError') {
      return new ApiError('DEADLINE_EXCEEDED', 'Yêu cầu quá thời gian. Vui lòng thử lại.');
    }
    if (cause instanceof TypeError) {
      // fetch() rejects with TypeError on network failure.
      return new ApiError('UNAVAILABLE', 'Không kết nối được tới máy chủ.');
    }
    return new ApiError('INTERNAL', 'Đã có lỗi xảy ra. Vui lòng thử lại.');
  }
}

/**
 * Turns a ZodError-ish issue list into field messages for form display.
 * Accepts the shape rather than the class so this file stays import-light.
 */
export function fieldErrorsFromIssues(
  issues: ReadonlyArray<{ path: ReadonlyArray<string | number | symbol>; message: string }>,
): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join('.') || '_root';
    fields[key] ??= issue.message;
  }
  return fields;
}
