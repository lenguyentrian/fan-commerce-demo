import { ApiClient } from '@fc/core';

/**
 * Single browser-side client instance.
 *
 * One instance, not one per component: the retry policy, deadline and
 * correlation headers are configured once, the same way a Flutter app keeps a
 * single Dio instance rather than constructing one per repository.
 */
export const apiClient = new ApiClient({
  timeoutMs: 8_000,
  appVersion: process.env.NEXT_PUBLIC_APP_VERSION ?? '0.1.0',
  platform: 'web',
  maxRetries: 2,

  // @fc/core has no Node globals, so it cannot decide what "development"
  // means. A response that does not match its schema is a broken contract —
  // loud in development, an error-tracker report in production.
  onSchemaMismatch(path, issues) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(`[api] response schema mismatch for ${path}`, issues);
    }
  },
});
