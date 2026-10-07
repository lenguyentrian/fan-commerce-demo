import { findUserById, verifyCredentials } from './users';

describe('verifyCredentials()', () => {
  it('accepts the seeded fan account', async () => {
    const user = await verifyCredentials('fan@fancommerce.dev', 'fanclub2026');
    expect(user).toMatchObject({ id: 'u_fan', role: 'fan', tier: 'gold' });
  });

  it('accepts the seeded admin account', async () => {
    const user = await verifyCredentials('admin@fancommerce.dev', 'adminadmin');
    expect(user).toMatchObject({ role: 'admin' });
  });

  it('rejects a wrong password', async () => {
    await expect(verifyCredentials('fan@fancommerce.dev', 'wrongpassword')).resolves.toBeNull();
  });

  it('rejects an unknown email', async () => {
    await expect(verifyCredentials('nobody@example.com', 'fanclub2026')).resolves.toBeNull();
  });

  it('never returns a password hash to the caller', async () => {
    const user = await verifyCredentials('fan@fancommerce.dev', 'fanclub2026');
    expect(Object.keys(user ?? {})).toEqual(
      expect.not.arrayContaining(['passwordHash', 'salt']),
    );
  });
});

describe('findUserById()', () => {
  it('finds a seeded user', async () => {
    await expect(findUserById('u_fan')).resolves.toMatchObject({ email: 'fan@fancommerce.dev' });
  });

  it('returns null for an unknown id', async () => {
    await expect(findUserById('u_nope')).resolves.toBeNull();
  });
});
