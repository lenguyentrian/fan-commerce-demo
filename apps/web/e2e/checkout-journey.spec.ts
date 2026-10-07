import { expect, test, type Page } from '@playwright/test';

import { addProductToCart, fillShippingAddress, login } from './fixtures';

/**
 * Compares the rendered total by digits only, so the assertion does not depend
 * on ICU separator or currency-symbol placement.
 */
async function expectTotal(page: Page, expectedDigits: string): Promise<void> {
  await expect
    .poll(async () => ((await page.getByTestId('cart-total').textContent()) ?? '').replace(/\D/g, ''))
    .toBe(expectedDigits);
}

/**
 * Scopes assertions to the order that *this* test just placed.
 *
 * All specs sign in as the same demo account, and the demo order store is
 * per-user, so a parallel run legitimately leaves several orders on the page.
 * Asserting on "the heading that looks like an order code" would then fail on
 * a strict-mode violation — a test-isolation problem, not a product bug.
 */
function placedOrder(page: Page) {
  const code = new URL(page.url()).searchParams.get('placed');
  expect(code).toMatch(/^FC\d{8}-\d{4}$/);

  return page
    .getByRole('article')
    .filter({ has: page.getByRole('heading', { name: code!, exact: true }) });
}

/**
 * The core revenue path. If this breaks, the product is down.
 */
test.describe('checkout journey', () => {
  test('browse -> cart -> login -> pay -> order appears', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Merch chính thức');

    // Browse into a product from the grid.
    await page.getByRole('link', { name: /Anh Trai World Tour Tee/ }).first().click();
    await expect(page).toHaveURL(/\/products\/anh-trai-tour-tee/);

    // Add to cart.
    await page.getByRole('button', { name: 'Thêm vào giỏ' }).click();
    await expect(page.getByText(/Đã thêm 1 ×/)).toBeVisible();

    // Header badge reflects the cart.
    const cartLink = page.getByRole('link', { name: /Giỏ hàng, 1 sản phẩm/ });
    await expect(cartLink).toBeVisible();

    // Cart page shows the line and a total: 450.000 + 30.000 shipping.
    await cartLink.click();
    await expect(page.getByRole('heading', { name: 'Giỏ hàng' })).toBeVisible();
    await expectTotal(page, '480000');

    // Checkout requires a session: the proxy must bounce us to login and
    // remember where we were going.
    await page.getByRole('button', { name: 'Tiến hành thanh toán' }).click();
    await expect(page).toHaveURL(/\/login\?next=%2Fcheckout/);

    await page.getByLabel('Email').fill('fan@fancommerce.dev');
    await page.getByLabel('Mật khẩu').fill('fanclub2026');
    await page.getByRole('button', { name: 'Đăng nhập' }).click();

    // ...and land back on checkout, with the cart intact.
    await expect(page).toHaveURL(/\/checkout/);
    await expectTotal(page, '480000');

    await fillShippingAddress(page);
    await page.getByRole('button', { name: 'Đặt hàng' }).click();

    // Order confirmation.
    await expect(page).toHaveURL(/\/orders\?placed=FC/);
    await expect(page.getByText('Đặt hàng thành công')).toBeVisible();

    const order = placedOrder(page);
    await expect(order).toBeVisible();
    await expect(order.getByText('Đã thanh toán')).toBeVisible();
    await expect(order.getByText('Anh Trai World Tour Tee')).toBeVisible();

    // Cart is emptied after a successful order.
    await page.goto('/cart');
    await expect(page.getByText('Giỏ hàng đang trống')).toBeVisible();
  });

  test('promo code changes the total consistently from cart to order', async ({ page }) => {
    await login(page);
    await addProductToCart(page, 'anh-trai-tour-tee');

    await page.goto('/cart');
    await page.getByLabel('Mã giảm giá').fill('FAN10');
    await page.getByRole('button', { name: 'Áp dụng' }).click();

    await expect(page.getByText('Fan Club -10%')).toBeVisible();
    // 450.000 − 10% = 405.000, below the 500.000 threshold -> +30.000 shipping
    await expectTotal(page, '435000');

    await page.getByRole('button', { name: 'Tiến hành thanh toán' }).click();
    await expect(page).toHaveURL(/\/checkout/);
    // The checkout summary must agree with the cart summary.
    await expectTotal(page, '435000');

    await fillShippingAddress(page);
    await page.getByRole('button', { name: 'Đặt hàng' }).click();

    await expect(page).toHaveURL(/\/orders\?placed=/);
    // And the server-recorded order must agree too — the discount was applied
    // server-side from the catalogue price, not taken from the client.
    const order = placedOrder(page);
    await expect(order.getByText('(FAN10)')).toBeVisible();
    await expect(order.getByText(/−\s?45[.,]000/)).toBeVisible();
  });

  test('free shipping kicks in above the threshold', async ({ page }) => {
    await login(page);
    await page.goto('/products/anh-trai-tour-tee');
    await page.getByRole('button', { name: /Tăng số lượng/ }).click();
    await page.getByRole('button', { name: 'Thêm vào giỏ' }).click();

    await page.goto('/cart');
    // 2 × 450.000 = 900.000 -> shipping waived
    await expect(page.getByText('Miễn phí')).toBeVisible();
    await expectTotal(page, '900000');
  });

  test('rejects an invalid phone number before submitting', async ({ page }) => {
    await login(page);
    await addProductToCart(page, 'anh-trai-tour-tee');

    await page.goto('/checkout');
    await fillShippingAddress(page);
    await page.getByLabel('Số điện thoại').fill('12345');
    await page.getByRole('button', { name: 'Đặt hàng' }).click();

    await expect(page.getByText(/Số điện thoại không hợp lệ/)).toBeVisible();
    await expect(page).toHaveURL(/\/checkout/);
    // Focus moves to the offending field so a keyboard user is not stranded.
    await expect(page.getByLabel('Số điện thoại')).toBeFocused();
  });

  test('blocks checkout with an empty cart', async ({ page }) => {
    await login(page);
    await page.goto('/checkout');
    await expect(page.getByText('Giỏ hàng trống')).toBeVisible();
  });

  test('the cart survives a page reload', async ({ page }) => {
    await addProductToCart(page, 'photobook-behind-the-tour');
    await page.reload();
    await expect(page.getByRole('link', { name: /Giỏ hàng, 1 sản phẩm/ })).toBeVisible();
  });
});
