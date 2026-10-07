import { act } from '@testing-library/react';

import { emptyCart, itemCount, totals } from '@fc/core';

import { makeProduct } from '@/test/fixtures';

import { useCartStore } from './cart-store';

function resetStore() {
  act(() => {
    useCartStore.setState({ cart: emptyCart, error: null });
  });
}

describe('cart store', () => {
  beforeEach(resetStore);

  it('adds a product and reports success', () => {
    let ok = false;
    act(() => {
      ok = useCartStore.getState().add(makeProduct(), 'v_m', 2);
    });

    expect(ok).toBe(true);
    expect(itemCount(useCartStore.getState().cart)).toBe(2);
    expect(useCartStore.getState().error).toBeNull();
  });

  it('surfaces a domain error instead of throwing', () => {
    let ok = true;
    act(() => {
      ok = useCartStore.getState().add(makeProduct(), 'v_l'); // stock 0
    });

    expect(ok).toBe(false);
    expect(useCartStore.getState().error).toMatchObject({ code: 'SOLD_OUT' });
    expect(useCartStore.getState().cart.lines).toHaveLength(0);
  });

  it('clears a previous error after a successful action', () => {
    act(() => {
      useCartStore.getState().add(makeProduct(), 'v_l');
    });
    expect(useCartStore.getState().error).not.toBeNull();

    act(() => {
      useCartStore.getState().add(makeProduct(), 'v_m');
    });
    expect(useCartStore.getState().error).toBeNull();
  });

  it('rejects a quantity above the ceiling and keeps the old value', () => {
    act(() => {
      useCartStore.getState().add(makeProduct(), 'v_m', 2);
      useCartStore.getState().setLineQuantity('p_test', 'v_m', 99, 4);
    });

    expect(useCartStore.getState().cart.lines[0]?.quantity).toBe(2);
    expect(useCartStore.getState().error).toMatchObject({ code: 'QUANTITY_EXCEEDED' });
  });

  it('removes a line', () => {
    act(() => {
      useCartStore.getState().add(makeProduct(), 'v_m');
      useCartStore.getState().remove('p_test', 'v_m');
    });

    expect(useCartStore.getState().cart.lines).toHaveLength(0);
  });

  it('accepts a known promo code and recomputes the total', () => {
    act(() => {
      useCartStore.getState().add(makeProduct(), 'v_m', 2); // 500.000
      useCartStore.getState().setPromo('fan10');
    });

    const state = useCartStore.getState();
    expect(state.cart.promoCode).toBe('FAN10');
    expect(state.error).toBeNull();
    // 500.000 - 10% = 450.000, below the free-shipping threshold -> +30.000
    expect(totals(state.cart).total.amount).toBe(480_000);
  });

  it('reports an unknown promo code', () => {
    act(() => {
      useCartStore.getState().setPromo('NOPE');
    });

    expect(useCartStore.getState().cart.promoCode).toBeNull();
    expect(useCartStore.getState().error).toMatchObject({ code: 'INVALID_PROMO' });
  });

  it('reset() empties the lines but keeps the promo', () => {
    act(() => {
      useCartStore.getState().add(makeProduct(), 'v_m');
      useCartStore.getState().setPromo('FAN10');
      useCartStore.getState().reset();
    });

    const state = useCartStore.getState();
    expect(state.cart.lines).toHaveLength(0);
    expect(state.cart.promoCode).toBe('FAN10');
  });

  it('clearError() only clears the error', () => {
    act(() => {
      useCartStore.getState().add(makeProduct(), 'v_l');
      useCartStore.getState().clearError();
    });

    expect(useCartStore.getState().error).toBeNull();
  });
});
