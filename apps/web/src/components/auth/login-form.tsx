'use client';

import { useState } from 'react';

import { ApiError, loginRequestSchema, responseSchemas, routes } from '@fc/core';
import { Alert, Button, Card, Stack, TextField } from '@fc/ui';

import { apiClient } from '@/lib/api-client';
import { hardNavigate } from '@/lib/navigation';
import { useSessionStore } from '@/store/session-store';

const DEMO_ACCOUNTS = [
  { email: 'fan@fancommerce.dev', password: 'fanclub2026', label: 'Fan (Gold)' },
  { email: 'admin@fancommerce.dev', password: 'adminadmin', label: 'Admin' },
];

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const setSessionUser = useSessionStore((state) => state.setUser);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    // Validate with the same schema the server uses, so the user gets instant
    // feedback and the server stays the authority.
    const parsed = loginRequestSchema.safeParse({ email, password });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.map(String).join('.');
        next[key] ??= issue.message;
      }
      setFieldErrors(next);
      return;
    }
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const session = await apiClient.post(routes.login(), parsed.data, {
        schema: responseSchemas.session,
      });
      setSessionUser(session.user);

      /*
       * Deliberately a full document navigation, not router.replace().
       *
       * If the user got here by being bounced off /checkout, the client router
       * has already cached that route's RSC response — which was the proxy's
       * redirect back to /login. A soft navigation re-uses that cached
       * redirect and silently lands on /login again, with a perfectly valid
       * session. (`router.replace()` + `router.refresh()` does not fix it
       * either: refresh re-fetches the current route and cancels the
       * navigation.)
       *
       * A session change invalidates every cached RSC payload anyway, so
       * paying for one full load here is the honest trade.
       */
      hardNavigate(redirectTo);
    } catch (caught) {
      const error = ApiError.fromUnknown(caught);
      setFormError(error.message);
      setFieldErrors(error.fields);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Stack gap={4}>
      <Card>
        <form onSubmit={handleSubmit} noValidate>
          <Stack gap={4}>
            {formError ? (
              <Alert tone="danger" title="Đăng nhập thất bại">
                {formError}
              </Alert>
            ) : null}

            <TextField
              label="Email"
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              error={fieldErrors.email}
            />

            <TextField
              label="Mật khẩu"
              type="password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              error={fieldErrors.password}
            />

            <Button type="submit" size="lg" fullWidth isLoading={isSubmitting}>
              Đăng nhập
            </Button>
          </Stack>
        </form>
      </Card>

      <Card>
        <h2 className="mb-1 text-sm font-semibold">Tài khoản demo</h2>
        <p className="mb-3 text-xs text-[var(--fc-text-muted)]">
          Dữ liệu mẫu trong bộ nhớ, không có thông tin thật.
        </p>
        <ul className="flex flex-col gap-2">
          {DEMO_ACCOUNTS.map((account) => (
            <li key={account.email} className="flex items-center justify-between gap-3">
              <span className="text-sm">
                <span className="font-medium">{account.label}</span>{' '}
                <span className="text-[var(--fc-text-muted)]">{account.email}</span>
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setEmail(account.email);
                  setPassword(account.password);
                }}
              >
                Điền sẵn
              </Button>
            </li>
          ))}
        </ul>
      </Card>
    </Stack>
  );
}
