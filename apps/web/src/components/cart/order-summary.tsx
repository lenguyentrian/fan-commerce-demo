import { formatMoney, type CartTotals } from '@fc/core';
import { Badge, Card } from '@fc/ui';

/** Shared by the cart and checkout pages so the two can never disagree. */
export function OrderSummary({
  totals,
  footer,
}: {
  totals: CartTotals;
  footer?: React.ReactNode;
}) {
  return (
    <Card>
      <h2 className="mb-4 font-semibold">Tóm tắt đơn hàng</h2>

      <dl className="flex flex-col gap-2 text-sm">
        <Row label="Tạm tính" value={formatMoney(totals.subtotal)} />

        {totals.discount.amount > 0 ? (
          <Row
            label={
              <span className="inline-flex items-center gap-2">
                Giảm giá
                {totals.promoLabel ? <Badge tone="brand">{totals.promoLabel}</Badge> : null}
              </span>
            }
            value={`−${formatMoney(totals.discount)}`}
            tone="success"
          />
        ) : null}

        <Row
          label="Phí vận chuyển"
          value={totals.freeShippingApplied ? 'Miễn phí' : formatMoney(totals.shipping)}
        />

        <div className="my-2 border-t border-[var(--fc-border)]" />

        <div className="flex items-baseline justify-between">
          <dt className="font-semibold">Tổng cộng</dt>
          <dd className="text-lg font-bold" data-testid="cart-total">
            {formatMoney(totals.total)}
          </dd>
        </div>
      </dl>

      {footer ? <div className="mt-5">{footer}</div> : null}
    </Card>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: React.ReactNode;
  value: string;
  tone?: 'success';
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-[var(--fc-text-muted)]">{label}</dt>
      <dd
        className={
          tone === 'success' ? 'font-medium text-[color:var(--color-success-500)]' : 'font-medium'
        }
      >
        {value}
      </dd>
    </div>
  );
}
