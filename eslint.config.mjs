import tseslint from 'typescript-eslint';

/**
 * Root config: lints the shared packages.
 *
 * The Next.js app has its own config (`apps/web/eslint.config.mjs`) because
 * `eslint-config-next` brings rules that only make sense inside the app. This
 * one exists to enforce the layer boundaries that make `packages/core`
 * portable — the constraint the Flutter port depends on.
 */
const config = [
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/.next/**', 'apps/web/**', 'coverage/**'],
  },

  ...tseslint.configs.recommended,

  {
    files: ['packages/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', caughtErrors: 'all', caughtErrorsIgnorePattern: '^_' },
      ],
      'no-console': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'prefer-const': 'error',
    },
  },

  {
    // The portability contract for @fc/core, enforced rather than requested.
    //
    // The tsconfig already excludes the DOM lib, so `window` and browser-only
    // types are compile errors. Node globals are the remaining gap: @types/node
    // is present (it supplies `fetch`, `Response`, `AbortController`), which
    // also makes `process` and `Buffer` typecheck. These rules close that hole.
    files: ['packages/core/src/**/*.ts'],
    ignores: ['packages/core/src/**/*.test.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        {
          name: 'process',
          message:
            'No Node globals in @fc/core — it is ported to Dart. Inject the value as an option instead (see ApiClient.onSchemaMismatch).',
        },
        {
          name: 'Buffer',
          message: 'No Node globals in @fc/core. Use Uint8Array, or move this to apps/web/src/server.',
        },
        { name: 'window', message: 'No browser globals in @fc/core.' },
        { name: 'document', message: 'No browser globals in @fc/core.' },
        { name: 'localStorage', message: 'No browser globals in @fc/core.' },
      ],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'react', message: '@fc/core must stay framework-free.' },
            { name: 'react-dom', message: '@fc/core must stay framework-free.' },
          ],
          patterns: [
            { group: ['next', 'next/*'], message: '@fc/core must stay framework-free.' },
            { group: ['node:*'], message: 'No Node built-ins in @fc/core — move this to apps/web/src/server.' },
            { group: ['@/*', '../../apps/*'], message: '@fc/core must not depend on an app.' },
          ],
        },
      ],
    },
  },

  {
    // The design system is presentational. No routing, no app imports.
    files: ['packages/ui/src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'next/navigation', message: 'Design system components must not know about routing.' },
            { name: 'next/router', message: 'Design system components must not know about routing.' },
            { name: 'next/link', message: 'A component that navigates belongs in apps/web.' },
            { name: 'zustand', message: 'Design system components must not hold app state.' },
          ],
          patterns: [{ group: ['@/*'], message: 'Design system components must not import from the app.' }],
        },
      ],
    },
  },

  {
    files: ['packages/**/*.test.ts'],
    rules: { 'no-console': 'off' },
  },
];

export default config;
