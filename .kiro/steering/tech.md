# Tech stack and commands

## Stack

| Area | Choice | Version |
| --- | --- | --- |
| Language | TypeScript (strict, `noUncheckedIndexedAccess`) | 5.9 |
| Web framework | Next.js, App Router, Turbopack | 16.4 |
| UI | React | 19.3 |
| Styling | Tailwind CSS 4 (CSS-first config, `@theme`) | 4.3 |
| Validation | Zod | 4.6 |
| Client state | Zustand (+ `persist`) | 5.0 |
| Auth | JWT in an httpOnly cookie, signed with `jose` | 6.2 |
| Unit tests | Jest 30, Testing Library, `ts-jest` for the domain | — |
| E2E | Playwright (chromium + mobile-safari) | 1.63 |
| Lint | ESLint 10 flat config + `eslint-config-next` | — |
| Monorepo | npm workspaces | npm 11 |

No Prettier, no Husky, no component library, no ORM. Adding any of them needs a
stated reason.

## Commands

```bash
npm install              # once, from the repo root

npm run dev              # dev server on :3000
npm run build            # production build; prints the route table
npm start                # serve the production build

npm test                 # all unit tests (~3s)
npm run test:core        # domain tests only (~1s)
npm run test:web         # component, store and server tests
npm run test:e2e         # Playwright; builds first via its webServer
npm run lint             # ESLint, zero warnings tolerated
npm run typecheck        # tsc --noEmit across all packages
npm run verify           # typecheck + unit tests + build — the gate
```

## Environment

`SESSION_SECRET` is the only variable that matters in production, and the app
refuses to start with the development fallback (`assertProductionSecret`). See
`.env.example`.

Rate limits are env-configurable (`RATE_LIMIT_LOGIN_MAX`, etc.) so the E2E suite
can raise them without weakening the shipped defaults.

## Things about this stack that have already bitten us

- **Tailwind 4** needs `@source` directives for class names outside the app
  folder, or the design system's classes get tree-shaken out of the CSS.
- **`middleware.ts` is deprecated** in Next 16; the convention is `proxy.ts`
  exporting `proxy`. `config.matcher` must still be a static literal.
- **`transpilePackages` drives `next/jest`'s `transformIgnorePatterns`.** That
  is how an ESM-only dependency (`jose`) becomes loadable in Jest.
- **Module-scope state is duplicated** between route handlers and page renders.
  Pin shared server state to `globalThis`.
- **`ts-jest` requires TypeScript < 7**, which is why TS is pinned to 5.9.

Full write-ups in `docs/DECISIONS.md`.
