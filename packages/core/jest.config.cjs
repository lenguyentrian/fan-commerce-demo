/**
 * Jest config for the framework-free domain package.
 * Node environment — no DOM, no React. Keeps domain tests fast (<1s)
 * so a coding agent can run them on every edit.
 */
/** @type {import('jest').Config} */
module.exports = {
  displayName: 'core',
  testEnvironment: 'node',
  rootDir: 'src',
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          module: 'CommonJS',
          moduleResolution: 'Node',
          target: 'ES2022',
          esModuleInterop: true,
          strict: true,
          verbatimModuleSyntax: false,
        },
      },
    ],
  },
  testMatch: ['**/*.test.ts'],
  // rootDir is `src`, so without this the report lands inside the source tree
  // and then gets linted.
  coverageDirectory: '<rootDir>/../coverage',
  collectCoverageFrom: ['**/*.ts', '!**/*.test.ts', '!**/index.ts'],
  coverageThreshold: {
    global: { statements: 80, branches: 75, functions: 80, lines: 80 },
  },
};
