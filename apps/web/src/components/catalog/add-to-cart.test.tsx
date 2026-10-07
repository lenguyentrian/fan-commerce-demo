import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { emptyCart } from '@fc/core';

import { useCartStore } from '@/store/cart-store';
import { makeProduct } from '@/test/fixtures';

import { AddToCart } from './add-to-cart';

const push = jest.fn();
const refresh = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh, replace: jest.fn() }),
}));

beforeEach(() => {
  useCartStore.setState({ cart: emptyCart, error: null });
});

describe('<AddToCart />', () => {
  it('preselects the first in-stock variant, skipping sold-out ones', () => {
    const product = makeProduct({
      variants: [
        { id: 'v_s', label: 'S', stock: 0 },
        { id: 'v_m', label: 'M', stock: 5 },
      ],
    });

    render(<AddToCart product={product} />);

    expect(screen.getByRole('radio', { name: /^M$/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /S \(hết hàng\)/ })).toBeDisabled();
  });

  it('adds the selected variant and quantity to the cart', async () => {
    const user = userEvent.setup();
    render(<AddToCart product={makeProduct()} />);

    await user.click(screen.getByRole('button', { name: /Tăng số lượng/ }));
    await user.click(screen.getByRole('button', { name: 'Thêm vào giỏ' }));

    const lines = useCartStore.getState().cart.lines;
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ variantId: 'v_m', quantity: 2 });
    expect(screen.getByText(/Đã thêm 2 ×/)).toBeInTheDocument();
  });

  it('does not trigger a router refresh for a client-only state change', async () => {
    const user = userEvent.setup();
    render(<AddToCart product={makeProduct()} />);

    await user.click(screen.getByRole('button', { name: 'Thêm vào giỏ' }));

    // The header badge reads the same store, so re-fetching the page would be
    // wasted work. Asserted because it is easy to add back by reflex.
    expect(refresh).not.toHaveBeenCalled();
  });

  it('caps the stepper at the available stock', async () => {
    const user = userEvent.setup();
    // v_m has stock 4
    render(<AddToCart product={makeProduct()} />);

    const increase = screen.getByRole('button', { name: /Tăng số lượng/ });
    await user.click(increase);
    await user.click(increase);
    await user.click(increase);

    expect(screen.getByRole('spinbutton', { name: /Số lượng/ })).toHaveValue(4);
    expect(increase).toBeDisabled();
  });

  it('warns when stock is low', () => {
    render(<AddToCart product={makeProduct()} />);
    expect(screen.getByRole('status')).toHaveTextContent('Chỉ còn 4 sản phẩm');
  });

  it('shows a sold-out notice instead of the form when nothing is available', () => {
    const product = makeProduct({ variants: [{ id: 'v_m', label: 'M', stock: 0 }] });

    render(<AddToCart product={product} />);

    expect(screen.getByRole('status')).toHaveTextContent(/Tạm hết hàng/);
    expect(screen.queryByRole('button', { name: 'Thêm vào giỏ' })).not.toBeInTheDocument();
  });

  it('resets the quantity when the variant changes', async () => {
    const user = userEvent.setup();
    const product = makeProduct({
      variants: [
        { id: 'v_m', label: 'M', stock: 5 },
        { id: 'v_xl', label: 'XL', stock: 5 },
      ],
    });

    render(<AddToCart product={product} />);

    await user.click(screen.getByRole('button', { name: /Tăng số lượng/ }));
    expect(screen.getByRole('spinbutton', { name: /Số lượng/ })).toHaveValue(2);

    await user.click(screen.getByRole('radio', { name: /^XL$/ }));
    expect(screen.getByRole('spinbutton', { name: /Số lượng/ })).toHaveValue(1);
  });
});
