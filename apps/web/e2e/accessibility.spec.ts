import { expect, test } from '@playwright/test';

/**
 * Keyboard and semantics checks.
 *
 * These catch regressions, not compliance. Full WCAG conformance needs manual
 * testing with real assistive technology and an expert review — an automated
 * suite cannot assert it, and claiming otherwise would be dishonest.
 */
test.describe('accessibility basics', () => {
  test('the skip link is the first tab stop and jumps to main', async ({ page, isMobile }) => {
    // iOS Safari does not move focus between links with Tab, so this assertion
    // is meaningless there. The skip link itself still renders on mobile.
    test.skip(!!isMobile, 'Tab-based focus traversal is unavailable on iOS Safari');

    await page.goto('/');
    await page.keyboard.press('Tab');

    const focused = page.locator(':focus');
    await expect(focused).toHaveText(/Bỏ qua điều hướng/);

    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#main$/);
  });

  test('each page has exactly one h1', async ({ page }) => {
    for (const path of ['/', '/products', '/cart', '/login']) {
      await page.goto(path);
      await expect(page.locator('h1')).toHaveCount(1);
    }
  });

  test('product images carry descriptive alt text', async ({ page }) => {
    await page.goto('/products/anh-trai-tour-tee');
    await expect(page.getByAltText(/Áo thun tour/)).toBeVisible();
  });

  test('the whole purchase form is reachable by keyboard alone', async ({ page }) => {
    await page.goto('/products/anh-trai-tour-tee');

    // Tab until the add-to-cart button has focus, then activate it with the
    // keyboard. A mouse-only control would never get here.
    const addButton = page.getByRole('button', { name: 'Thêm vào giỏ' });
    await addButton.focus();
    await page.keyboard.press('Enter');

    await expect(page.getByText(/Đã thêm/)).toBeVisible();
  });

  test('form errors are announced via role=alert and linked to the input', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('nope');
    await page.getByLabel('Mật khẩu').fill('short');
    await page.getByRole('button', { name: 'Đăng nhập' }).click();

    const emailInput = page.getByLabel('Email');
    await expect(emailInput).toHaveAttribute('aria-invalid', 'true');

    const describedBy = await emailInput.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    await expect(page.locator(`#${describedBy!.split(' ').pop()}`)).toHaveAttribute(
      'role',
      'alert',
    );
  });

  test('the quantity stepper has named controls', async ({ page }) => {
    await page.goto('/products/anh-trai-tour-tee');
    await expect(page.getByRole('button', { name: /Tăng số lượng/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Giảm số lượng/ })).toBeVisible();
    await expect(page.getByRole('spinbutton', { name: /Số lượng/ })).toBeVisible();
  });

  test('renders usably at a 320px viewport', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto('/products/anh-trai-tour-tee');

    const button = page.getByRole('button', { name: 'Thêm vào giỏ' });
    await expect(button).toBeVisible();

    // No horizontal overflow: the usual symptom of a fixed-width element.
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(overflows).toBe(false);
  });
});
