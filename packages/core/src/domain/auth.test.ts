import {
  hasRole,
  isProtectedPath,
  loginRequestSchema,
  safeRedirect,
  sessionUserSchema,
  type SessionUser,
} from './auth';

describe('loginRequestSchema', () => {
  it('normalizes the email', () => {
    const parsed = loginRequestSchema.parse({ email: '  FAN@Example.COM ', password: 'supersecret' });
    expect(parsed.email).toBe('fan@example.com');
  });

  it('rejects a short password', () => {
    expect(loginRequestSchema.safeParse({ email: 'a@b.com', password: 'short' }).success).toBe(false);
  });

  it('rejects a malformed email', () => {
    expect(loginRequestSchema.safeParse({ email: 'nope', password: 'supersecret' }).success).toBe(
      false,
    );
  });
});

describe('isProtectedPath()', () => {
  it.each([
    ['/checkout', true],
    ['/checkout/review', true],
    ['/orders', true],
    ['/account/profile', true],
    ['/', false],
    ['/products/tee', false],
    ['/checkoutXYZ', false],
  ])('%s -> %s', (path, expected) => {
    expect(isProtectedPath(path)).toBe(expected);
  });
});

describe('hasRole()', () => {
  const user = (role: SessionUser['role']): SessionUser =>
    sessionUserSchema.parse({
      id: 'u_1',
      email: 'fan@example.com',
      displayName: 'Fan',
      role,
    });

  it('denies anonymous users', () => {
    expect(hasRole(null, 'fan')).toBe(false);
  });

  it('lets admin satisfy a fan requirement', () => {
    expect(hasRole(user('admin'), 'fan')).toBe(true);
  });

  it('does not let a fan satisfy an admin requirement', () => {
    expect(hasRole(user('fan'), 'admin')).toBe(false);
  });

  it('defaults tier to none', () => {
    expect(user('fan').tier).toBe('none');
  });
});

describe('safeRedirect()', () => {
  it('keeps internal paths', () => {
    expect(safeRedirect('/orders')).toBe('/orders');
  });

  it.each(['//evil.com', 'https://evil.com', 'javascript:alert(1)', '/\\evil.com', '', null, undefined])(
    'rejects open-redirect payload %p',
    (target) => {
      expect(safeRedirect(target)).toBe('/');
    },
  );

  it('honours a custom fallback', () => {
    expect(safeRedirect('https://evil.com', '/login')).toBe('/login');
  });
});
