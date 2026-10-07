'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { availableQuantity, isSoldOut, type Product } from '@fc/core';
import { Alert, Button, QuantityStepper, Stack } from '@fc/ui';

import { useCartError, useCartStore } from '@/store/cart-store';

/**
 * Variant picker + quantity + add-to-cart.
 *
 * The only client component on the product page — the rest is server-rendered,
 * so the JS shipped for this route stays small.
 */
export function AddToCart({ product }: { product: Product }) {
  const router = useRouter();
  const add = useCartStore((state) => state.add);
  const clearError = useCartStore((state) => state.clearError);
  const error = useCartError();

  const firstAvailable = product.variants.find((variant) => variant.stock !== 0);
  const [variantId, setVariantId] = useState(firstAvailable?.id ?? product.variants[0]!.id);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const selected = product.variants.find((variant) => variant.id === variantId);
  const soldOut = isSoldOut(product);
  const max = selected ? availableQuantity(selected) : 1;
  const variantSoldOut = selected?.stock === 0;

  function handleAdd() {
    clearError();
    // The header badge subscribes to the same store, so it updates on its
    // own — no router.refresh() needed, and none wanted: refreshing here
    // would re-fetch the page for a purely client-side state change.
    const ok = add(product, variantId, quantity);
    setAdded(ok);
  }

  if (soldOut) {
    return (
      <Alert tone="warning" title="Tạm hết hàng">
        Sản phẩm này đã hết. Theo dõi fanpage để biết lịch mở bán lại.
      </Alert>
    );
  }

  return (
    <Stack gap={4}>
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Phiên bản</legend>
        <div className="flex flex-wrap gap-2">
          {product.variants.map((variant) => {
            const out = variant.stock === 0;
            const isSelected = variant.id === variantId;

            return (
              <label
                key={variant.id}
                className={[
                  'relative inline-flex h-11 cursor-pointer items-center rounded-[var(--radius-control)] border px-4 text-sm transition-colors',
                  // The real <input> is invisible but full-size, so the focus
                  // ring has to be driven from the label.
                  'has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-[var(--fc-focus)]',
                  isSelected
                    ? 'border-brand-600 bg-brand-50 font-semibold text-brand-700'
                    : 'border-[var(--fc-border)] hover:bg-[var(--fc-surface-sunken)]',
                  out ? 'cursor-not-allowed line-through opacity-50' : '',
                ].join(' ')}
              >
                {/*
                  Transparent full-size input rather than `sr-only`: a clipped
                  1px control is unreachable by pointer (and by Playwright),
                  while opacity-0 over the whole label keeps the native radio
                  semantics, keyboard arrow-key navigation and the click target.
                */}
                <input
                  type="radio"
                  name="variant"
                  value={variant.id}
                  checked={isSelected}
                  disabled={out}
                  onChange={() => {
                    setVariantId(variant.id);
                    setQuantity(1);
                    setAdded(false);
                    clearError();
                  }}
                  className="absolute inset-0 cursor-pointer appearance-none opacity-0 disabled:cursor-not-allowed"
                />
                <span>{variant.label}</span>
                {out ? <span className="sr-only"> (hết hàng)</span> : null}
              </label>
            );
          })}
        </div>
      </fieldset>

      {selected?.stock != null && selected.stock > 0 && selected.stock <= 5 ? (
        <p role="status" className="text-sm font-medium text-[color:var(--color-warning-500)]">
          Chỉ còn {selected.stock} sản phẩm
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <QuantityStepper
          value={quantity}
          max={max}
          onChange={setQuantity}
          itemLabel={`${product.name}, ${selected?.label ?? ''}`}
          disabled={variantSoldOut}
        />
        <Button size="lg" onClick={handleAdd} disabled={variantSoldOut}>
          Thêm vào giỏ
        </Button>
      </div>

      {error ? (
        <Alert tone="danger" title="Không thêm được">
          {error.message}
        </Alert>
      ) : null}

      {added && !error ? (
        <Alert
          tone="success"
          action={
            <Button variant="secondary" size="sm" onClick={() => router.push('/cart')}>
              Xem giỏ hàng
            </Button>
          }
        >
          Đã thêm {quantity} × {product.name} ({selected?.label}) vào giỏ.
        </Alert>
      ) : null}
    </Stack>
  );
}
