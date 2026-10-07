import type { Page } from '@playwright/test';

export const DEMO_FAN = {
  email: 'fan@fancommerce.dev',
  password: 'fanclub2026',
  displayName: 'Minh Fan',
} as const;

export const SHIPPING = {
  fullName: 'Nguyen Van A',
  phone: '0901234567',
  line1: '123 Duong Nguyen Hue',
  ward: 'Ben Nghe',
  city: 'Ho Chi Minh',
} as const;

/** Logs in through the real form — the session cookie is httpOnly, so it
 * cannot be injected from test code, and that is the point. */
export async function login(page: Page, next?: string): Promise<void> {
  await page.goto(next ? `/login?next=${encodeURIComponent(next)}` : '/login');
  await page.getByLabel('Email').fill(DEMO_FAN.email);
  await page.getByLabel('Mật khẩu').fill(DEMO_FAN.password);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'));
}

/**
 * Note on the locators: required fields carry a visually-hidden
 * "(bắt buộc)" suffix, so their accessible name is e.g. "Địa chỉ (bắt buộc)".
 * Anchored regexes match the visible label without depending on that suffix.
 */
export async function fillShippingAddress(page: Page): Promise<void> {
  await page.getByLabel(/^Họ và tên/).fill(SHIPPING.fullName);
  await page.getByLabel(/^Số điện thoại/).fill(SHIPPING.phone);
  await page.getByLabel(/^Địa chỉ/).fill(SHIPPING.line1);
  await page.getByLabel(/^Phường\/Xã/).fill(SHIPPING.ward);
  await page.getByLabel(/^Tỉnh\/Thành phố/).fill(SHIPPING.city);
}

/** Adds the first in-stock variant of a product to the cart. */
export async function addProductToCart(page: Page, slug: string): Promise<void> {
  await page.goto(`/products/${slug}`);
  await page.getByRole('button', { name: 'Thêm vào giỏ' }).click();
  await page.getByText(/Đã thêm/).waitFor();
}
