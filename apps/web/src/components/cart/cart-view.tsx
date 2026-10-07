'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { formatMoney, MAX_QUANTITY_PER_LINE, money } from '@fc/core';
import {
  Alert,
  Button,
  Card,
  EmptyState,
  QuantityStepper,
  Skeleton,
  Stack,
  TextField,
} from '@fc/ui';

import {
  useCart,
  useCartError,
  useCartHydrated,
  useCartStore,
  useCartTotals,
} from '@/store/cart-store';

import { OrderSummary } from './order-summary';

export function CartView() {
  const hydrated = useCartHydrated();
  const cart = useCart();
  const totals = useCartTotals();
  const error = useCartError();
  const router = useRouter();

  const setLineQuantity = useCartStore((state) => state.setLineQuantity);
  const remove = useCartStore((state) => state.remove);
  const setPromo = useCartStore((state) => state.setPromo);

  const [promoInput, setPromoInput] = useState(cart.promoCode ?? '');

  // The cart lives in localStorage, so the server cannot know it. Show a
  // skeleton rather than flashing "empty cart" and then the real contents.
  if (!hydrated) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <Stack gap={3}>
          <Skeleton className="h-28 w-full" label="Đang tải giỏ hàng" />
          <Skeleton className="h-28 w-full" label="" />
        </Stack>
        <Skeleton className="h-64 w-full" label="" />
      </div>
    );
  }

  if (cart.lines.length === 0) {
    return (
      <EmptyState
        title="Giỏ hàng đang trống"
        description="Thêm merch, vé hoặc membership để tiếp tục."
        action={
          <Button onClick={() => router.push('/products')}>Xem sản phẩm</Button>
        }
      />
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-start">
      <Stack gap={3}>
        {error ? (
          <Alert tone="danger" title="Không cập nhật được">
            {error.message}
          </Alert>
        ) : null}

        <ul className="flex flex-col gap-3">
          {cart.lines.map((line) => (
            <Card as="li" key={`${line.productId}-${line.variantId}`}>
              <div className="flex gap-4">
                <Link
                  href={`/products/${line.slug}`}
                  className="relative size-20 shrink-0 overflow-hidden rounded-[var(--radius-control)] bg-[var(--fc-surface-sunken)]"
                >
                  <Image
                    src={line.imageUrl}
                    alt=""
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </Link>

                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        href={`/products/${line.slug}`}
                        className="font-medium hover:text-brand-600"
                      >
                        {line.name}
                      </Link>
                      <p className="text-sm text-[var(--fc-text-muted)]">{line.variantLabel}</p>
                    </div>
                    <p className="font-semibold whitespace-nowrap">
                      {formatMoney(money(line.unitPrice.amount * line.quantity, line.unitPrice.currency))}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <QuantityControl
                      value={line.quantity}
                      onChange={(next) =>
                        setLineQuantity(
                          line.productId,
                          line.variantId,
                          next,
                          MAX_QUANTITY_PER_LINE,
                        )
                      }
                      itemLabel={`${line.name}, ${line.variantLabel}`}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(line.productId, line.variantId)}
                    >
                      Xoá
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </ul>

        <Card>
          <form
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
            onSubmit={(event) => {
              event.preventDefault();
              setPromo(promoInput || null);
            }}
          >
            <div className="flex-1">
              <TextField
                label="Mã giảm giá"
                value={promoInput}
                onChange={(event) => setPromoInput(event.target.value)}
                placeholder="FAN10"
                hint="Thử FAN10 hoặc VAC15."
                autoCapitalize="characters"
                error={error?.code === 'INVALID_PROMO' ? error.message : undefined}
              />
            </div>
            <Button type="submit" variant="secondary">
              Áp dụng
            </Button>
          </form>
        </Card>
      </Stack>

      <OrderSummary
        totals={totals}
        footer={
          <Button fullWidth size="lg" onClick={() => router.push('/checkout')}>
            Tiến hành thanh toán
          </Button>
        }
      />
    </div>
  );
}

/** Thin wrapper so a cart row does not have to repeat the stepper's props. */
function QuantityControl({
  value,
  onChange,
  itemLabel,
}: {
  value: number;
  onChange: (next: number) => void;
  itemLabel: string;
}) {
  return (
    <QuantityStepper
      value={value}
      max={MAX_QUANTITY_PER_LINE}
      onChange={onChange}
      itemLabel={itemLabel}
    />
  );
}
