# Decisions and bugs found

A log of the non-obvious problems hit while building this, what the symptom was,
and why the fix looks the way it does.

It exists for two reasons. Practically, it is the fastest way for anyone — human
or agent — to avoid re-introducing these. And as a portfolio artifact it is the
honest version of "I use coding agents": the code was drafted fast, and then
these are the things that review, tests and actually reading the output caught.

Every entry below is a real failure from this repository, not an illustration.

---

## 1. Module-level state exists twice

**Symptom.** Checkout returned `201` with a valid order code. The page listing
orders rendered "Chưa có đơn hàng". No error, no warning, nothing in the logs.

**Cause.** The order store was a module-scope `Map`. Next compiles route
handlers and page renders into **separate module graphs**, so the module was
instantiated twice in the same process. The handler wrote to one instance; the
page read the other.

**Fix.** Pin shared server state to `globalThis` under a `Symbol.for` key
(`apps/web/src/server/orders.ts`) — the same pattern used for Prisma clients.

**Still true.** It is per-process. With more than one instance this needs a real
database. That is the point at which the file gets replaced, not patched.

**Why it is worth a log entry.** This class of bug produces no error. A test at
the unit level passes (one module graph), and only an end-to-end test that
writes through the API and reads through a page can see it.

---

## 2. `secure: NODE_ENV === 'production'` drops the session cookie

**Symptom.** `POST /api/auth/login` returned `200` with a correct body. The user
remained anonymous. Every protected request came back `401`. The cookie was
visibly in the response — and absent from the jar.

**Cause.** The cookie was marked `Secure` because `NODE_ENV` was `production`,
while the server was being served over plain HTTP on `127.0.0.1`. Browsers
discard `Secure` cookies on insecure origins, silently.

**Fix.** Derive `secure` from the actual request protocol —
`x-forwarded-proto`, falling back to the URL scheme — in
`sessionCookieOptions(request)`. Both shortcuts are wrong: keying off
`NODE_ENV` breaks every HTTP deployment and local production smoke test, and
hardcoding `false` would leak the token.

**Tests added.** `session.test.ts` asserts `secure` for https, no `secure` for
http, and that a multi-hop `x-forwarded-proto` is read first-value-first.

---

## 3. The client router caches a redirect, so login lands back on `/login`

**Symptom.** Click checkout while anonymous → bounced to
`/login?next=/checkout`. Log in successfully (cookie set, session valid) →
still on `/login`. The header even showed the anonymous state.

**Cause.** Two compounding problems.

First, `router.replace(dest)` followed by `router.refresh()` is a race:
`refresh()` re-fetches the *current* route and cancels the in-flight
navigation.

Second, and the real one: the client router had already cached the RSC response
for `/checkout` — and that response *was* the proxy's redirect to `/login`. A
soft navigation re-used it.

**Fix.** `hardNavigate()` (`apps/web/src/lib/navigation.ts`) after any session
change — login, logout, successful checkout. A session change invalidates every
cached RSC payload anyway, so one full document load is the honest price.

**Tests added.** `login-form.test.tsx` asserts that `hardNavigate` is called and
that `router.replace` / `router.refresh` are **not** — so switching back to a
soft navigation as an "optimisation" fails loudly.

---

## 4. A Zustand selector that builds an object re-renders forever

**Symptom.** Caught in review before it shipped. `useCartTotals` was written as
`useCartStore((state) => totals(state.cart))`.

**Cause.** Zustand v5 compares snapshots with `Object.is`. `totals()` returns a
fresh object every call, so every read looked like a change.

**Fix.** Subscribe to the narrow slice, memoize the derivation outside the
selector:

```ts
const cart = useCart();
return useMemo(() => totals(cart), [cart]);
```

**Generalised.** The rule is in `.cursor/rules/30-web-app.mdc`, because it is a
natural thing to write and the failure is a frozen tab rather than an error.

---

## 5. `setState` inside an effect for the hydration flag

**Symptom.** Lint error from `react-hooks/set-state-in-effect`. The code worked;
it just caused a cascading render on every mount.

**Cause.** `useCartHydrated` was `useState` + `useEffect` + `setHydrated(true)`.

**Fix.** `useSyncExternalStore` with Zustand's `onFinishHydration` as the
subscription and an explicit server snapshot of `false`.

**Note.** This one is only in the log because ESLint found it, not a human and
not a test. It is a fair example of lint rules doing work that review would
plausibly have missed.

---

## 6. `sr-only` controls are unreachable by pointer

**Symptom.** A Playwright click on the variant radio timed out after 30
seconds. The control was visibly on screen and worked by mouse in a real
browser — because the *label* was being clicked, not the input.

**Cause.** The pattern was a `<label>` wrapping an `sr-only` `<input>`.
`sr-only` clips the element to 1px, so the input itself has effectively no hit
area.

**Fix.** Transparent, full-size input (`absolute inset-0 opacity-0`) with the
focus ring driven from the label via `has-[input:focus-visible]`. Keeps native
radio semantics, keyboard arrow navigation and a real click target.

**Worth noting.** The test was right and the component was wrong. It would have
been very easy to "fix" this with `click({ force: true })` and ship a control
that some real users cannot operate either.

---

## 7. A correct rate limiter made the test suite unrunnable

**Symptom.** Most E2E tests failed. Login returned `429`.

**Cause.** No bug. Every spec signs in, Playwright runs them in parallel from
one IP, and the shipped limit is 8 logins per minute.

**Fix.** Limits read from the environment with the secure values as defaults
(`server/http.ts`), and the Playwright `webServer` raises them. Rejected
alternatives: weakening the shipped default (ships a worse product to make tests
pass) and an `if (process.env.NODE_ENV === 'test')` branch (puts test-awareness
in production code).

The limiter itself is unit-tested with its own ceiling, so raising the E2E limit
does not leave it uncovered.

---

## 8. One cookie read in the layout turned the whole app dynamic

**Symptom.** The build route table showed `ƒ` — dynamic, server-rendered on
demand — for **every** route, including the catalogue.

**Cause.** `app/layout.tsx` called `getCurrentUser()` so the header could show
the user's name. Reading cookies anywhere in the root layout opts the entire
route tree out of static rendering.

**Fix.** Layout reads nothing request-specific. The session-dependent part of
the header became a client island (`components/auth/auth-menu.tsx`) that probes
`/api/auth/session` once and caches it in a store.

**Result.** `/` is static with hourly revalidation, `/products/[slug]` is
prerendered for all 8 products, `/cart` is a static shell; only the three
genuinely session-dependent routes are dynamic.

**Cost, stated plainly.** A brief skeleton in the header on first paint.
Acceptable for header chrome; it would not be acceptable for page content.

**How it is kept honest.** `prompts/03-new-page.md` requires pasting the route
table after any rendering change, because nothing fails when this regresses.

---

## 9. Tests that were wrong, not code that was wrong

Three E2E failures where the implementation was right:

| Assertion | Why it was wrong |
| --- | --- |
| Cart total = 450.000 | 450.000 subtotal + 30.000 shipping = 480.000. The cart was correct. |
| Search "concert" → 2 results | Search covers name, artist **and** tags; the lightstick is tagged `concert`. 3 is right. |
| Variant "M" preselected | The first in-stock variant is S (stock 12). M is second. |

Recorded because the tempting move is to "fix" the code until the test passes.
The rule in `prompts/06-debug-from-a-failing-test.md` — decide which side is
wrong *before* editing — exists because of these.

A fourth was genuine test isolation: specs share one demo account and the order
store is per-user, so parallel runs legitimately leave several orders on screen.
Fixed by scoping assertions to the order the test just placed, not by
serialising the suite.

---

## 10. Smaller calls, recorded briefly

- **TypeScript pinned to 5.9** — `ts-jest` declares `typescript: >=4.3 <7`, and
  7.0 is current. Pinned deliberately, not accidentally.
- **`middleware.ts` → `proxy.ts`** — Next 16 deprecated the middleware
  convention. `config.matcher` must still be a static literal, which is why
  `PROTECTED_PATHS` is duplicated and guarded by a test that reads the source
  file as text.
- **`jose` in `transpilePackages`** — it is ESM-only. `next/jest` derives
  `transformIgnorePatterns` from `transpilePackages`, so listing it there is
  what makes it loadable under Jest. Session tests additionally use
  `@jest-environment node` because jsdom has no WebCrypto.
- **`window.location` behind `hardNavigate()`** — current jsdom makes
  `location` non-configurable, so it cannot be stubbed. Routing the three call
  sites through one module makes it mockable and documents the reason once.
- **Tailwind `@source` directives** — Tailwind 4 scans for class names, and the
  design system lives outside the app folder. Without the directives its classes
  are tree-shaken out of the CSS and components render unstyled.
