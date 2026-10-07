'use client';

import { useEffect } from 'react';

import { Alert, Button, Stack } from '@fc/ui';

/**
 * Route-level error boundary.
 *
 * Shows a recoverable message and a retry, and never renders `error.message`
 * directly — in production Next replaces it with a digest anyway, and echoing
 * raw server errors to the page is how internals leak.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Where a real app would report to Sentry/Crashlytics, keyed by digest.
    console.error('[route-error]', error.digest ?? error.name);
  }, [error]);

  return (
    <Stack gap={4} className="py-16">
      <Alert
        tone="danger"
        title="Đã có lỗi xảy ra"
        action={<Button onClick={reset}>Thử lại</Button>}
      >
        Không tải được nội dung này. Bạn có thể thử lại hoặc quay lại sau.
        {error.digest ? (
          <span className="mt-1 block text-xs opacity-70">Mã lỗi: {error.digest}</span>
        ) : null}
      </Alert>
    </Stack>
  );
}
