# Testing

## Strategy: test at the cheapest level that can catch the bug

| Level             | Tool                  | Location                           | Count           | Runtime |
| ----------------- | --------------------- | ---------------------------------- | --------------- | ------- |
| Domain            | Jest (node) + ts-jest | `packages/core/src/**/*.test.ts`   | 131             | ~1s     |
| Component / store | Jest + RTL (jsdom)    | `apps/web/src/**/*.test.tsx`       | —               | ~2s     |
| Server module     | Jest (node docblock)  | `apps/web/src/server/**/*.test.ts` | 66 total web    | ~2s     |
| Journey           | Playwright            | `apps/web/e2e/**/*.spec.ts`        | 30 × 2 browsers | ~15s    |

A pricing rule verified through a browser is a slow test of the wrong thing.
The rule is tested in `@fc/core` in milliseconds; the journey test asserts that
the resulting number reaches the screen.

```bash
npm run test:core    # ~1s  — run this on every edit to packages/core
npm run test:web     # ~2s
npm test             # both
npm run test:e2e     # Playwright, builds first
npm run verify       # typecheck + unit + build — the gate
```

A hook runs `test:core` on save for `packages/core/src/**`, which turns the
domain suite into a behavioural type-checker.

---

## What each level is responsible for

**Domain (131 tests).** Money arithmetic and formatting; cart add/merge/remove
and quantity ceilings; promo normalization; `totals()` including the
discount-before-shipping ordering; product and checkout schemas; auth helpers
including `safeRedirect`; the error model's HTTP/gRPC mappings; the API client's
retry policy, deadline and response validation.

Coverage floors are enforced (`jest.config.cjs`): 80% statements, 75% branches.
Currently at 96% / 86%. Treated as a floor, not a target — a test written to
move the number is worse than no test.

**Component and store.** Rendering, interaction and client state: the cart store
delegating to the domain and surfacing its errors, the add-to-cart variant
picker and stock cap, order summary totals, login form validation and its aria
wiring.

**Server module.** Pricing authority, idempotency, per-user isolation, session
token verification, cookie attribute derivation, the rate limiter, credential
checks.

**Journey.** The revenue path end to end, plus catalogue filtering and search,
access control, and accessibility basics. Two projects: `chromium` and
`mobile-safari`, because a commerce checkout breaks on a 390px viewport first.

---

## Rules

- **A bug fix ships with a test that fails before the fix.** No exceptions.
- **Assert behaviour, not implementation.** Query by role and accessible name.
  No snapshots. No class-name assertions.
- **Assert error codes, not messages.** Messages are copy and will be
  translated.
- **Never weaken an assertion to go green.** If the test and the code disagree,
  decide which is wrong and say so. Three E2E "failures" in this repo were the
  tests being wrong (`DECISIONS.md` §9).
- **No `waitForTimeout` as synchronisation.** Wait for a URL, a response or an
  element. `expect.poll` is fine for a value that settles.
- **Tests must not depend on each other's order or leftovers.**

---

## Setup details worth knowing

These were all arrived at by hitting the problem.

### jsdom and ESM

`jose` is ESM-only and signs with WebCrypto, which jsdom does not provide.

- It is listed in `transpilePackages` in `next.config.ts` — `next/jest` derives
  `transformIgnorePatterns` from that list, which is what makes it loadable.
- Session tests use a `@jest-environment node` docblock for WebCrypto.
- `jest.setup.ts` therefore runs in both environments, so every `window` stub is
  guarded by a `typeof window !== 'undefined'` check.

### `window.location`

Non-configurable in current jsdom, so it cannot be stubbed. Full-document
navigation goes through `lib/navigation.ts`, and tests mock that one module.
This also documents _why_ those three call sites use a hard navigation.

### The proxy matcher test

`proxy-matcher.test.ts` reads `proxy.ts` as text and extracts the matcher array
with a regex. Unusual, and deliberate: Next requires the matcher to be a static
literal, so it cannot be imported from the domain, and importing `proxy.ts`
itself pulls in `next/server`, which needs globals jsdom lacks. Reading the
source is the only way to assert the two stay in sync.

---

## Playwright specifics

**Runs against a production build** (`next start`), not `next dev`. Dev-mode
timing hides hydration and caching bugs — including the cached-redirect bug in
`DECISIONS.md` §3.

**Accessible names include a hidden suffix.** Required fields render a
visually-hidden `(bắt buộc)`, so the accessible name is `"Địa chỉ (bắt buộc)"`.
Locators use anchored regexes: `getByLabel(/^Địa chỉ/)`.

**Two cookie jars.** `page.request` shares the browser context's cookies; the
bare `request` fixture does not. The bare fixture is used to prove an endpoint
rejects anonymous callers; `page.request` to call it as the signed-in user.
Getting this backwards produces a confusing 401.

**Shared demo account.** Every spec signs in as the same fan and the order store
is per-user, so a parallel run legitimately leaves several orders on the page.
Assertions are scoped to the order the test just placed via the `placedOrder`
helper, rather than serialising the suite.

**Rate limits are raised for the suite.** Dozens of logins from one IP would
trip the shipped 8-per-minute limit. Limits are env-configurable with the secure
values as defaults; the limiter itself is unit-tested with its own ceiling, so
nothing goes uncovered (`DECISIONS.md` §7).

**Mobile Safari exclusions.** The skip-link test is skipped on mobile, because
iOS Safari does not move focus between links with Tab — the assertion would be
meaningless rather than failing. The reason is in a comment at the skip.

---

## Accessibility testing, honestly

`e2e/accessibility.spec.ts` checks the skip link, single `<h1>` per page, image
alt text, keyboard operation of the purchase flow, `role="alert"` +
`aria-describedby` wiring on form errors, named stepper controls, and no
horizontal overflow at 320px.

That catches regressions. It does not establish compliance. Full WCAG
conformance requires manual testing with real assistive technology and expert
review; this suite is not a substitute and is not presented as one.

---

## CI

`.github/workflows/ci.yml` runs lint, typecheck, unit tests with coverage, the
production build, and the E2E suite on both browsers. `forbidOnly` is set under
CI so a stray `test.only` fails the build, and retries are capped at 1 — a test
that only passes on retry is a flaky test, not a passing one.
