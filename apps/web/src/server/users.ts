/**
 * Demo user store.
 *
 * ⚠️  Demo-grade on purpose, and labelled as such:
 *   - users live in memory, so they reset on every server restart
 *   - passwords are scrypt-hashed with a per-user salt (NOT plaintext), because
 *     even a demo should not teach the wrong habit
 *   - credential comparison is constant-time
 *
 * A real deployment replaces this file with a database + an identity provider.
 * Nothing else in the app needs to change: the surface is just
 * `verifyCredentials` and `findUserById`.
 */
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

import { sessionUserSchema, type SessionUser } from '@fc/core';

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: string,
  keylen: number,
) => Promise<Buffer>;

const KEY_LENGTH = 64;

interface StoredUser {
  id: string;
  email: string;
  displayName: string;
  role: 'fan' | 'admin';
  tier: 'none' | 'silver' | 'gold';
  salt: string;
  passwordHash: string;
}

/**
 * Seeded with well-known demo credentials so a reviewer can log in without
 * setup. These are published in the README; they grant access to nothing but
 * this demo's in-memory data.
 */
const DEMO_CREDENTIALS = [
  {
    id: 'u_fan',
    email: 'fan@fancommerce.dev',
    password: 'fanclub2026',
    displayName: 'Minh Fan',
    role: 'fan' as const,
    tier: 'gold' as const,
  },
  {
    id: 'u_admin',
    email: 'admin@fancommerce.dev',
    password: 'adminadmin',
    displayName: 'Ops Admin',
    role: 'admin' as const,
    tier: 'none' as const,
  },
];

let usersPromise: Promise<StoredUser[]> | null = null;

async function hashPassword(password: string, salt: string): Promise<string> {
  const derived = await scryptAsync(password, salt, KEY_LENGTH);
  return derived.toString('hex');
}

function loadUsers(): Promise<StoredUser[]> {
  usersPromise ??= Promise.all(
    DEMO_CREDENTIALS.map(async (seed) => {
      const salt = randomBytes(16).toString('hex');
      return {
        id: seed.id,
        email: seed.email,
        displayName: seed.displayName,
        role: seed.role,
        tier: seed.tier,
        salt,
        passwordHash: await hashPassword(seed.password, salt),
      } satisfies StoredUser;
    }),
  );
  return usersPromise;
}

function toSessionUser(user: StoredUser): SessionUser {
  return sessionUserSchema.parse({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    tier: user.tier,
  });
}

export async function verifyCredentials(
  email: string,
  password: string,
): Promise<SessionUser | null> {
  const users = await loadUsers();
  const user = users.find((candidate) => candidate.email === email);

  // Always run a hash even when the email is unknown, so response time does
  // not reveal which emails exist.
  const salt = user?.salt ?? 'decoy-salt-value';
  const candidateHash = await hashPassword(password, salt);
  if (!user) return null;

  const expected = Buffer.from(user.passwordHash, 'hex');
  const actual = Buffer.from(candidateHash, 'hex');
  if (expected.length !== actual.length) return null;
  if (!timingSafeEqual(expected, actual)) return null;

  return toSessionUser(user);
}

export async function findUserById(id: string): Promise<SessionUser | null> {
  const users = await loadUsers();
  const user = users.find((candidate) => candidate.id === id);
  return user ? toSessionUser(user) : null;
}
