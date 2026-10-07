# apps/mobile — Flutter app (phase 2)

Not built yet. This document is the plan, and the reason the web codebase is
shaped the way it is.

The claim being made by the structure of this repository is specific: **the
business rules are already written in a portable form**, so the mobile app is a
new presentation layer over an existing, tested domain — not a second
implementation of the product.

---

## What is already done for it

| Asset | Where | Reused how |
| --- | --- | --- |
| Domain rules | `packages/core/src/domain/` | Transcribed to Dart, tests ported one-for-one |
| 131 domain tests | same | They are the specification; porting them first prevents divergence |
| API contract | `packages/core/src/api/contract.ts` | Same endpoint paths and header names |
| Error model | `api/errors.ts` | Codes already map to gRPC status numbers |
| Design tokens | `packages/ui/src/tokens.css` | Same token names in a `ThemeExtension` |
| gRPC contracts | `proto/` | Dart codegen via `protoc_plugin` |
| Agent rules | `AGENTS.md`, `.cursor/rules/`, `.kiro/steering/` | Extended, not rewritten |

The constraint that makes this work is the one `.cursor/rules/10-core-package.mdc`
enforces: `@fc/core` may import `zod` and nothing else. No React, no Next, no
Node built-ins. That rule exists entirely for this phase.

---

## Planned structure

```
apps/mobile/
├── lib/
│   ├── main.dart
│   └── src/
│       ├── data/          Dio client with the same interceptor behaviour as ApiClient
│       ├── domain/        thin wrappers over core_dart
│       └── presentation/
│           ├── theme/     ThemeExtension built from the shared token names
│           ├── widgets/   design system mirror (Button, Field, Price, QuantityStepper)
│           └── journey/
│               ├── catalog/
│               ├── cart/
│               ├── auth/
│               └── checkout/
└── test/

packages/core_dart/        the Dart port of @fc/core — pure Dart, no Flutter
├── lib/src/domain/        money.dart, catalog.dart, cart.dart, order.dart, auth.dart
└── test/                  the TypeScript suite, transcribed
```

`core_dart` has no Flutter dependency, mirroring the TS package having no React
dependency. Same reason: a domain that imports a UI framework stops being
testable and stops being portable.

---

## Mapping, concretely

| TypeScript | Dart | Notes |
| --- | --- | --- |
| `Money` interface | immutable class, `final int amount` | Integer minor units. Never `double` |
| `Math.round` (half-up) | `num.round()` | Matches for non-negative values; a `.5` boundary test proves it rather than assuming |
| Zod schema | `fromJson` factory that throws, plus `tryFromJson` | Never silently default a missing field — a null price must not become a zero price |
| `CartError` with codes | sealed class hierarchy, identical code strings | Keeps logs and analytics comparable across platforms |
| Pure functions | top-level functions | Not methods on a service class, nothing injected |
| Zustand store | Bloc / Cubit | Holds state, delegates rules to `core_dart` — same split as the web stores |
| `ApiClient` interceptors | Dio interceptors | Shared channel, deadline, correlation headers, retry only on transient + idempotent |
| `tokens.css` | `ThemeExtension<FcTokens>` | Same token names, light/dart variants |

The porting procedure is written up as a prompt:
[`prompts/07-port-rule-to-dart.md`](../../prompts/07-port-rule-to-dart.md). Its
central instruction is **port the tests before the implementation**, because the
tests are where the invisible decisions live — that `totals()` applies the
discount before evaluating free shipping, that `stock: null` means untracked
rather than unlimited, that `money()` refuses a non-integer.

Port the implementation first and an agent will reproduce the signatures and
quietly invent its own answer to each of those. Web and mobile quoting different
totals for the same cart is a bug that reaches customers through a support
ticket rather than through monitoring.

---

## Mobile-specific work that has no web equivalent

- **Secure storage** for the session token: Keychain on iOS, EncryptedSharedPreferences
  on Android. The web equivalent is the httpOnly cookie; `localStorage` is wrong
  on both platforms.
- **Biometric unlock** before high-value actions, with a PIN fallback.
- **Deep links** into a product or an order, including the cold-start case.
- **Offline cart** via local persistence, reconciled against live stock on
  reconnect — the server already re-checks stock at submit time, so the handling
  exists.
- **Push notifications** for order status.
- **Multi-flavour builds** (dev/uat/live) and store release configuration.

---

## Order of work

1. `packages/core_dart` — money and cart first, tests ported one-for-one.
2. Dio client with the interceptor behaviour of `ApiClient`: shared instance,
   deadline, correlation headers, retry restricted to transient codes and
   idempotent calls.
3. Theme from the shared tokens, then the design system mirror.
4. Catalogue journey (list, detail, variant picker).
5. Cart with a Cubit over `core_dart`.
6. Auth with secure storage and biometrics.
7. Checkout, carrying the same idempotency key design.
8. `flutter test` for widgets, `integration_test` for the journey — the same
   level split as Jest and Playwright on the web.

---

## Honest status

Nothing in this folder is implemented. What exists is the preparation: a domain
package with no framework dependencies, 131 tests that serve as its
specification, a transport-agnostic error model, protobuf contracts, and a
written porting procedure.

That preparation is the actual claim. "We will share code with mobile later" is
easy to say; keeping a domain package importable by a Dart port is a constraint
you have to honour on every commit, and it is visible in the rules, the ESLint
config and the import boundaries.
