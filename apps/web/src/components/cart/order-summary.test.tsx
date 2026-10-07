import { render, screen } from '@testing-library/react';

import { addLine, applyPromo, emptyCart, totals } from '@fc/core';

import { makeProduct } from '@/test/fixtures';

import { OrderSummary } from './order-summary';

describe('<OrderSummary />', () => {
  it('shows free shipping above the threshold and hides the discount row', () => {
    // 2 x 250.000 = 500.000 -> free shipping, no promo
    const cart = addLine(emptyCart, makeProduct(), 'v_m', 2);

    render(<OrderSummary totals={totals(cart)} />);

    expect(screen.getByText('Miễn phí')).toBeInTheDocument();
    expect(screen.queryByText('Giảm giá')).not.toBeInTheDocument();
    expect(screen.getByTestId('cart-total').textContent?.replace(/\D/g, '')).toBe('500000');
  });

  it('shows the promo label and the discounted total', () => {
    const cart = applyPromo(addLine(emptyCart, makeProduct(), 'v_m', 2), 'FAN10');

    render(<OrderSummary totals={totals(cart)} />);

    expect(screen.getByText('Fan Club -10%')).toBeInTheDocument();
    // 500.000 - 50.000 + 30.000 shipping = 480.000
    expect(screen.getByTestId('cart-total').textContent?.replace(/\D/g, '')).toBe('480000');
  });

  it('renders the footer slot', () => {
    render(<OrderSummary totals={totals(emptyCart)} footer={<button>Đặt hàng</button>} />);
    expect(screen.getByRole('button', { name: 'Đặt hàng' })).toBeInTheDocument();
  });
});
