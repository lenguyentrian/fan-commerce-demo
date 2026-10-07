# Prompt — add an API route handler

---

## Prompt

```
Add a route handler at apps/web/src/app/api/<path>/route.ts.

ENDPOINT
<METHOD> <path>
Purpose: <one sentence>
Who may call it: <public | any signed-in fan | admin only>
Request: <body and/or query params>
Response: <shape, and the status code on success>

FOLLOW THE EXISTING SHAPE
export const POST = withErrorHandling(async (request: Request) => {
  const user = await requireUser('fan');        // omit only if genuinely public
  rateLimit(clientKey(request, `scope:${user.id}`), limits.x.max, limits.x.windowMs);
  const payload = await parseJsonBody(request, someSchema);
  return jsonOk(result, { status: 201 });
});

NON-NEGOTIABLE
- withErrorHandling wraps the handler. Never a bare try/catch that returns
  error.message to the client.
- requireUser() unless the endpoint is genuinely public. The proxy does not
  protect API routes from direct calls — assume this endpoint will be called
  with curl.
- Validate the body with parseJsonBody and a Zod schema, query params with
  parseSearchParams. Never `as`, never `await request.json()` used unparsed.
- The request schema lives in packages/core (shared with the client form), not
  inline in this file.
- Re-derive any price, name or stock figure from the catalogue. Treat everything
  the client sent about them as a claim to discard.
- If this endpoint creates something, make it idempotent on a client-supplied
  idempotencyKey, scoped per user.
- Scope every read by the session user's id. Never accept a user id from the
  client as the lookup key.
- Throw ApiError(code, userSafeMessage). No stack traces, no raw bodies, no
  tokens in the response or the logs.
- Add the path to `routes` in packages/core/src/api/contract.ts rather than
  hardcoding the string at the call site.

TESTS
- Unit-test the server module the handler delegates to (node environment), not
  the handler wiring.
- Add an access-control case to apps/web/e2e/security.spec.ts: the bare
  `request` fixture (anonymous) must get 401; `page.request` after login must
  succeed.
- If it accepts a body, add a malformed-payload case asserting 400 and
  field-level errors.

VERIFY
npm run lint && npm test, then npm run build. Report the actual output.

REPORT
List the authorization rule you applied, what you validate, and what an attacker
could still do that this endpoint does not prevent.
```

---

## Why each constraint is there

- **"assume this endpoint will be called with curl"** — the single most common
  omission in generated handlers is relying on the proxy or on the UI hiding a
  button. Naming the threat model in the prompt gets `requireUser()` written.
- **Schema in `@fc/core`** — otherwise the client form and the server validate
  slightly different things, and the mismatch surfaces as a 400 the user cannot
  act on.
- **`routes` in the contract file** — a renamed endpoint should be one edit that
  TypeScript then enforces everywhere, including in the future Dart client.
- **"what could an attacker still do"** — the useful part of the report. It
  surfaces the gaps the agent knows about but would not otherwise mention.
