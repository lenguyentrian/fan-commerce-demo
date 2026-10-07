'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  addLine,
  applyPromo,
  CartError,
  cartSchema,
  clearCart,
  emptyCart,
  itemCount,
  removeLine,
  setQuantity,
  totals,
  type Cart,
  type CartTotals,
  type Product,
} from '@fc/core';

/**
 * Cart store.
 *
 * The store holds state and surfaces errors; it does NOT contain cart rules.
 * Every mutation delegates to the pure functions in `@fc/core`, which is what
 * lets the rules be unit-tested without React and reused by the Flutter app
 * later (see docs/ROADMAP.md).
 */
export interface CartDisplayError {
  code: string;
  message: string;
}

interface CartState {
  cart: Cart;
  /** Last rejected action, for display. Cleared on the next successful one. */
  error: CartDisplayError | null;

  add: (product: Product, variantId: string, quantity?: number) => boolean;
  setLineQuantity: (productId: string, variantId: string, quantity: number, ceiling: number) => void;
  remove: (productId: string, variantId: string) => void;
  setPromo: (code: string | null) => void;
  reset: () => void;
  clearError: () => void;
}

const PERSIST_KEY = 'fc.cart.v1';

function toDisplayError(caught: unknown): CartDisplayError {
  if (caught instanceof CartError) {
    return { code: caught.code, message: caught.message };
  }
  return { code: 'UNKNOWN', message: 'Không thể cập nhật giỏ hàng.' };
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cart: emptyCart,
      error: null,

      add(product, variantId, quantity = 1) {
        try {
          set({ cart: addLine(get().cart, product, variantId, quantity), error: null });
          return true;
        } catch (caught) {
          set({ error: toDisplayError(caught) });
          return false;
        }
      },

      setLineQuantity(productId, variantId, quantity, ceiling) {
        try {
          set({
            cart: setQuantity(get().cart, productId, variantId, quantity, ceiling),
            error: null,
          });
        } catch (caught) {
          set({ error: toDisplayError(caught) });
        }
      },

      remove(productId, variantId) {
        set({ cart: removeLine(get().cart, productId, variantId), error: null });
      },

      setPromo(code) {
        const next = applyPromo(get().cart, code);
        set({
          cart: next,
          error:
            code && !next.promoCode
              ? { code: 'INVALID_PROMO', message: 'Mã giảm giá không hợp lệ.' }
              : null,
        });
      },

      reset() {
        set({ cart: clearCart(get().cart), error: null });
      },

      clearError() {
        set({ error: null });
      },
    }),
    {
      name: PERSIST_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ cart: state.cart }),
      version: 1,
      /**
       * Persisted state is untrusted input: a user — or a stale build from
       * before a schema change — can leave anything in localStorage. Validate
       * it and fall back to an empty cart instead of crashing the app on a
       * shape that no longer exists.
       */
      merge: (persisted, current) => {
        const parsed = cartSchema.safeParse((persisted as { cart?: unknown } | undefined)?.cart);
        return { ...current, cart: parsed.success ? parsed.data : emptyCart };
      },
    },
  ),
);

/* ---------- selectors ----------
 * Exported as hooks so each component subscribes to the narrowest slice it
 * needs. Subscribing to the whole store would re-render the header badge on
 * every keystroke in the promo field.
 */

export const useCart = (): Cart => useCartStore((state) => state.cart);
export const useCartError = (): CartDisplayError | null => useCartStore((state) => state.error);
export const useCartItemCount = (): number => useCartStore((state) => itemCount(state.cart));

/**
 * `totals()` returns a fresh object, so it must be memoized rather than
 * computed inside the selector — Zustand v5 compares with Object.is and would
 * re-render on every store read.
 */
export function useCartTotals(): CartTotals {
  const cart = useCart();
  return useMemo(() => totals(cart), [cart]);
}

/**
 * True once the persisted cart has been read from localStorage.
 *
 * Needed because the server renders an empty cart while the client renders the
 * stored one; showing the stored value before hydration finishes is a
 * hydration mismatch. Components render a skeleton until this flips.
 *
 * Implemented with `useSyncExternalStore` rather than useState + useEffect:
 * the server snapshot is explicitly `false`, and subscribing avoids the
 * cascading render that a setState-inside-an-effect would cause.
 */
export function useCartHydrated(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => useCartStore.persist.onFinishHydration(onStoreChange),
    () => useCartStore.persist.hasHydrated(),
    () => false,
  );
}
