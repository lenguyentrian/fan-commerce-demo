# Checkout journey — tasks

All complete. Preserved to show how the work was decomposed for agent
execution: each task is small, independently verifiable, and names the
requirement it satisfies and the test that proves it.

The ordering is deliberate — domain first, then server, then UI. Done the other
way round, the rules end up scattered across components and the tests all need
a browser.

- [x] **1. Money value object**
  Integer minor units, mixed-currency guard, half-up rounding, Intl formatting.
  _Satisfies:_ foundation for AC-1.4, AC-2.3 · _Proof:_ `money.test.ts`

- [x] **2. Catalogue schemas and stock helpers**
  `productSchema` as the source of truth, `availableQuantity`, `isSoldOut`,
  `discountPercent`, query-param coercion with caps.
  _Satisfies:_ AC-1.2, AC-4.3 · _Proof:_ `catalog.test.ts`

- [x] **3. Cart rules**
  Add/merge/remove lines, quantity ceilings, promo normalization, and `totals()`
  with the discount-before-shipping ordering pinned by a test.
  _Satisfies:_ AC-1.2, AC-1.3, AC-2.1, AC-2.3 · _Proof:_ `cart.test.ts`

- [x] **4. Order and checkout schemas**
  Vietnamese phone validation, payment methods, UUID idempotency key, order
  shape, status labels.
  _Satisfies:_ AC-4.1, AC-4.6 · _Proof:_ `order.test.ts`

- [x] **5. Auth domain**
  Login schema, session user shape, `PROTECTED_PATHS`, role ranking,
  `safeRedirect` against open redirects.
  _Satisfies:_ AC-3.1, AC-3.3 · _Proof:_ `auth.test.ts`

- [x] **6. Error model and typed API client**
  `ApiError` with HTTP + gRPC mappings, deadline, correlation headers, retry
  limited to transient codes and idempotent calls, response schema validation.
  _Satisfies:_ NFR-4 support, error UX · _Proof:_ `errors.test.ts`, `client.test.ts`

- [x] **7. Design system primitives**
  Button (`aria-busy`), accessible fields with `aria-describedby` +
  `role="alert"`, quantity stepper, price, card, badge, alert, skeleton,
  tokens with a focus-visible baseline.
  _Satisfies:_ NFR-3 · _Proof:_ `accessibility.spec.ts`

- [x] **8. Session handling**
  JWT via `jose` (Edge-compatible), httpOnly cookie, `secure` derived from the
  request protocol, issuer/audience/expiry verification plus Zod re-validation.
  _Satisfies:_ NFR-5 · _Proof:_ `session.test.ts`

- [x] **9. Server plumbing**
  `withErrorHandling`, `parseJsonBody`, `parseSearchParams`, env-configurable
  rate limiter, scoped client keys.
  _Satisfies:_ NFR-4 · _Proof:_ `http.test.ts`

- [x] **10. Order store with pricing authority and idempotency**
  Re-price from the catalogue, re-check stock, idempotency per `(user, key)`,
  per-user isolation, `globalThis`-pinned state.
  _Satisfies:_ AC-2.4, AC-4.2, AC-4.3, AC-4.4, AC-5.1 · _Proof:_ `orders.test.ts`

- [x] **11. Route handlers**
  Products (public, capped), login (rate limited, non-enumerable), logout,
  session, orders (scoped), checkout (authorized, idempotent), health.
  _Satisfies:_ AC-3.4, AC-5.1 · _Proof:_ `security.spec.ts`

- [x] **12. Edge proxy**
  Redirect anonymous navigation with the destination preserved; static matcher
  kept in sync with the domain by a source-reading test.
  _Satisfies:_ AC-3.1 · _Proof:_ `proxy-matcher.test.ts`, `security.spec.ts`

- [x] **13. Cart store**
  Delegates every mutation to `@fc/core`, surfaces domain errors, validates
  persisted state, hydration flag via `useSyncExternalStore`.
  _Satisfies:_ AC-1.5, AC-1.6 · _Proof:_ `cart-store.test.ts`

- [x] **14. Catalogue UI**
  Static home with ISR, SSG product pages with `generateStaticParams`,
  URL-driven filter and debounced search, variant picker, sold-out states.
  _Satisfies:_ US-2, NFR-1 · _Proof:_ `catalog.spec.ts`, build route table

- [x] **15. Cart and checkout UI**
  Shared `OrderSummary`, promo field, address form with focus management,
  payment selection, idempotency key per mounted form.
  _Satisfies:_ AC-1.1, AC-1.4, AC-2.2, AC-4.1 · _Proof:_ `checkout-journey.spec.ts`

- [x] **16. Auth UI and session store**
  Login form validating with the server's own schema, client session cache,
  `hardNavigate` after a session change.
  _Satisfies:_ AC-3.2 · _Proof:_ `login-form.test.tsx`, `checkout-journey.spec.ts`

- [x] **17. Orders page**
  Per-user server-rendered list with status, lines, totals, address, and a
  confirmation banner for the order just placed.
  _Satisfies:_ AC-4.5 · _Proof:_ `checkout-journey.spec.ts`

- [x] **18. E2E suite and CI**
  Journey, catalogue, access-control and accessibility specs on chromium and
  mobile-safari; GitHub Actions running lint, typecheck, unit tests, build and
  E2E.
  _Satisfies:_ NFR-1, NFR-2, NFR-3 · _Proof:_ CI run

## Follow-ups, not started

- [ ] Order detail page with a downloadable e-ticket QR
- [ ] Guest checkout with email-only identification
- [ ] Stock reservation window during checkout
- [ ] Replace the in-memory stores with a real database
