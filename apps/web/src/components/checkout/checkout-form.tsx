'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

import {
  ApiError,
  PAYMENT_METHODS,
  responseSchemas,
  routes,
  shippingAddressSchema,
  type PaymentMethod,
  type SessionUser,
} from '@fc/core';
import { Alert, Button, Card, SelectField, Stack, TextField } from '@fc/ui';

import { OrderSummary } from '@/components/cart/order-summary';
import { apiClient } from '@/lib/api-client';
import { hardNavigate } from '@/lib/navigation';
import { useCart, useCartHydrated, useCartStore, useCartTotals } from '@/store/cart-store';

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  card: 'Thẻ quốc tế (Visa/Master)',
  momo: 'Ví MoMo',
  vnpay: 'VNPAY-QR',
  cod: 'Thanh toán khi nhận hàng',
};

export function CheckoutForm({ user }: { user: SessionUser }) {
  const router = useRouter();
  const hydrated = useCartHydrated();
  const cart = useCart();
  const totals = useCartTotals();
  const resetCart = useCartStore((state) => state.reset);

  const [form, setForm] = useState({
    fullName: user.displayName,
    phone: '',
    line1: '',
    ward: '',
    city: '',
    note: '',
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('momo');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Generated once per mounted form, not per submit.
   *
   * That is the whole point: if the first POST times out and the user taps Pay
   * again, the retry carries the SAME key, so the server returns the original
   * order instead of charging twice.
   */
  const idempotencyKey = useRef(crypto.randomUUID());

  function update(field: keyof typeof form, value: string) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    const address = shippingAddressSchema.safeParse({
      ...form,
      note: form.note.trim() === '' ? undefined : form.note,
    });

    if (!address.success) {
      const next: Record<string, string> = {};
      for (const issue of address.error.issues) {
        next[issue.path.map(String).join('.')] ??= issue.message;
      }
      setFieldErrors(next);
      // Move focus to the first invalid control so keyboard and screen-reader
      // users are not left guessing where the error is.
      const firstKey = Object.keys(next)[0];
      if (firstKey) {
        document.querySelector<HTMLElement>(`[name="${firstKey}"]`)?.focus();
      }
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const order = await apiClient.post(
        routes.checkout(),
        {
          lines: cart.lines,
          promoCode: cart.promoCode,
          paymentMethod,
          shippingAddress: address.data,
          idempotencyKey: idempotencyKey.current,
        },
        { schema: responseSchemas.order, idempotencyKey: idempotencyKey.current },
      );

      resetCart();
      hardNavigate(`/orders?placed=${order.code}`);
    } catch (caught) {
      const error = ApiError.fromUnknown(caught);
      setFormError(error.message);
      setFieldErrors(stripAddressPrefix(error.fields));
      if (error.requiresReauth) {
        router.replace('/login?next=/checkout');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (hydrated && cart.lines.length === 0) {
    return (
      <Alert
        tone="warning"
        title="Giỏ hàng trống"
        action={<Button onClick={() => router.push('/products')}>Xem sản phẩm</Button>}
      >
        Thêm sản phẩm trước khi thanh toán.
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-start">
      <Stack gap={4}>
        {formError ? (
          <Alert tone="danger" title="Không đặt được đơn">
            {formError}
          </Alert>
        ) : null}

        <Card>
          <h2 className="mb-4 font-semibold">Địa chỉ nhận hàng</h2>
          <Stack gap={4}>
            <TextField
              label="Họ và tên"
              name="fullName"
              required
              autoComplete="name"
              value={form.fullName}
              onChange={(event) => update('fullName', event.target.value)}
              error={fieldErrors.fullName}
            />
            <TextField
              label="Số điện thoại"
              name="phone"
              type="tel"
              inputMode="tel"
              required
              autoComplete="tel"
              placeholder="0901234567"
              value={form.phone}
              onChange={(event) => update('phone', event.target.value)}
              error={fieldErrors.phone}
            />
            <TextField
              label="Địa chỉ"
              name="line1"
              required
              autoComplete="street-address"
              value={form.line1}
              onChange={(event) => update('line1', event.target.value)}
              error={fieldErrors.line1}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Phường/Xã"
                name="ward"
                required
                value={form.ward}
                onChange={(event) => update('ward', event.target.value)}
                error={fieldErrors.ward}
              />
              <TextField
                label="Tỉnh/Thành phố"
                name="city"
                required
                autoComplete="address-level1"
                value={form.city}
                onChange={(event) => update('city', event.target.value)}
                error={fieldErrors.city}
              />
            </div>
            <TextField
              label="Ghi chú"
              name="note"
              value={form.note}
              onChange={(event) => update('note', event.target.value)}
              hint="Không bắt buộc. Tối đa 300 ký tự."
              error={fieldErrors.note}
            />
          </Stack>
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold">Phương thức thanh toán</h2>
          <SelectField
            label="Chọn phương thức"
            name="paymentMethod"
            value={paymentMethod}
            onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
            options={PAYMENT_METHODS.map((method) => ({
              value: method,
              label: PAYMENT_LABELS[method],
            }))}
          />
          <p className="mt-3 text-xs text-[var(--fc-text-muted)]">
            Demo không kết nối cổng thanh toán thật. Đơn hàng được ghi nhận ngay, trừ COD ở trạng
            thái chờ.
          </p>
        </Card>
      </Stack>

      <OrderSummary
        totals={totals}
        footer={
          <Button type="submit" fullWidth size="lg" isLoading={isSubmitting}>
            Đặt hàng
          </Button>
        }
      />
    </form>
  );
}

/**
 * The server reports address problems as `shippingAddress.phone`; the form
 * inputs are named `phone`. Map one onto the other instead of renaming every
 * input, so the API contract stays explicit about which object was invalid.
 */
function stripAddressPrefix(fields: Readonly<Record<string, string>>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, message] of Object.entries(fields)) {
    result[key.replace(/^shippingAddress\./, '')] = message;
  }
  return result;
}
