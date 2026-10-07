import type { Metadata } from 'next';

import { CartView } from '@/components/cart/cart-view';

export const metadata: Metadata = {
  title: 'Giỏ hàng',
  robots: { index: false, follow: false },
};

export default function CartPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Giỏ hàng</h1>
      <CartView />
    </div>
  );
}
