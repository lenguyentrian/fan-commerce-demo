# Checkout journey — design

Requirements: [`requirements.md`](./requirements.md).

## Shape of the flow

```
/products/[slug]  (SSG)        AddToCart (client)  ──▶ cart store (localStorage)
        │
        ▼
/cart  (static shell)          CartView (client)   ──▶ totals() from @fc/core
        │  "Thanh toán"
        ▼
proxy.ts (edge)                no session? ──▶ /login?next=/checkout
        │
        ▼
/login (dynamic)               LoginForm ──▶ POST /api/auth/login ──▶ httpOnly cookie
        │                                   └─▶ session store, then hardNavigate(next)
        ▼
/checkout (dynamic)            requireUser() server-side
        │                      CheckoutForm ──▶ POST /api/checkout
        ▼                                        ├─ requireUser
/orders?placed=CODE            server-rendered   ├─ rateLimit
                               from the store    ├─ Zod parse
                                                 ├─ re-price from catalogue
                                                 ├─ re-check stock
                                                 └─ idempotency lookup
```

## Where each decision lives

| Decision | Location | Why there |
| --- | --- | --- |
| Line totals, discount, shipping, grand total | `@fc/core/domain/cart.ts` | Must be identical on web and mobile |
| Address and payload validation | `@fc/core/domain/order.ts` | Shared by client form and server handler |
| Which routes need a session | `@fc/core/domain/auth.ts` (`PROTECTED_PATHS`) | Consumed by both the proxy and tests |
| Pricing authority, stock re-check, idempotency | `apps/web/src/server/orders.ts` | Server-only, and the trust boundary |
| Cart persistence and error surfacing | `apps/web/src/store/cart-store.ts` | Client state, no rules |

The rule of thumb: if the answer would be the same in the Flutter app, it goes
in `@fc/core`.

## Two-layer authorization

`proxy.ts` redirects anonymous **navigation** so the user gets a login page
instead of an error. It is not the security boundary — it never sees a direct
`POST /api/checkout`. Every protected handler and page independently calls
`requireUser()`.

The duplication between `PROTECTED_PATHS` and `config.matcher` is forced (Next
parses the matcher statically) and is guarded by
`src/__tests__/proxy-matcher.test.ts`, which reads `proxy.ts` as text.

## Idempotency

`CheckoutForm` generates one UUID per mounted form, held in a `useRef`. It is
sent both in the body and as `x-idempotency-key`, and it is what makes the
`ApiClient` willing to retry a POST at all. The server keys on
`${userId}:${key}` so two users cannot collide, and returns the stored order on
a repeat.

The failure this prevents: the request times out on a flaky mobile connection,
the fan taps Pay again, and two orders exist. Same reasoning as a repayment flow
in a banking app.

## Pricing authority

`placeOrder()` rebuilds every line from `findProductById`, keeping only
`productId`, `variantId` and `quantity` from the request. Price, name, image and
variant label come from the catalogue. A crafted `unitPrice: 1` is therefore
inert — asserted in `e2e/security.spec.ts`.

## Rendering strategy

The root layout reads no cookies, so the catalogue stays static. The
session-dependent header is a client island (`AuthMenu`) that probes
`/api/auth/session` once and caches the result in a Zustand store. The cost is a
small skeleton in the header on first paint; the benefit is that `/` is ISR and
`/products/[slug]` is SSG.

## Navigation after a session change

Login, logout and successful checkout all use `hardNavigate()`. A soft
navigation can serve a cached RSC payload rendered for the previous session —
including the proxy's redirect for `/checkout`, which lands a freshly
authenticated user back on `/login`. See `docs/DECISIONS.md` §3.

## Error handling

One shape everywhere: `ApiError` with a transport-agnostic code that maps to
both HTTP and gRPC status numbers. `withErrorHandling` converts thrown
`ApiError` and `ZodError` into responses; anything else becomes a generic 500
with the real error logged server-side only. The client switches on `code`:
`UNAUTHENTICATED` triggers re-login, `INVALID_ARGUMENT` populates field errors,
transient codes are retried by the client.

## Test plan

| Requirement | Covered by |
| --- | --- |
| AC-1.x | `cart.test.ts`, `cart-store.test.ts`, `order-summary.test.tsx`, `checkout-journey.spec.ts` |
| AC-2.3 | `cart.test.ts` ("applies the discount before deciding on free shipping") |
| AC-2.4 | `orders.test.ts`, `checkout-journey.spec.ts` |
| AC-3.x | `auth.test.ts` (`safeRedirect`), `security.spec.ts` |
| AC-4.2–4.4 | `orders.test.ts`, `security.spec.ts` |
| AC-5.x | `orders.test.ts` ("never returns another user orders") |
| NFR-2, NFR-3 | `accessibility.spec.ts`, mobile-safari project |
| NFR-4 | `http.test.ts` |
| NFR-5 | `session.test.ts`, `security.spec.ts` |
