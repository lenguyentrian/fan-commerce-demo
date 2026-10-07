import { expect, test } from '@playwright/test';

import { login } from './fixtures';

/**
 * These are the checks a reviewer should expect to see in a transactional
 * product. Each one encodes a specific way the app could be abused.
 */
test.describe('access control', () => {
  test('redirects anonymous navigation to protected pages', async ({ page }) => {
    for (const path of ['/checkout', '/orders', '/account/profile']) {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(path)}`));
    }
  });

  test('API endpoints reject anonymous callers, not just the UI', async ({ request }) => {
    // The proxy only guards navigation. Hitting the endpoint directly must
    // still be refused by the handler. The bare `request` fixture has its own
    // cookie jar, so this call is genuinely anonymous.
    const orders = await request.get('/api/orders');
    expect(orders.status()).toBe(401);
    expect((await orders.json()).error.code).toBe('UNAUTHENTICATED');

    const checkout = await request.post('/api/checkout', { data: {} });
    expect(checkout.status()).toBe(401);
  });

  test('ignores a client-supplied price', async ({ page }) => {
    await login(page);

    // `page.request` shares the browser context's cookies, so this call is
    // authenticated as the logged-in fan.
    const response = await page.request.post('/api/checkout', {
      data: {
        lines: [
          {
            productId: 'p_tour_tee',
            variantId: 'v_m',
            slug: 'anh-trai-tour-tee',
            name: 'Anh Trai World Tour Tee',
            variantLabel: 'M',
            imageUrl: '/images/products/tour-tee.svg',
            // The attack: claim the tee costs 1 dong.
            unitPrice: { amount: 1, currency: 'VND' },
            quantity: 1,
          },
        ],
        promoCode: null,
        paymentMethod: 'momo',
        shippingAddress: {
          fullName: 'Nguyen Van A',
          phone: '0901234567',
          line1: '123 Duong Nguyen Hue',
          ward: 'Ben Nghe',
          city: 'Ho Chi Minh',
        },
        idempotencyKey: '44444444-4444-4444-8444-444444444444',
      },
    });

    expect(response.status()).toBe(201);
    const order = await response.json();
    expect(order.subtotal.amount).toBe(450_000);
  });

  test('the same idempotency key does not create a second order', async ({ page }) => {
    await login(page);

    const payload = {
      lines: [
        {
          productId: 'p_photobook',
          variantId: 'v_std',
          slug: 'photobook-behind-the-tour',
          name: 'Photobook',
          variantLabel: 'Standard',
          imageUrl: '/images/products/photobook.svg',
          unitPrice: { amount: 690_000, currency: 'VND' },
          quantity: 1,
        },
      ],
      promoCode: null,
      paymentMethod: 'card',
      shippingAddress: {
        fullName: 'Nguyen Van A',
        phone: '0901234567',
        line1: '123 Duong Nguyen Hue',
        ward: 'Ben Nghe',
        city: 'Ho Chi Minh',
      },
      idempotencyKey: '55555555-5555-4555-8555-555555555555',
    };

    const first = await page.request.post('/api/checkout', { data: payload });
    const second = await page.request.post('/api/checkout', { data: payload });

    expect((await first.json()).id).toBe((await second.json()).id);
  });

  test('rejects a malformed payload with field-level errors', async ({ page }) => {
    await login(page);

    const response = await page.request.post('/api/checkout', {
      data: { lines: [], paymentMethod: 'bitcoin', shippingAddress: {}, idempotencyKey: 'nope' },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe('INVALID_ARGUMENT');
    expect(Object.keys(body.error.fields).length).toBeGreaterThan(0);
  });

  test('does not follow an external post-login redirect', async ({ page }) => {
    await page.goto('/login?next=https://example.com/phish');
    await page.getByLabel('Email').fill('fan@fancommerce.dev');
    await page.getByLabel('Mật khẩu').fill('fanclub2026');
    await page.getByRole('button', { name: 'Đăng nhập' }).click();

    // Falls back to the homepage instead of honouring the external URL.
    await expect(page).toHaveURL(/127\.0\.0\.1:\d+\/$/);
  });

  test('sets the expected security headers', async ({ request }) => {
    const response = await request.get('/');
    const headers = response.headers();

    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    // Next's version banner is an unnecessary disclosure.
    expect(headers['x-powered-by']).toBeUndefined();
  });

  test('keeps the session cookie out of JavaScript reach', async ({ page }) => {
    await login(page);

    const cookies = await page.context().cookies();
    const session = cookies.find((cookie) => cookie.name === 'fc_session');

    expect(session?.httpOnly).toBe(true);
    expect(session?.sameSite).toBe('Lax');
    // document.cookie must not see it.
    expect(await page.evaluate(() => document.cookie)).not.toContain('fc_session');
  });
});
