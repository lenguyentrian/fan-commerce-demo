import { productListSearchParams, routes } from './contract';

describe('routes', () => {
  it('builds stable paths', () => {
    expect(routes.products()).toBe('/api/products');
    expect(routes.login()).toBe('/api/auth/login');
    expect(routes.checkout()).toBe('/api/checkout');
    expect(routes.health()).toBe('/api/health');
    expect(routes.orders()).toBe('/api/orders');
    expect(routes.logout()).toBe('/api/auth/logout');
    expect(routes.session()).toBe('/api/auth/session');
  });

  it('encodes the slug so a crafted value cannot escape the path', () => {
    expect(routes.product('tour tee/../admin')).toBe('/api/products/tour%20tee%2F..%2Fadmin');
  });
});

describe('productListSearchParams()', () => {
  it('returns an empty string for defaults', () => {
    expect(productListSearchParams({})).toBe('');
    expect(productListSearchParams({ page: 1, pageSize: 12 })).toBe('');
  });

  it('serializes only non-default values', () => {
    expect(productListSearchParams({ kind: 'ticket', q: 'tee', page: 3, pageSize: 24 })).toBe(
      '?kind=ticket&q=tee&page=3&pageSize=24',
    );
  });

  it('url-encodes the search term', () => {
    expect(productListSearchParams({ q: 'anh trai & em' })).toBe('?q=anh+trai+%26+em');
  });
});
