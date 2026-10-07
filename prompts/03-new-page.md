# Prompt — add a page or a journey step

---

## Prompt

```
Add a page at apps/web/src/app/<route>/page.tsx.

PAGE
Route: <path>
Purpose: <one sentence>
Data it needs: <where it comes from>
Access: <public | signed-in | admin>

RENDERING — decide and justify
Pick one and say why in a comment at the top of the file:
- Static with `export const revalidate = N` — content changes rarely
- SSG with generateStaticParams — small, enumerable set of paths
- Dynamic — depends on the session or on searchParams

Then check your work: run `npm run build` and read the route table. The
catalogue routes must stay `○` or `●`. If anything flipped to `ƒ`, you broke
static rendering — find what you added that reads cookies or headers.

STRUCTURE
- Server Component by default. Add 'use client' only for state, effects, refs
  or browser APIs, and push it into the smallest child component possible.
- Never add cookies() or headers() to app/layout.tsx. Session-dependent chrome
  goes in a client island (see components/auth/auth-menu.tsx).
- `params` and `searchParams` are Promises: `const { slug } = await params`.
- Validate searchParams with a Zod schema from @fc/core using safeParse plus a
  safe fallback. A crafted URL must render page 1, not a 500.
- Protected pages call requireUser() in addition to the proxy check.
- Use notFound() for a missing resource so the status code is right.
- Export `metadata` (or generateMetadata for dynamic routes) with a title and
  description. Non-public pages get robots: { index: false }.

UI
- Compose @fc/ui components. Do not write new one-off markup for a pattern that
  already exists; if a pattern appears a third time, move it into @fc/ui and say
  so.
- Exactly one <h1>. Headings in order, no level skipping.
- Mobile-first. Must work at 320px with no horizontal overflow.
- Every state has a design: loading (Skeleton), empty (EmptyState with a way
  out), error (Alert with a retry). An empty state is not a blank page.
- Vietnamese copy, vi-VN formatting.

TESTS
- Jest + RTL for any client component's behaviour, querying by role and
  accessible name.
- A Playwright case in the matching e2e spec for the journey step itself.

VERIFY
npm run lint && npm test && npm run build, then npm run test:e2e if this is part
of a journey. Report the actual output and paste the route table.

REPORT
Say which rendering strategy you chose and why, and confirm the route table is
unchanged for the catalogue routes.
```

---

## Why each constraint is there

- **"read the route table"** — the most expensive mistake in this codebase was a
  single `getCurrentUser()` call in the root layout that turned every route
  dynamic. Nothing failed; the app just quietly stopped being static. Making the
  agent paste the table is the only reliable check.
- **safeParse with a fallback for searchParams** — `?page=-5` should not be a
  500. Generated code reaches for `.parse()` and ships a crash.
- **"every state has a design"** — agents produce the happy path and leave
  loading and empty states as `null`, which reads as a broken page.
- **One `<h1>`, headings in order** — cheap to get right while writing, tedious
  to retrofit across a journey.
