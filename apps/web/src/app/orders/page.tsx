import type { Metadata } from 'next';

import { formatMoney, orderStatusLabel, type OrderStatus } from '@fc/core';
import { Alert, Badge, Card, EmptyState, Stack } from '@fc/ui';

import { requireUser } from '@/server/current-user';
import { listOrders } from '@/server/orders';

export const metadata: Metadata = {
  title: 'Đơn hàng của tôi',
  robots: { index: false, follow: false },
};

const STATUS_TONE: Record<OrderStatus, 'neutral' | 'brand' | 'success' | 'warning' | 'danger'> = {
  pending: 'warning',
  paid: 'success',
  failed: 'danger',
  cancelled: 'neutral',
  fulfilled: 'brand',
};

interface PageProps {
  searchParams: Promise<{ placed?: string }>;
}

/**
 * Server-rendered from the session user's own orders. Dynamic by necessity:
 * the response is per-user, so it must never be cached at the CDN.
 */
export default async function OrdersPage({ searchParams }: PageProps) {
  const user = await requireUser('fan');
  const { placed } = await searchParams;
  const orders = listOrders(user.id);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Đơn hàng của tôi</h1>

      {placed ? (
        <Alert tone="success" title="Đặt hàng thành công">
          Mã đơn <strong>{placed}</strong>. Thông tin chi tiết hiển thị bên dưới.
        </Alert>
      ) : null}

      {orders.length === 0 ? (
        <EmptyState
          title="Chưa có đơn hàng"
          description="Đơn hàng sẽ xuất hiện ở đây sau khi bạn thanh toán."
        />
      ) : (
        <Stack gap={4}>
          {orders.map((order) => (
            <Card as="article" key={order.id}>
              <header className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{order.code}</h2>
                  <p className="text-sm text-[var(--fc-text-muted)]">
                    <time dateTime={order.createdAt}>
                      {new Date(order.createdAt).toLocaleString('vi-VN')}
                    </time>
                  </p>
                </div>
                <Badge tone={STATUS_TONE[order.status]}>{orderStatusLabel(order.status)}</Badge>
              </header>

              <ul className="mt-4 flex flex-col gap-2 border-t border-[var(--fc-border)] pt-4">
                {order.lines.map((line) => (
                  <li
                    key={`${line.productId}-${line.variantId}`}
                    className="flex flex-wrap justify-between gap-2 text-sm"
                  >
                    <span>
                      {line.quantity} × {line.name}{' '}
                      <span className="text-[var(--fc-text-muted)]">({line.variantLabel})</span>
                    </span>
                    <span className="font-medium">
                      {formatMoney({
                        amount: line.unitPrice.amount * line.quantity,
                        currency: line.unitPrice.currency,
                      })}
                    </span>
                  </li>
                ))}
              </ul>

              <dl className="mt-4 flex flex-col gap-1 border-t border-[var(--fc-border)] pt-4 text-sm">
                {order.discount.amount > 0 ? (
                  <div className="flex justify-between">
                    <dt className="text-[var(--fc-text-muted)]">
                      Giảm giá {order.promoCode ? `(${order.promoCode})` : ''}
                    </dt>
                    <dd className="text-[color:var(--color-success-500)]">
                      −{formatMoney(order.discount)}
                    </dd>
                  </div>
                ) : null}
                <div className="flex justify-between">
                  <dt className="text-[var(--fc-text-muted)]">Vận chuyển</dt>
                  <dd>
                    {order.shipping.amount === 0 ? 'Miễn phí' : formatMoney(order.shipping)}
                  </dd>
                </div>
                <div className="flex justify-between font-semibold">
                  <dt>Tổng cộng</dt>
                  <dd>{formatMoney(order.total)}</dd>
                </div>
              </dl>

              <footer className="mt-4 text-sm text-[var(--fc-text-muted)]">
                Giao tới: {order.shippingAddress.fullName}, {order.shippingAddress.line1},{' '}
                {order.shippingAddress.ward}, {order.shippingAddress.city}
              </footer>
            </Card>
          ))}
        </Stack>
      )}
    </div>
  );
}
