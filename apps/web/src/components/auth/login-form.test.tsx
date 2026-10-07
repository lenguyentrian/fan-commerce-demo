import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ApiError } from '@fc/core';

import { useSessionStore } from '@/store/session-store';

import { LoginForm } from './login-form';

const replace = jest.fn();
const refresh = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace, refresh, push: jest.fn() }),
}));

/**
 * A full-document navigation cannot happen in jsdom, so the one module that
 * performs it is mocked. Mocking the module instead of `window.location` keeps
 * this working across jsdom versions, where `location` is non-configurable.
 */
const assign = jest.fn();
jest.mock('@/lib/navigation', () => ({
  hardNavigate: (url: string) => assign(url),
}));

const post = jest.fn();
jest.mock('@/lib/api-client', () => ({
  apiClient: {
    post: (...args: unknown[]) => post(...args),
  },
}));

beforeEach(() => {
  post.mockReset();
  replace.mockReset();
  assign.mockReset();
  useSessionStore.setState({ user: null, status: 'idle' });
});

describe('<LoginForm />', () => {
  it('validates client-side before calling the API', async () => {
    const user = userEvent.setup();
    render(<LoginForm redirectTo="/orders" />);

    await user.type(screen.getByLabelText(/Email/), 'not-an-email');
    await user.type(screen.getByLabelText(/Mật khẩu/), 'short');
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    expect(post).not.toHaveBeenCalled();
    expect(await screen.findByText(/Email không hợp lệ/)).toBeInTheDocument();
    expect(screen.getByText(/Mật khẩu tối thiểu 8 ký tự/)).toBeInTheDocument();
  });

  it('wires the error to the input via aria-invalid', async () => {
    const user = userEvent.setup();
    render(<LoginForm redirectTo="/" />);

    await user.type(screen.getByLabelText(/Email/), 'bad');
    await user.type(screen.getByLabelText(/Mật khẩu/), 'longenough');
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    await waitFor(() => {
      expect(screen.getByLabelText(/Email/)).toHaveAttribute('aria-invalid', 'true');
    });
  });

  it('does a full navigation to the requested destination on success', async () => {
    const user = userEvent.setup();
    post.mockResolvedValue({
      user: { id: 'u_1', email: 'fan@fancommerce.dev', displayName: 'Fan', role: 'fan', tier: 'gold' },
    });

    render(<LoginForm redirectTo="/checkout" />);

    await user.type(screen.getByLabelText(/Email/), 'fan@fancommerce.dev');
    await user.type(screen.getByLabelText(/Mật khẩu/), 'fanclub2026');
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    await waitFor(() => {
      expect(assign).toHaveBeenCalledWith('/checkout');
    });

    // A soft navigation would re-use the router cache entry for /checkout,
    // which is the proxy's redirect back to /login. Asserted so the
    // "optimisation" of switching back to router.replace() fails loudly.
    expect(replace).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
    expect(useSessionStore.getState().user).toMatchObject({ id: 'u_1' });
  });

  it('shows the server message without leaking which field was wrong', async () => {
    const user = userEvent.setup();
    post.mockRejectedValue(new ApiError('UNAUTHENTICATED', 'Email hoặc mật khẩu không đúng.'));

    render(<LoginForm redirectTo="/" />);

    await user.type(screen.getByLabelText(/Email/), 'fan@fancommerce.dev');
    await user.type(screen.getByLabelText(/Mật khẩu/), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Email hoặc mật khẩu không đúng.');
    expect(assign).not.toHaveBeenCalled();
    expect(useSessionStore.getState().user).toBeNull();
  });

  it('fills the form from a demo account shortcut', async () => {
    const user = userEvent.setup();
    render(<LoginForm redirectTo="/" />);

    await user.click(screen.getAllByRole('button', { name: 'Điền sẵn' })[0]!);

    expect(screen.getByLabelText(/Email/)).toHaveValue('fan@fancommerce.dev');
    expect(screen.getByLabelText(/Mật khẩu/)).toHaveValue('fanclub2026');
  });
});
