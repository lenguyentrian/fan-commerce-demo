import { expect, test } from '@playwright/test';

test.describe('catalogue', () => {
  test('filters by kind through the URL', async ({ page }) => {
    await page.goto('/products?kind=ticket');

    // Scope to the filter nav: the header also has a "Vé" link, and that one
    // is correctly not marked as the current filter.
    const filters = page.getByRole('navigation', { name: 'Lọc theo loại' });
    await expect(filters.getByRole('link', { name: 'Vé', exact: true })).toHaveAttribute(
      'aria-current',
      'true',
    );
    await expect(filters.getByRole('link', { name: 'Tất cả' })).not.toHaveAttribute(
      'aria-current',
      'true',
    );

    await expect(page.getByTestId('result-count')).toHaveText('2 sản phẩm');
  });

  test('search updates the URL and the results', async ({ page }) => {
    await page.goto('/products');
    await page.getByLabel('Tìm sản phẩm').fill('photobook');

    // Debounced, so wait for the URL rather than asserting immediately.
    await expect(page).toHaveURL(/q=photobook/);
    await expect(page.getByTestId('result-count')).toHaveText('1 sản phẩm');
  });

  test('a shared search URL renders the same results server-side', async ({ page }) => {
    // "concert" matches both concert tickets and the lightstick (tagged
    // 'concert'), because search covers name, artist and tags.
    await page.goto('/products?q=concert');
    await expect(page.getByTestId('result-count')).toHaveText('3 sản phẩm');
  });

  test('matches on artist and on tag, not just on name', async ({ page }) => {
    await page.goto('/products?q=bestseller');
    await expect(page.getByTestId('result-count')).toHaveText('2 sản phẩm');
  });

  test('survives a crafted pagination query instead of erroring', async ({ page }) => {
    const response = await page.goto('/products?page=-5&pageSize=99999');
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { name: 'Sản phẩm' })).toBeVisible();
    await expect(page.getByTestId('result-count')).toHaveText('8 sản phẩm');
  });

  test('shows a sold-out product without an add-to-cart button', async ({ page }) => {
    await page.goto('/products/official-lightstick-v2');
    await expect(page.getByText('Tạm hết hàng')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Thêm vào giỏ' })).toHaveCount(0);
  });

  test('returns a 404 for an unknown slug', async ({ page }) => {
    const response = await page.goto('/products/does-not-exist');
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: 'Không tìm thấy trang' })).toBeVisible();
  });

  test('cannot add more than the remaining stock', async ({ page }) => {
    // v_xl of the tour tee has stock 3.
    await page.goto('/products/anh-trai-tour-tee');
    await page.getByRole('radio', { name: 'XL' }).check();

    const increase = page.getByRole('button', { name: /Tăng số lượng/ });
    await increase.click();
    await increase.click();

    await expect(page.getByRole('spinbutton', { name: /Số lượng/ })).toHaveValue('3');
    await expect(increase).toBeDisabled();
  });

  test('disables a sold-out variant but keeps the product buyable', async ({ page }) => {
    await page.goto('/products/anh-trai-tour-tee');

    // Size L is out of stock.
    await expect(page.getByRole('radio', { name: /L \(hết hàng\)/ })).toBeDisabled();
    // S is the first in-stock variant, so it is the one preselected.
    await expect(page.getByRole('radio', { name: 'S', exact: true })).toBeChecked();
    await expect(page.getByRole('button', { name: 'Thêm vào giỏ' })).toBeEnabled();
  });
});
