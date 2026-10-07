# GitHub Copilot — repository instructions

Full rules: [AGENTS.md](../AGENTS.md). This file is tuned for inline
completions and Copilot Chat, where short and concrete beats thorough.

## Always

- TypeScript, strict. No `any`, no non-null `!` on untrusted data.
- Prices use `Money` from `@fc/core` (integer minor units + currency). Never a
  bare `number`, never `toFixed()` for arithmetic.
- Parse external data with a Zod schema from `@fc/core`. Do not cast.
- Business rules go in `packages/core`, not in components or route handlers.
- Server Components by default; `'use client'` only for state/effects/browser
  APIs, and keep the client component small.
- Route handlers: wrap in `withErrorHandling`, validate with `parseJsonBody` /
  `parseSearchParams`, call `requireUser()` on anything non-public.
- Throw `ApiError('CODE', 'user-safe message')`. Never leak internals.
- Tailwind utilities with design tokens (`var(--fc-*)`, `brand-*`). No inline
  hex colours, no new CSS files.
- Interactive elements need an accessible name, keyboard support and a visible
  focus state.

## Never

- `cookies()` or `headers()` in `app/layout.tsx`.
- Trust a client-supplied price, name or stock value on the server.
- `localStorage` for tokens — the session is an httpOnly cookie.
- A Zustand selector that builds a new object (`totals(state.cart)`); memoize
  outside the selector.
- `router.refresh()` next to `router.replace()`.
- `console.log` in `src/` (only `console.warn` / `console.error`).

## Snippet shapes to follow

Route handler:

```ts
export const POST = withErrorHandling(async (request: Request) => {
  const user = await requireUser('fan');
  const payload = await parseJsonBody(request, someSchema);
  return jsonOk(doTheThing(user, payload), { status: 201 });
});
```

Domain function + test, in `packages/core`:

```ts
export function applySomething(input: Something): Something { /* pure */ }
```

```ts
it('rejects X because Y', () => {
  expect(() => applySomething(bad)).toThrow(DomainError);
});
```

Component:

```tsx
export function Thing({ value, onChange }: ThingProps) { /* presentational */ }
```

## Testing

- Domain → `packages/core/src/**/*.test.ts` (Jest, node).
- Component/store → `apps/web/src/**/*.test.tsx` (Jest + RTL).
- Journey → `apps/web/e2e/**` (Playwright).
- Query by role and accessible name. No snapshots, no class-name assertions.
