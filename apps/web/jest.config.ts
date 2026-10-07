import nextJest from 'next/jest.js';
import type { Config } from 'jest';

/**
 * next/jest wires up SWC, CSS module stubs, next/image and path aliases, so
 * the test config stays close to how the app actually compiles.
 *
 * Scope: component behaviour, hooks and client-side state. Domain rules are
 * tested in @fc/core (faster, no DOM); user journeys are covered by Playwright.
 */
const createJestConfig = nextJest({ dir: './' });

const config: Config = {
  displayName: 'web',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: ['<rootDir>/src/**/*.test.ts', '<rootDir>/src/**/*.test.tsx'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
    '!src/app/**/layout.tsx',
    '!src/app/**/page.tsx',
  ],
  // Playwright owns e2e; Jest must not try to run those files.
  testPathIgnorePatterns: ['<rootDir>/e2e/', '<rootDir>/.next/'],
};

export default createJestConfig(config);
