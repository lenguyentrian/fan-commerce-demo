# Architecture

## The one decision everything else follows from

A business rule has exactly one home: `packages/core`. It is framework-free, so
it can be imported by the Next.js app today and transcribed to Dart for the
Flutter app in phase 2.

Everything else — the layering, the import rules, the test strategy — is a
consequence of protecting that.

```
┌─────────────────────────────────────────────────────────────┐
│ apps/web (Next.js)              apps/mobile (Flutter, P2)   │
│  pages · handlers · stores       screens · blocs            │
└───────────────┬──────────────────────────┬──────────────────┘
                │                          │
        ┌───────▼────────┐                 │ (Dart port,
        │  packages/ui   │                 │  tests ported
        │  design system │                 │  one-for-one)
        └───────┬────────┘                 │
                │                          │
        ┌───────▼──────────────────────────▼──────────────────┐
        │  packages/core                                      │
        │  money · catalog · cart · order · auth              │
        │  errors · contract · client                         │
        │  depends on: zod. nothing else.                     │
        └─────────────────────────────────────────────────────┘
```

Import rules, enforced by review and partly by ESLint:

| Package | May import | Must never import |
| --- | --- | --- |
| `@fc/core` | `zod` | react, next, node built-ins, `window`, anything from `apps/` |
| `@fc/ui` | `@fc/core`, `clsx`, react | `next/navigation`, any API client, any store, `@/*` |
| `@fc/web` | `@fc/core`, `@fc/ui`, next, react, zustand | — |

The packages ship raw TypeScript and are compiled by Next via
`transpilePackages`. No build step, no stale `dist/`, no watch process.

---

## `packages/core` — the domain

```
src/domain/
  money.ts     Money value object. Integer minor units, never a float.
  catalog.ts   Product schemas, stock helpers, query coercion with caps.
  cart.ts      Pure cart reducers + totals(). The pricing rules.
  order.ts     Checkout payload, address validation, order shape, statuses.
  auth.ts      Login schema, session shape, PROTECTED_PATHS, safeRedirect.
src/api/
  errors.ts    ApiError with codes mapped to both HTTP and gRPC statuses.
  contract.ts  Endpoint paths, response schemas, shared header names.
  client.ts    Typed fetch: deadline, retry policy, response validation.
```

Three properties worth noting:

**Schemas are the source of truth.** Types are `z.infer`-ed from Zod schemas, so
a hand-written interface cannot drift from the validator. External data is
parsed, never cast.

**Money cannot be a float.** `money()` throws on a non-integer, so a float
cannot enter the domain at all. `multiply` rounds half-up deterministically,
chosen because Dart's `round()` matches for non-negative values.

**Orderings that affect outcomes are pinned by tests.** `totals()` applies the
discount to the subtotal *before* deciding free shipping. Nothing in the
signature says so; a test does, because that ordering changes what customers
pay and a well-meaning refactor would reverse it.

---

## `packages/ui` — the design system

Presentational only. Components take data and callbacks; they do not know where
data comes from or where a click leads.

Tokens live in `tokens.css` using Tailwind 4's `@theme`, with light/dark values
on `:root` and `.dark`, so no component needs a `dark:` colour variant. The same
token names are the target for the Flutter `ThemeExtension` in phase 2.

Accessibility is built in, not retrofitted. Two patterns are settled and
documented because both were arrived at the hard way:

- Loading buttons use `aria-busy` + `aria-disabled`, not the `disabled`
  attribute — a disabled button loses focus mid-submit and announces nothing.
- Visually hidden inputs are transparent and full-size, never `sr-only` — a
  clipped 1px control has no hit area for a pointer or for Playwright.

---

## `apps/web` — the Next.js app

### Rendering strategy

| Route | Strategy | Reason |
| --- | --- | --- |
| `/` | Static, `revalidate = 3600` | Catalogue changes rarely |
| `/products/[slug]` | SSG, `generateStaticParams` | 8 stable paths |
| `/cart` | Static shell | Cart lives in `localStorage` |
| `/products` | Dynamic | Depends on `searchParams` |
| `/checkout`, `/orders`, `/login` | Dynamic | Depends on the session |

This only holds because the root layout reads nothing request-specific. A single
`cookies()` call there marks **every** route dynamic — which is exactly what
happened, and is why the session-dependent header is a client island
(`components/auth/auth-menu.tsx`). The build route table is the check; see
`DECISIONS.md` §8.

### Request pipeline

```
Request
  │
  ├─ proxy.ts (Edge) ─── protected path & no session? → 307 /login?next=…
  │                      UX guard only, not the security boundary
  ▼
Route handler
  │
  ├─ withErrorHandling  ApiError → mapped status · ZodError → 400 + fields
  │                     anything else → generic 500, real error logged server-side
  ├─ requireUser(role)  the actual authorization check
  ├─ rateLimit(...)     env-configurable, fixed window, per-instance
  ├─ parseJsonBody      Zod schema from @fc/core
  └─ server module      re-prices from the catalogue, enforces idempotency
```

Authorization is deliberately in two layers. The proxy gives an anonymous
visitor a login page instead of an error. It never sees a direct
`POST /api/checkout`, so every protected handler and page calls `requireUser()`
independently.

### Server-only code

`src/server/` holds everything that must never reach a client bundle: session
signing, password hashing, the data store, HTTP plumbing. ESLint forbids
`react` and `zustand` imports there.

Shared state between a handler and a page render is pinned to `globalThis`,
because Next compiles them into separate module graphs and a module-scope `Map`
exists twice (`DECISIONS.md` §1).

### Client state

Two Zustand stores, both thin:

- `cart-store.ts` — delegates every mutation to `@fc/core` and surfaces the
  resulting domain error. Persisted to `localStorage` and **validated on
  rehydration**, because persisted state is untrusted input: a stale build or a
  curious user can leave anything there.
- `session-store.ts` — caches "who am I" so the header is consistent across soft
  navigations. A UI convenience, never an authority on access.

Selector hooks are exported narrowly. A selector that constructs a new object
re-renders forever under v5's `Object.is` comparison, so derivations are
memoized outside the selector.

---

## Error model

One shape across the product. `ApiErrorCode` is transport-agnostic and maps to
both HTTP and gRPC status numbers:

```
INVALID_ARGUMENT → 400 / 3      NOT_FOUND          → 404 / 5
UNAUTHENTICATED  → 401 / 16     ALREADY_EXISTS     → 409 / 6
PERMISSION_DENIED→ 403 / 7      RESOURCE_EXHAUSTED → 429 / 8
DEADLINE_EXCEEDED→ 504 / 4      UNAVAILABLE        → 503 / 14
INTERNAL         → 500 / 13
```

UI switches on the **code**, never on a status number, so moving a service to
gRPC does not touch the presentation layer. The `ApiClient` uses the same codes
to decide retries: only `UNAVAILABLE` and `DEADLINE_EXCEEDED`, and only for
idempotent methods or calls carrying an idempotency key.

See [`../proto/README.md`](../proto/README.md) for the gRPC side.

---

## Transactional guarantees

The two rules that make this a commerce app rather than a CRUD demo:

**Pricing authority.** `placeOrder()` keeps only `productId`, `variantId` and
`quantity` from the request. Price, name, image and variant label are
re-derived from the catalogue, and stock is re-checked at submit time. A crafted
`unitPrice: 1` is inert — asserted in `e2e/security.spec.ts`.

**Idempotency.** The checkout form generates one UUID per mounted form. The
server keys on `${userId}:${key}` and returns the stored order for a repeat, so
a timeout followed by a second tap of Pay cannot produce two orders. This is the
same reasoning as a repayment flow in a banking app, and the reason the API
client is willing to retry a POST at all.

---

## What is deliberately missing

In-memory users, products and orders. No payment gateway, no email, no stock
reservation, no admin tooling. Single instance only.

These are omissions, not unfinished work. The repository is about the
engineering around the journey; `server/users.ts` and `server/orders.ts` are the
two files a real deployment replaces, and the interfaces they expose
(`verifyCredentials`, `placeOrder`, `listOrders`) are the seam.
