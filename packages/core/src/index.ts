/**
 * `@fc/core` — the shared, framework-free core.
 *
 * Nothing in here may import React, Next.js, or any Node built-in. That
 * constraint is what makes the package portable: the Flutter app in phase 2
 * reimplements this same surface in Dart, test-for-test.
 * See docs/ARCHITECTURE.md and .cursor/rules/20-core-package.mdc.
 */

export * from './domain/money';
export * from './domain/catalog';
export * from './domain/cart';
export * from './domain/order';
export * from './domain/auth';
export * from './api/errors';
export * from './api/contract';
export * from './api/client';
