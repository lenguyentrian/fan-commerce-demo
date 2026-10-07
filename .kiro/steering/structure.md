# Project structure

```
fan-commerce-demo/
├── AGENTS.md                  Tool-neutral rules — the canonical brief
├── CLAUDE.md                  Claude Code specifics
├── .github/copilot-instructions.md
├── .cursor/rules/*.mdc        Scoped Cursor rules (by glob)
├── .kiro/
│   ├── steering/              This folder — always-on context
│   ├── hooks/                 Automation on file save / task completion
│   └── specs/                 Requirements → design → tasks, per feature
├── prompts/                   Reusable prompts for recurring tasks
├── docs/                      Architecture, workflow, testing, security, decisions
├── proto/                     Protobuf contracts (gRPC readiness)
├── scripts/                   One-off generators (placeholder artwork)
├── packages/
│   ├── core/                  Framework-free domain + API contract
│   │   └── src/
│   │       ├── domain/        money, catalog, cart, order, auth (+ tests)
│   │       └── api/           errors, contract, client (+ tests)
│   └── ui/                    Design system
│       └── src/               button, field, feedback, surface, price, stepper, tokens.css
└── apps/
    ├── web/
    │   ├── e2e/               Playwright specs + fixtures
    │   └── src/
    │       ├── app/           Routes. api/ holds route handlers
    │       ├── components/    Feature components, grouped by domain area
    │       ├── lib/           Browser-side helpers (api client, navigation)
    │       ├── server/        Server-only: session, users, orders, http, data
    │       ├── store/         Zustand stores
    │       ├── test/          Shared unit-test fixtures
    │       └── proxy.ts        Edge proxy (formerly middleware.ts)
    └── mobile/                Flutter app — phase 2
```

## Where code belongs

| If it is... | It goes in |
| --- | --- |
| A rule that would also be true in the mobile app | `packages/core/src/domain` |
| An endpoint path or a wire schema | `packages/core/src/api/contract.ts` |
| A reusable, presentational component | `packages/ui/src` |
| A component that fetches, navigates or knows the domain | `apps/web/src/components` |
| Anything touching cookies, hashing or the data store | `apps/web/src/server` |
| Client-side state | `apps/web/src/store` |

## Naming

- Files: `kebab-case.ts` / `kebab-case.tsx`. Tests sit beside the code as
  `thing.test.ts`.
- Components `PascalCase`, functions `camelCase`, constants
  `SCREAMING_SNAKE_CASE`.
- Zod schemas end in `Schema`; the inferred type takes the bare name
  (`productSchema` → `Product`).
- Route handler files are always `route.ts`, exporting `GET` / `POST`.

## Import rules

- `@fc/core`, `@fc/ui` for shared code; `@/` for app-local.
- Never deep-import another package (`@fc/core/src/domain/money` is forbidden —
  use the public entry point).
- No barrel files inside `apps/web`. Import from the real path.
