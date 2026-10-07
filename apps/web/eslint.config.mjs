import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

/**
 * Flat config. Beyond the Next.js defaults, the rules below are the ones that
 * encode this project's conventions — including the ones a coding agent is
 * most likely to break, which is why they are lint errors rather than
 * review comments.
 */
const config = [
  ...nextCoreWebVitals,
  ...nextTypescript,

  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'next-env.d.ts',
    ],
  },

  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      // Unused code is either a leftover or a bug. `_`-prefixed args are the
      // documented escape hatch for required-but-unused parameters.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'all', caughtErrorsIgnorePattern: '^_' },
      ],
      // `any` erases the contract that @fc/core's schemas exist to enforce.
      '@typescript-eslint/no-explicit-any': 'error',
      // Agent-generated code reaches for `console.log` constantly. Warnings
      // and errors are intentional; stray logs are noise and can leak data.
      'no-console': ['error', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': ['error', 'always'],
    },
  },

  // Note: the layer-boundary rules for packages/core and packages/ui live in
  // the root eslint.config.mjs. `eslint .` only walks the current directory,
  // so a config block for `../../packages/**` here would never run.

  {
    // Server-only modules must never be pulled into a client bundle.
    files: ['src/server/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'zustand', message: 'Server modules must not use client state.' },
            { name: 'react', message: 'Server modules must not import React.' },
          ],
        },
      ],
    },
  },

  {
    // Tests get a longer leash: console output and non-null assertions are
    // useful when debugging a failure.
    files: ['**/*.test.{ts,tsx}', 'e2e/**/*.ts', 'jest.setup.ts'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
];

export default config;
