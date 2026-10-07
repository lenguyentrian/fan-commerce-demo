# Claude Code — project brief

The full rules live in [AGENTS.md](./AGENTS.md). Read it first; everything here
is additional and specific to how Claude Code is used in this repo.

## Where to start

- Architecture and layer boundaries: `docs/ARCHITECTURE.md`
- How agents are actually used day to day: `docs/AI_NATIVE_WORKFLOW.md`
- Bugs already found and why the fix looks the way it does: `docs/DECISIONS.md`
- Reusable task prompts: `prompts/`

## Commands

```bash
npm run verify        # typecheck + all unit tests + production build
npm test              # unit tests only (fast, ~3s)
npm run test:core     # domain tests only (~1s) — use this while iterating on rules
npm run lint          # eslint, zero warnings tolerated
npm run test:e2e      # Playwright; needs a build first
```

Run `npm run test:core` on every edit to `packages/core`. It is fast enough to
treat as a type-checker for behaviour.

## Working style for longer tasks

Claude Code is used here for the work that spans files: adding a journey,
threading a field from schema to UI, extracting a rule into the domain. For
those:

1. **Plan before editing.** List the files you intend to touch and why. If the
   list includes something in `packages/core`, say what the new or changed rule
   is in one sentence first — that sentence is the thing worth reviewing.
2. **Domain first, then server, then UI.** Write the `@fc/core` function and its
   test, get it green, then wire it up. The reverse order produces rules
   scattered across components.
3. **One concern per turn.** Do not fold a refactor into a feature. If you spot
   something worth cleaning up, mention it and leave it.
4. **Stop and ask when the rule is ambiguous.** "Does the discount apply before
   or after shipping?" changes what customers pay. Guessing is worse than
   asking.

## Reviewing your own output

Before saying a task is done, check specifically for:

- A `number` where `Money` belongs, or `toFixed`/`parseFloat` in a calculation.
- `as SomeType` on data that came from a request, a response, or localStorage.
- A business rule that ended up in a component instead of `@fc/core`.
- A new route handler with no `requireUser()` call.
- `console.log`, or an error message that echoes server internals to the client.
- A test that asserts on a CSS class, or that would still pass if the feature
  were deleted.
- A new dependency. Justify it or drop it.

## What not to do

- Do not run `npm audit fix --force`, change lockfile versions, or bump majors
  as a side effect of another task.
- Do not add Prettier, Husky, a state library, a component library or an ORM
  without being asked.
- Do not edit `apps/web/src/proxy.ts`'s `config.matcher` without updating
  `PROTECTED_PATHS` in `@fc/core` — a test reads the source file and will fail.
- Do not mark work complete while any check is red. Report the failure instead.
