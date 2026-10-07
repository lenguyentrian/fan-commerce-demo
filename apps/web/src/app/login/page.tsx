import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { safeRedirect } from '@fc/core';

import { LoginForm } from '@/components/auth/login-form';
import { getCurrentUser } from '@/server/current-user';

export const metadata: Metadata = {
  title: 'Đăng nhập',
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const { next } = await searchParams;
  // `next` comes from the URL, so it is sanitized before it is ever used as a
  // redirect target — otherwise /login?next=https://evil.com is an open redirect.
  const destination = safeRedirect(next, '/');

  // Already signed in? Skip the form.
  if (await getCurrentUser()) {
    redirect(destination);
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <h1 className="mb-2 text-2xl font-semibold">Đăng nhập</h1>
      <p className="mb-6 text-sm text-[var(--fc-text-muted)]">
        Cần đăng nhập để thanh toán và xem đơn hàng.
      </p>
      <LoginForm redirectTo={destination} />
    </div>
  );
}
