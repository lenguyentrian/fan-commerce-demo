# Fan Commerce — an AI-native engineering reference

A working fan-commerce platform (official merch, concert tickets, fan-club
memberships) built with coding agents, and documented so the **process** is
inspectable rather than asserted.

The app is the evidence. The thing on offer is the engineering around it: the
rules that keep generated code on-architecture, the review step that catches
plausible-but-wrong output, and an honest log of the bugs that got through
generation and were caught by review and tests.

```bash
npm install
npm run dev          # http://localhost:3000
```

Sign in with `fan@fancommerce.dev` / `fanclub2026`. Users, products and orders
are in-memory fixtures; nothing real is stored and no payment is taken.

---

## Status at a glance

|                       |                                                                    |
| --------------------- | ------------------------------------------------------------------ |
| Unit tests            | **197** passing — 131 domain (~1s), 66 web (~2s)                   |
| E2E tests             | **30 per browser × 2 browsers** (Chromium, mobile Safari)          |
| Domain coverage       | 96% statements, 86% branches (enforced floors 80 / 75)             |
| Lint                  | zero warnings tolerated, layer boundaries enforced as lint errors  |
| Rendering             | catalogue static/SSG, only session routes dynamic — asserted in CI |
| Bugs caught pre-merge | **6**, each written up in [`docs/DECISIONS.md`](docs/DECISIONS.md) |

Everything above is reproducible with `npm run verify && npm run test:e2e`.

---

## Why this repository exists

"I use Cursor and Claude Code" is not a skill claim — everyone does. The claim
worth making is narrower:

> Agents can draft a codebase like this quickly. They cannot be trusted to
> decide what is correct. So the engineering moves to encoding the rules,
> decomposing the work, and reviewing adversarially.

This repository is that claim with its homework shown.

### The part that is actually interesting

Six real bugs reached the diff and were caught before merge. **Not one of them
was bad-looking code.** Every one was plausible, conventionally formatted, and
wrong:

| Bug                                                                                                                                                                                                            | Caught by   | Why generation missed it                                                       |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------ |
| A module-level `Map` instantiated **twice** — Next compiles route handlers and page renders as separate module graphs. Orders were created and then invisible to the page listing them, with no error anywhere | E2E         | Correct in isolation; needs a write-through-API, read-through-page test to see |
| `secure: NODE_ENV === 'production'` on the session cookie. Served over HTTP, the browser silently discarded it: login returned `200` and the user stayed anonymous                                             | E2E         | A textbook-correct line that is wrong in context                               |
| `router.replace()` + `router.refresh()` after login, landing a freshly authenticated user back on `/login` — the client router was serving its cached copy of the proxy's redirect                             | E2E         | Idiomatic pattern that cancels its own navigation                              |
| A Zustand selector returning a freshly built object → infinite re-render under v5's `Object.is`                                                                                                                | Review      | Reads perfectly                                                                |
| `setState` inside an effect for the hydration flag                                                                                                                                                             | ESLint      | Worked; just caused cascading renders                                          |
| An `sr-only` radio, clipped to 1px and therefore unreachable by pointer or by Playwright                                                                                                                       | E2E timeout | Looks like the standard a11y pattern                                           |

Plus three E2E "failures" where the **test** was wrong and the code was right —
recorded too, because the tempting move is to edit the code until the suite goes
green.

Full write-ups: [`docs/DECISIONS.md`](docs/DECISIONS.md).

---

## How the agents are configured

Four tools, **one** canonical brief — [`AGENTS.md`](AGENTS.md). Tool-specific
files add only what is specific to that tool, so the rules cannot drift.

```
AGENTS.md                            the brief: layers, money rules, traps, done criteria
CLAUDE.md                            long multi-file tasks; self-review list
.github/copilot-instructions.md      short, concrete, for inline completion
.cursor/rules/
  00-project.mdc        always      layer boundaries, hard rules
  10-core-package.mdc   core/**     purity, portability, the Dart target
  20-design-system.mdc  ui/**       a11y patterns, forbidden imports
  30-web-app.mdc        web/**      rendering, state, handlers
  40-testing.mdc        tests       levels, jsdom traps
  50-review-ai-output.mdc  always   the review checklist
.kiro/
  steering/     product · tech · structure (always) · security (server code only)
  specs/        checkout-journey: requirements → design → tasks
  hooks/        domain tests on save · typecheck on save · verify after task · re-review writes
prompts/        seven reusable prompts for recurring tasks
```

Rules are **scoped by glob** rather than dumped in one file, because a single
enormous instruction file gets partially ignored as context fills. The clearest
payoff is `.kiro/steering/security.md`: long, specific, and loaded only when
server code is being written.

### Rules that demonstrably changed the output

- **"Money is never a float."** Without it: `price: number` and `toFixed(2)`,
  every time. With it, the `Money` type propagated through the codebase
  unprompted.
- **"The server owns prices."** Produced `rebuildLines()` — which discards the
  client's claimed price entirely — without being asked for it specifically.
- **"Business rules live in `@fc/core`."** The difference between 131 domain
  tests that run in one second and the same rules scattered across components,
  reachable only through a browser.

### Boundaries are enforced, not requested

```
$ eslint packages/core/src/domain/probe.ts
  1:1   error  'react' import is restricted — @fc/core must stay framework-free
  2:22  error  Unexpected use of 'process'. No Node globals in @fc/core — it is
               ported to Dart. Inject the value as an option instead
  2:71  error  Unexpected use of 'window'. No browser globals in @fc/core
```

`packages/core` also compiles **without the DOM lib**, so a browser-only type is
a compile error. That constraint exists for one reason: the domain is the thing
the Flutter app will reuse.

More: [`docs/AI_NATIVE_WORKFLOW.md`](docs/AI_NATIVE_WORKFLOW.md).

---

## Architecture

One decision drives the rest: **a business rule has exactly one home**,
`packages/core`, which is framework-free so it can be imported by Next.js today
and transcribed to Dart tomorrow.

```
┌──────────────────────────────────────────────────────────────┐
│ apps/web (Next.js 16)          apps/mobile (Flutter, phase 2)│
│  pages · handlers · stores      screens · blocs              │
└──────────────┬────────────────────────────┬──────────────────┘
               │                            │
       ┌───────▼────────┐                   │  Dart port,
       │  packages/ui   │                   │  tests ported
       │  design system │                   │  one-for-one
       └───────┬────────┘                   │
               │                            │
       ┌───────▼────────────────────────────▼─────────────────┐
       │  packages/core                                       │
       │  money · catalog · cart · order · auth               │
       │  errors · contract · client                          │
       │  depends on: zod. nothing else.                      │
       └──────────────────────────────────────────────────────┘
```

### Rendering strategy, verified in CI

```
┌ ○ /                      1h revalidate       ← ISR
├ ○ /cart                                      ← static shell, cart in localStorage
├ ƒ /products                                  ← depends on searchParams
├ ƒ /checkout  /orders  /login                 ← depend on the session
└   /products/[slug]
  ├ ● /products/anh-trai-tour-tee              ← SSG, 8 paths prerendered
  └ ● [+7 more paths]
```

This only holds because the root layout reads nothing request-specific. One
`cookies()` call there turns **every** route dynamic — which happened, silently,
and is why the session-dependent header is an isolated client island. CI asserts
the prerendered output still exists, because nothing fails when this regresses.

### The two rules that make it commerce, not CRUD

**Pricing authority.** `placeOrder()` keeps only `productId`, `variantId` and
`quantity` from the request. Price, name and image are re-derived from the
catalogue; stock is re-checked at submit time. A crafted `unitPrice: 1` for a
450.000đ tee produces a 450.000đ order — asserted in
`e2e/security.spec.ts`.

**Idempotency.** One UUID per mounted checkout form, keyed server-side as
`${userId}:${key}`. A timeout followed by a second tap of Pay returns the
original order. It is also why the API client is willing to retry a POST at all.

More: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## Testing

Test at the cheapest level that can catch the bug.

| Level                      | Tool                   | Count   | Runtime |
| -------------------------- | ---------------------- | ------- | ------- |
| Domain                     | Jest (node)            | 131     | ~1s     |
| Component / store / server | Jest + RTL (jsdom)     | 66      | ~2s     |
| Journey                    | Playwright, 2 browsers | 30 each | ~15s    |

```bash
npm run test:core    # ~1s — a hook runs this on every save in packages/core
npm test             # all unit tests
npm run test:e2e     # Playwright against a production build
npm run verify       # typecheck + unit + build — the gate
```

E2E covers the revenue path end to end, catalogue filter/search, **access
control** (anonymous API calls, price tampering, idempotency, open redirect,
security headers, cookie not readable from JS) and **accessibility basics**
(skip link, heading structure, keyboard operation, `role="alert"` wiring, 320px
layout).

On accessibility, stated plainly: the suite catches regressions. It does not
establish WCAG compliance — that needs manual testing with real assistive
technology and expert review, and is not claimed here.

More: [`docs/TESTING.md`](docs/TESTING.md).

---

## Repository map

```
AGENTS.md · CLAUDE.md · .cursor/ · .kiro/ · .github/   agent configuration
prompts/        seven reusable task prompts, each with why-it-is-shaped-this-way
docs/
  AI_NATIVE_WORKFLOW.md   tools, loop, hooks, what agents got wrong
  ARCHITECTURE.md         layers, rendering, request pipeline, error model
  DECISIONS.md            every non-obvious bug and why the fix looks like that
  SECURITY.md             threat model, defences, and the gaps
  TESTING.md              strategy and the jsdom/Playwright traps
proto/          protobuf contracts — designed, not deployed; see its README
packages/core   domain + API contract (zod only)
packages/ui     design system (tokens, accessible primitives)
apps/web        Next.js app
apps/mobile     Flutter plan for phase 2, and what is already prepared for it
```

---

## Stack

TypeScript 5.9 · Next.js 16 (App Router, Turbopack) · React 19 · Tailwind CSS 4
· Zod 4 · Zustand 5 · `jose` · Jest 30 + Testing Library · Playwright 1.63 ·
ESLint 10 flat config · npm workspaces.

No Prettier, no Husky, no component library, no ORM — adding any of them needs a
stated reason. TypeScript is pinned to 5.9 deliberately: `ts-jest` declares
`typescript: >=4.3 <7`.

---

## Phase 2: Flutter

Not built. What exists is the preparation, which is the part that is hard to
retrofit:

- a domain package with **no** framework or platform dependencies, enforced by
  lint and by compiling without the DOM lib
- 131 domain tests that serve as its specification
- an error model whose codes already map to gRPC status numbers
- protobuf contracts in [`proto/`](proto/)
- a written porting procedure whose central instruction is **port the tests
  before the implementation** — the tests are where the invisible decisions live

"We'll share code with mobile later" is easy to say. Keeping a domain package
importable by a Dart port is a constraint you honour on every commit.

Details: [`apps/mobile/README.md`](apps/mobile/README.md),
[`prompts/07-port-rule-to-dart.md`](prompts/07-port-rule-to-dart.md).

---

## Scope, honestly

**Implemented and tested:** catalogue with filter/search, product detail with
variants and stock, persistent cart, promo codes, cookie-based auth with
role-aware authorization, checkout with server-side pricing and idempotency,
per-user order history, error boundaries, security headers, rate limiting,
responsive and keyboard-accessible UI, CI.

**Deliberately not implemented:** real payment gateway, email, stock
reservation, guest checkout, admin tooling, a database. `server/users.ts` and
`server/orders.ts` are the two files a real deployment replaces; the interfaces
they expose are the seam.

**Not claimed:** a productivity multiplier from using agents. The number that
would matter — defects reaching production — needs a production deployment and
real users. What is measurable here is six real bugs caught before merge, by a
process that is written down and repeatable.

---

## License

MIT.
