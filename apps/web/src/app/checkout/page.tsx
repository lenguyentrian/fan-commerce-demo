import type { Metadata } from 'next';

import { CheckoutForm } from '@/components/checkout/checkout-form';
import { requireUser } from '@/server/current-user';

export const metadata: Metadata = {
  title: 'Thanh toán',
  robots: { index: false, follow: false },
};

/**
 * Middleware already redirects anonymous users here, but the page calls
 * `requireUser()` too. Two layers on purpose: middleware is for UX, the
 * server-side check is the actual gate.
 */
export default async function CheckoutPage() {
  const user = await requireUser('fan');

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Thanh toán</h1>
      <CheckoutForm user={user} />
    </div>
  );
}
