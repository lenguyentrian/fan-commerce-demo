# AGENTS.md — rules for coding agents working in this repo

This is the shared, tool-neutral brief. Cursor, Claude Code, GitHub Copilot and
Kiro all point at it (see `.cursor/rules/`, `CLAUDE.md`,
`.github/copilot-instructions.md`, `.kiro/steering/`), so the rules live in one
place and cannot drift between tools.

Read this before writing code. If a request conflicts with something here, say
so instead of silently picking one.

---

## 1. What this project is

A fan-commerce platform: official merch, concert tickets and fan-club
memberships. Money changes hands. That single fact drives most of the rules
below — a rendering glitch is a bug, a pricing glitch is a refund and an
apology.

Stack: TypeScript everywhere, Next.js App Router + React 19 + Tailwind 4 on the
web, a framework-free domain package shared with a planned Flutter app.

## 2. Repository map

```
packages/core     Framework-free domain + API contract. No React, no Next, no Node built-ins.
packages/ui       Design system. Presentational only. No data fetching, no routing.
apps/web          Next.js app. Pages, route handlers, server-only code, client stores.
apps/mobile       Flutter app (phase 2). Mirrors packages/core in Dart.
proto/            Protobuf contracts, for when a service moves to gRPC.
docs/             Architecture, workflow, testing and security notes.
prompts/          Reusable prompts for recurring tasks in this codebase.
```

## 3. Non-negotiables

1. **Money is never a float.** Use the `Money` type from `@fc/core`: an integer
   count of minor units plus a currency. Never `number` for a price, never
   `parseFloat`, never `toFixed` for arithmetic.
2. **The server owns prices.** Treat anything a client sends about price, name
   or stock as a claim to be discarded. Re-derive it from the catalogue. See
   `apps/web/src/server/orders.ts`.
3. **Validate at the boundary with Zod.** Every request body, query string,
   external response and persisted blob gets parsed, not cast. `as` on untrusted
   data is a bug.
4. **Business rules live in `@fc/core`.** If a rule would also be true in the
   mobile app, it does not belong in a React component or a route handler.
5. **Authorize in the handler, not only in the proxy.** `proxy.ts` guards
   navigation for UX. Every protected route handler and page calls
   `requireUser()`. A hidden button is not an access control.
6. **Mutations that create something are idempotent.** Checkout carries a
   client-generated `idempotencyKey`; the server returns the existing order for
   a repeated key.
7. **Errors are typed, not strings.** Throw `ApiError` with an `ApiErrorCode`.
   UI switches on the code, never on an HTTP status number or a message.
8. **Never log or return secrets, tokens, raw request bodies or stack traces.**
   Server-side `console.error` is fine; the client gets a safe message.

## 4. Conventions

- **Files**: `kebab-case.ts` / `kebab-case.tsx`. Components `PascalCase`,
  functions and variables `camelCase`, constants `SCREAMING_SNAKE_CASE`.
- **Server Components by default.** Add `'use client'` only when you need
  state, effects, refs or browser APIs — and then keep the client component as
  small as possible.
- **Never call `cookies()` or `headers()` in the root layout.** It marks every
  route dynamic and discards static rendering for the whole catalogue. Use a
  client island instead (`components/auth/auth-menu.tsx`).
- **Imports**: `@fc/core` and `@fc/ui` for shared code, `@/` for app-local.
  Never reach into another package's internals (`@fc/core/src/...`).
- **Comments explain _why_.** Do not narrate what the next line does. Do
  document a non-obvious ordering, a workaround, or a rule that looks arbitrary
  but is not.
- **No barrel re-exports inside `apps/web`.** Import from the real path.

## 5. Testing expectations

Write the test at the cheapest level that can catch the bug:

| Level | Tool | Lives in | Covers |
| --- | --- | --- | --- |
| Domain | Jest (node) | `packages/core/src/**/*.test.ts` | Pricing, cart rules, schemas, auth helpers |
| Component / store | Jest + RTL (jsdom) | `apps/web/src/**/*.test.tsx` | Rendering, interaction, client state |
| Server module | Jest (node) | `apps/web/src/server/**/*.test.ts` | Pricing authority, idempotency, sessions, rate limits |
| Journey | Playwright | `apps/web/e2e/**` | Browse → cart → login → pay → order; access control; a11y basics |

Rules:
- A bug fix ships with a test that fails before the fix.
- Assert on behaviour and accessible roles, not on class names or snapshots.
- Never weaken an assertion to make a test pass. If a test and the code
  disagree, work out which one is wrong and say so.
- Do not add a test that only passes because of a `waitForTimeout`.

## 6. How to work

1. Read the relevant existing code first. Match what is there.
2. Prefer the smallest change that solves the problem. No speculative
   abstraction, no unrequested refactor, no new dependency without saying why.
3. Run `npm run verify` (typecheck + unit tests + build) before claiming done.
   Run `npm run test:e2e` when touching a journey, auth or the proxy.
4. Report honestly. If something is untested, partially working or guessed,
   say which part. "Should work" is not a status.

## 7. Known traps in this codebase

These cost real debugging time. They are documented in `docs/DECISIONS.md` with
the full story.

- Module-level `Map` state is instantiated **twice** — route handlers and page
  renders are separate module graphs. Pin shared server state to `globalThis`.
- `secure: NODE_ENV === 'production'` on a cookie silently drops it when a
  production build is served over HTTP. Derive `secure` from the request
  protocol.
- `router.replace(dest)` after login can land back on `/login`: the client
  router cached the proxy's redirect for the protected route. Use
  `hardNavigate()` after a session change.
- `router.refresh()` next to `router.replace()` cancels the navigation.
- A selector that computes a new object (`totals(state.cart)`) re-renders
  forever under Zustand v5. Memoize outside the selector.
- `sr-only` controls are unreachable by pointer and by Playwright. Use a
  transparent full-size input instead.
