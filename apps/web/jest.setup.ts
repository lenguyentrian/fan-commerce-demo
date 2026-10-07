import '@testing-library/jest-dom';

/**
 * Shared test setup.
 *
 * Runs for both environments, so every browser-only stub is guarded: server
 * tests opt into `@jest-environment node` (see src/server/session.test.ts) and
 * must not blow up on a missing `window`.
 */
const isBrowserEnv = typeof window !== 'undefined';

/** Zustand's persist middleware needs a working localStorage. */
class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

if (isBrowserEnv) {
  Object.defineProperty(window, 'localStorage', {
    value: new MemoryStorage(),
    writable: true,
  });

  if (!window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    });
  }
}

/** crypto.randomUUID backs the checkout idempotency key. */
if (typeof globalThis.crypto?.randomUUID !== 'function') {
  Object.defineProperty(globalThis, 'crypto', {
    value: {
      ...globalThis.crypto,
      randomUUID: () => '00000000-0000-4000-8000-000000000000',
    },
    writable: true,
  });
}

afterEach(() => {
  jest.clearAllMocks();
});
