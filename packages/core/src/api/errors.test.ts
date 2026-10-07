import {
  ApiError,
  apiErrorBodySchema,
  codeFromHttpStatus,
  fieldErrorsFromIssues,
  GRPC_STATUS_BY_CODE,
} from './errors';

describe('ApiError', () => {
  it('derives the HTTP status from the code', () => {
    expect(new ApiError('NOT_FOUND', 'nope').status).toBe(404);
    expect(new ApiError('UNAUTHENTICATED', 'nope').status).toBe(401);
  });

  it('marks only transient codes as retryable', () => {
    expect(new ApiError('UNAVAILABLE', 'x').isRetryable).toBe(true);
    expect(new ApiError('DEADLINE_EXCEEDED', 'x').isRetryable).toBe(true);
    expect(new ApiError('INVALID_ARGUMENT', 'x').isRetryable).toBe(false);
    expect(new ApiError('INTERNAL', 'x').isRetryable).toBe(false);
  });

  it('flags re-auth for 401 only', () => {
    expect(new ApiError('UNAUTHENTICATED', 'x').requiresReauth).toBe(true);
    expect(new ApiError('PERMISSION_DENIED', 'x').requiresReauth).toBe(false);
  });

  it('serializes to a body that matches the wire schema', () => {
    const body = new ApiError('INVALID_ARGUMENT', 'bad input', { email: 'required' }).toBody();
    expect(apiErrorBodySchema.parse(body)).toEqual(body);
    expect(body.error.fields).toEqual({ email: 'required' });
  });

  it('omits an empty fields object', () => {
    expect(new ApiError('INTERNAL', 'boom').toBody().error.fields).toBeUndefined();
  });
});

describe('ApiError.fromUnknown()', () => {
  it('passes ApiError through unchanged', () => {
    const original = new ApiError('NOT_FOUND', 'x');
    expect(ApiError.fromUnknown(original)).toBe(original);
  });

  it('maps an abort to DEADLINE_EXCEEDED', () => {
    const abort = new DOMException('aborted', 'AbortError');
    expect(ApiError.fromUnknown(abort).code).toBe('DEADLINE_EXCEEDED');
  });

  it('maps a fetch TypeError to UNAVAILABLE', () => {
    expect(ApiError.fromUnknown(new TypeError('Failed to fetch')).code).toBe('UNAVAILABLE');
  });

  it('falls back to INTERNAL without leaking the original message', () => {
    const mapped = ApiError.fromUnknown(new Error('secret db dsn leaked here'));
    expect(mapped.code).toBe('INTERNAL');
    expect(mapped.message).not.toContain('dsn');
  });
});

describe('codeFromHttpStatus()', () => {
  it.each([
    [400, 'INVALID_ARGUMENT'],
    [401, 'UNAUTHENTICATED'],
    [403, 'PERMISSION_DENIED'],
    [404, 'NOT_FOUND'],
    [409, 'ALREADY_EXISTS'],
    [429, 'RESOURCE_EXHAUSTED'],
    [418, 'INVALID_ARGUMENT'],
    [502, 'INTERNAL'],
  ])('%i -> %s', (status, expected) => {
    expect(codeFromHttpStatus(status)).toBe(expected);
  });
});

describe('gRPC mapping', () => {
  it('keeps the canonical gRPC numbers', () => {
    expect(GRPC_STATUS_BY_CODE.UNAUTHENTICATED).toBe(16);
    expect(GRPC_STATUS_BY_CODE.NOT_FOUND).toBe(5);
  });
});

describe('fieldErrorsFromIssues()', () => {
  it('joins nested paths and keeps the first message per field', () => {
    expect(
      fieldErrorsFromIssues([
        { path: ['shippingAddress', 'phone'], message: 'invalid' },
        { path: ['shippingAddress', 'phone'], message: 'also invalid' },
        { path: [], message: 'root problem' },
      ]),
    ).toEqual({
      'shippingAddress.phone': 'invalid',
      _root: 'root problem',
    });
  });
});
