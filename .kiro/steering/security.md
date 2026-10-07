---
inclusion: fileMatch
fileMatchPattern: 'apps/web/src/{server,app/api}/**'
---

# Security rules for server-side code

This file loads automatically when working on route handlers or anything in
`src/server`. Full rationale in `docs/SECURITY.md`.

## Authentication and authorization

- The session is a signed JWT in an **httpOnly** cookie. Never in
  `localStorage`, never in a response body, never in a URL.
- `secure` on the cookie is derived from the request protocol
  (`x-forwarded-proto`, else the URL), not from `NODE_ENV`. Hardcoding either
  value is wrong — one drops the cookie over HTTP, the other leaks it.
- Verify signature **and** issuer **and** audience **and** expiry, then
  re-validate the payload shape with Zod. A cryptographically valid token with
  an unexpected shape is treated as no session.
- `requireUser(role)` at the top of every non-public handler. The proxy guards
  navigation only; API routes can be called directly.
- List endpoints scope by the session user's id. Never accept a user id from
  the client as the thing to look up.

## Input

- Parse with a Zod schema from `@fc/core`. Never `as`.
- Cap anything that controls work: page size, array length, string length.
- Re-derive prices, names and stock from the catalogue. A client-supplied
  `unitPrice` is an attack, not a value.
- Encode path segments built from user input (`encodeURIComponent`).
- Sanitize redirect targets with `safeRedirect()` — `?next=https://evil.com`
  must not be followed.

## Output

- Throw `ApiError(code, userSafeMessage)`. The message is shown to a user, so it
  says what to do, not what broke.
- Never return or log a stack trace, a raw request body, a token or a secret.
  Server-side `console.error` is the right place for the real error.
- Login returns one generic message for both "unknown email" and "wrong
  password", and runs a hash either way, so neither the body nor the timing
  reveals which emails exist.

## Mutations

- Order-creating endpoints are idempotent on a client-supplied
  `idempotencyKey`, scoped per user. A double-tapped Pay button, or a retry
  after a timeout, must not create two orders.
- Rate-limit authentication and order creation. The in-memory limiter is
  per-instance and explicitly not production-grade; a real deploy needs a shared
  store.

## Secrets and config

- No credential, key or endpoint hardcoded. Read from `process.env`.
- `assertProductionSecret()` makes a missing or default `SESSION_SECRET` a
  startup failure in production rather than a silent weakness.

## When reviewing generated code here

The recurring failure is plausible-looking code that skips one of these: a
handler without `requireUser`, a body read with `await request.json()` and used
unparsed, or an error handler that returns `error.message` straight to the
client. Check for those three first.
