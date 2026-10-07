# Security notes

What is defended, how, and — importantly — what is not. This is a demo, and
being precise about the gaps is part of the point.

---

## Threat model

A fan-commerce platform moves money and holds shipping addresses. The realistic
attacks are unglamorous:

1. Paying less than the listed price by tampering with the request.
2. Reading or placing orders as someone else.
3. Credential stuffing against the login endpoint.
4. Stealing a session token via XSS.
5. Creating duplicate orders, by accident or on purpose.
6. Phishing via an open redirect on the login page.

Each is addressed below, with the test that proves it.

---

## 1. Pricing tampering

**Defence.** `placeOrder()` keeps only `productId`, `variantId` and `quantity`
from the request. Price, name, image and variant label are re-derived from the
catalogue, and remaining stock is re-checked at submit time.

```ts
// apps/web/src/server/orders.ts — rebuildLines()
// Server-authoritative snapshot. Anything the client sent about price,
// name or image is discarded.
```

**Proof.** `e2e/security.spec.ts` posts `unitPrice: { amount: 1 }` for a
450.000đ tee and asserts the recorded order is 450.000đ.
`server/orders.test.ts` covers the same at unit level, plus a forged product
name and an over-stock quantity.

---

## 2. Horizontal privilege escalation

**Defence, in two layers.**

`proxy.ts` redirects anonymous navigation to `/login?next=…`. This is a UX
guard: it means a visitor gets a login page rather than an error. It is **not**
the security boundary, because it never sees a direct API call.

Every protected handler and page calls `requireUser(role)` independently. Reads
are scoped by the session user's id; no endpoint accepts a user id from the
client as the thing to look up.

**Proof.** `security.spec.ts` asserts `GET /api/orders` and
`POST /api/checkout` return `401 UNAUTHENTICATED` to the anonymous `request`
fixture — which has its own cookie jar, so the call is genuinely unauthenticated
even in a spec that logs in elsewhere. `orders.test.ts` asserts one user never
sees another's orders.

**Kept honest.** `proxy-matcher.test.ts` reads `proxy.ts` as **text** and
compares the static matcher against `PROTECTED_PATHS` in `@fc/core`. Next
requires the matcher to be a literal, so the duplication is forced; adding a
protected route to the domain list and forgetting the proxy would otherwise ship
an unguarded page with no error anywhere.

---

## 3. Credential attacks

**Defences.**

- Passwords are scrypt-hashed with a per-user salt. Even in a demo with
  published credentials, storing plaintext would teach the wrong thing.
- Comparison is constant-time (`timingSafeEqual`).
- An unknown email still runs a hash against a decoy salt, so response time does
  not reveal which accounts exist.
- One generic message — "Email hoặc mật khẩu không đúng" — for both failure
  modes, so the response body does not either.
- Rate limited per IP: 8 attempts per minute by default.

**Proof.** `users.test.ts` covers wrong password, unknown email, and that no
hash or salt is ever returned to a caller. `http.test.ts` covers the limiter,
including per-key independence and window expiry.

**Gap, stated plainly.** The limiter is an in-memory fixed window, so it resets
per instance and per deploy. A real deployment needs a shared store. This is
commented at the implementation, not buried here.

---

## 4. Session token theft

**Defence.** The session is a signed JWT in an **httpOnly**, `SameSite=Lax`
cookie. Nothing is kept in `localStorage`, so an XSS cannot read the token, and
the cookie is not sent on cross-site requests.

Verification checks signature, issuer, audience and expiry — and then
re-validates the payload shape with Zod. A cryptographically valid token whose
claims no longer match the schema is treated as no session rather than trusted.

`secure` is derived from the request protocol (`x-forwarded-proto`, else the URL
scheme), which is correct behind a TLS-terminating proxy. Both obvious
shortcuts are wrong: `NODE_ENV === 'production'` silently drops the cookie on
any HTTP deployment (this actually happened — `DECISIONS.md` §2), and hardcoding
`false` would leak the token.

`SESSION_SECRET` has a development fallback so the app runs with no setup, and
`assertProductionSecret()` turns a missing or default secret into a startup
failure in production.

**Proof.** `session.test.ts` covers a forged signature, a wrong audience, an
expired token, a structurally invalid payload, and the `secure` derivation
including multi-hop `x-forwarded-proto`. `security.spec.ts` asserts the real
cookie is `httpOnly`, `SameSite=Lax`, and invisible to `document.cookie`.

### Defence in depth: headers

Set once in `next.config.ts` so a new page cannot ship without them:
`Content-Security-Policy` (including `frame-ancestors 'none'`, `base-uri`,
`form-action`), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
`Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`
denying camera/microphone/geolocation, and HSTS. `poweredByHeader` is off.

**Known weakness.** The CSP allows `'unsafe-inline'` for scripts, which Next's
inlined bootstrap currently requires. Tightening this needs nonce middleware;
noted in the config rather than quietly left.

---

## 5. Duplicate orders

**Defence.** The checkout form generates one UUID per mounted form, held in a
`useRef`, and sends it in the body and as `x-idempotency-key`. The server keys
on `${userId}:${key}` and returns the stored order for a repeat. Scoping by user
means two users cannot collide on a guessed key.

It is also what makes the API client willing to retry a POST at all: retries are
restricted to transient codes *and* idempotent calls.

**Proof.** `orders.test.ts` covers the repeat, a different key, and per-user
scoping. `security.spec.ts` posts the same payload twice and asserts one order
id.

---

## 6. Open redirect

**Defence.** `safeRedirect()` in `@fc/core` accepts only same-origin paths. It
rejects `//evil.com`, absolute URLs, `javascript:` and backslash tricks, falling
back to a safe default.

**Proof.** `auth.test.ts` covers each payload. `security.spec.ts` logs in via
`/login?next=https://example.com/phish` and asserts the user lands on the local
homepage.

---

## Input validation generally

Everything crossing a boundary is parsed with a Zod schema from `@fc/core` —
request bodies, query strings, API responses, and the `localStorage` cart on
rehydration. `as` on untrusted data is treated as a bug.

Anything that controls work is capped: `pageSize` max 48, quantity max 10 per
line, note max 300 characters. `?page=-5&pageSize=99999` renders page 1 rather
than throwing a 500 — asserted in `catalog.spec.ts`.

Path segments built from user input are `encodeURIComponent`-ed
(`contract.test.ts` asserts a traversal attempt is encoded, not interpreted).

## Error output

`withErrorHandling` converts `ApiError` and `ZodError` into responses with
user-safe messages; anything else becomes a generic 500 with the real error
logged server-side only. No stack trace, raw body or token reaches a client.
The route-level error boundary renders Next's digest, never `error.message`.

---

## Not defended, and why

| Gap | Why it is acceptable here | What a real deployment needs |
| --- | --- | --- |
| In-memory users and orders | Demo fixtures; no real PII exists | A database, encryption at rest, retention policy |
| Per-instance rate limiting | Single instance | Redis or an edge rate limiter |
| No CSRF token | `SameSite=Lax` + JSON-only endpoints covers the realistic cases | A double-submit token if cookie-auth'd form posts are ever added |
| CSP allows `'unsafe-inline'` scripts | Next's inlined bootstrap requires it | Nonce-based CSP middleware |
| No stock reservation | Demo | A reservation window during checkout |
| No audit log | Demo | Append-only log of auth and order events |
| Published demo credentials | They grant access to in-memory fixtures only | Never ship seeded credentials |

---

## On automated accessibility and security claims

The suite catches regressions. It does not establish compliance. Full WCAG
conformance needs manual testing with real assistive technology plus expert
review, and a security posture needs a pentest against a real deployment.
Neither is claimed here.
