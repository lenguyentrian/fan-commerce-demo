/**
 * @jest-environment node
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { isProtectedPath, PROTECTED_PATHS } from '@fc/core';

/**
 * Guards a real failure mode that no type or lint rule can catch.
 *
 * `PROTECTED_PATHS` in @fc/core is the domain's declaration of which routes
 * need a session. `config.matcher` in proxy.ts decides which requests the Edge
 * proxy actually sees — and Next requires it to be a static literal, so it
 * cannot be derived from the domain list.
 *
 * Add `/wallet` to PROTECTED_PATHS, forget proxy.ts, and the page ships with
 * no redirect and no error anywhere. So the test reads the source text and
 * compares the two.
 */
function readMatcherFromProxySource(): string[] {
  const source = readFileSync(join(__dirname, '..', 'proxy.ts'), 'utf8');
  const block = /matcher:\s*\[([\s\S]*?)\]/.exec(source);

  if (!block?.[1]) {
    throw new Error('Could not find `matcher: [...]` in proxy.ts');
  }

  return Array.from(block[1].matchAll(/'([^']+)'/g), (match) => match[1]!);
}

describe('proxy matcher', () => {
  const matcher = readMatcherFromProxySource();

  it('is parsed from the real source file', () => {
    expect(matcher.length).toBeGreaterThan(0);
  });

  it('covers every protected path declared by the domain, exactly and nested', () => {
    for (const base of PROTECTED_PATHS) {
      expect(matcher).toContain(base);
      expect(matcher).toContain(`${base}/:path*`);
    }
  });

  it('declares nothing the domain does not consider protected', () => {
    for (const pattern of matcher) {
      expect(isProtectedPath(pattern.replace('/:path*', ''))).toBe(true);
    }
  });

  it('leaves public routes unmatched', () => {
    for (const path of ['/', '/products', '/products/tour-tee', '/login', '/cart']) {
      expect(isProtectedPath(path)).toBe(false);
      expect(matcher).not.toContain(path);
    }
  });
});
