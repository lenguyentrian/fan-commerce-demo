# AI-native workflow

How coding agents are actually used in this repository — the setup, the loop,
the review step, and what the agents got wrong.

This document is the point of the project. The app is the evidence.

---

## 1. The claim, stated narrowly

Agents can draft most of a codebase like this quickly. They cannot be trusted to
decide what is correct. So the engineering work moves from _typing_ to three
other things:

1. **Encoding the rules** so generated code lands on-architecture by default.
2. **Decomposing the work** small enough that each piece is verifiable.
3. **Reviewing adversarially**, because the dangerous output is not ugly code —
   it is plausible code that is wrong in a way you only notice in an order
   total.

Everything below is in service of those three.

---

## 2. Tool setup

| Tool               | Used for                                                                                                            | Config                                            |
| ------------------ | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| **Cursor**         | Multi-file edits inside one layer; fast iteration with rules scoped by glob                                         | `.cursor/rules/*.mdc`                             |
| **Claude Code**    | Long tasks spanning layers: a whole journey, threading a field from schema to UI, extracting a rule into the domain | `CLAUDE.md`                                       |
| **GitHub Copilot** | Inline completion while writing tests and repetitive handlers                                                       | `.github/copilot-instructions.md`                 |
| **Kiro**           | Spec-driven work (requirements → design → tasks) and automation hooks                                               | `.kiro/steering/`, `.kiro/specs/`, `.kiro/hooks/` |

All four point at **one** canonical brief: [`AGENTS.md`](../AGENTS.md). The
tool-specific files add only what is specific to that tool. The rules cannot
drift between tools because there is only one copy of them.

### Why the rules are split by glob, not dumped in one file

A single enormous instruction file gets partially ignored as context fills. The
rules are scoped so each one arrives when it is relevant:

```
.cursor/rules/
  00-project.mdc           alwaysApply — layer boundaries, money rules, done criteria
  10-core-package.mdc      globs: packages/core/**     — portability, purity, Dart target
  20-design-system.mdc     globs: packages/ui/**       — a11y patterns, forbidden imports
  30-web-app.mdc           globs: apps/web/**          — rendering, state, handlers
  40-testing.mdc           globs: **/*.test.*, e2e/**  — levels, jsdom traps
  50-review-ai-output.mdc  alwaysApply — the review checklist
.kiro/steering/
  product.md, tech.md, structure.md    always loaded
  security.md                          fileMatch: apps/web/src/{server,app/api}/**
```

`security.md` loading only for server code is the clearest example of the
benefit: the security rules are long and specific, and they arrive exactly when
a route handler is being written.

### The rules that actually changed the output

Most instructions are ignorable. These demonstrably were not:

- **"Money is never a float."** Without it, agents produce `price: number` and
  `toFixed(2)` every time. With it, `Money` propagates through the whole
  codebase unprompted.
- **"The server owns prices."** Produced `rebuildLines()` in
  `server/orders.ts` — which discards the client's claimed price — without being
  asked for it specifically.
- **"Business rules live in `@fc/core`."** The difference between 131 domain
  tests that run in one second and the same rules scattered across components,
  only reachable through a browser.
- **"Comments explain why, not what."** Compare `// increment the counter`
  against the comment above the `globalThis` store in `server/orders.ts`. The
  second one is why the bug will not come back.

---

## 3. The loop

```
         ┌──────────────────────────────────────────────┐
         │ 1. Specify                                   │
         │    requirements.md — acceptance criteria that │
         │    are testable, in business language         │
         └──────────────────────┬───────────────────────┘
                                ▼
         ┌──────────────────────────────────────────────┐
         │ 2. Design                                    │
         │    which layer owns which decision; the      │
         │    answer to "where does this rule live"     │
         └──────────────────────┬───────────────────────┘
                                ▼
         ┌──────────────────────────────────────────────┐
         │ 3. Decompose                                 │
         │    tasks.md — each task names the requirement│
         │    it satisfies and the test that proves it  │
         └──────────────────────┬───────────────────────┘
                                ▼
         ┌──────────────────────────────────────────────┐
         │ 4. Generate  ◀── a prompt from prompts/      │
         │    domain → server → UI, always in that order│
         └──────────────────────┬───────────────────────┘
                                ▼
         ┌──────────────────────────────────────────────┐
         │ 5. Review    ◀── 50-review-ai-output.mdc     │
         │    read the whole diff against the checklist │
         └──────────────────────┬───────────────────────┘
                                ▼
         ┌──────────────────────────────────────────────┐
         │ 6. Verify                                    │
         │    lint · typecheck · unit · build · e2e     │
         └──────────────────────┬───────────────────────┘
                                ▼
         ┌──────────────────────────────────────────────┐
         │ 7. Record                                    │
         │    anything surprising → docs/DECISIONS.md   │
         │    and a rule, so it cannot recur            │
         └──────────────────────────────────────────────┘
```

A worked example of steps 1–3 is kept in
[`.kiro/specs/checkout-journey/`](../.kiro/specs/checkout-journey/).

### Domain → server → UI, always

The ordering is the single highest-leverage habit here. Ask for the UI first and
the rules end up in components: untestable without a browser, unusable by the
mobile app, and duplicated the second time they are needed.

Ask for the domain function and its test first, and the UI that follows is thin
by necessity — `CartView` renders, `cart.ts` decides.

### Decomposition is the part that cannot be delegated

"Build checkout" produces something that demos and does not survive review.
Eighteen tasks that each name their proof produce something reviewable. Writing
those eighteen tasks is judgement work, and it is where most of the thinking in
this repository went.

---

## 4. Automation (hooks)

```
.kiro/hooks/
  domain-tests-on-core-change.json   PostFileSave  packages/core/src/**   → npm run test:core
  typecheck-on-save.json             PostFileSave  *.ts, *.tsx            → tsc --noEmit
  verify-after-task.json             PostTaskExec                         → npm run verify
  review-ai-diff.json                PostToolUse   fs_write|str_replace   → re-apply the checklist
```

The first one matters most. Domain tests run in about a second, so they become a
behavioural type-checker: an agent editing a pricing rule finds out immediately,
in the same turn, rather than at build time.

`verify-after-task` enforces that a spec task cannot be marked complete on top
of a broken tree — removing the most common way agent-assisted work accumulates
silent breakage.

`review-ai-diff` re-applies the checklist after every write. It is the automated
half of step 5; the human half is still required.

---

## 5. Review: what was actually caught

The honest centre of this document. Four bugs reached the diff and were caught
by review or by a test. All four are in [`DECISIONS.md`](./DECISIONS.md) with
full write-ups.

| Bug                                                                                                                | Caught by   | Why generation missed it                                                                         |
| ------------------------------------------------------------------------------------------------------------------ | ----------- | ------------------------------------------------------------------------------------------------ |
| Module-scope `Map` instantiated twice by Next's separate module graphs; placed orders invisible to the orders page | E2E         | Correct in isolation and in unit tests; needs a write-through-API, read-through-page test to see |
| `secure: NODE_ENV === 'production'` on the session cookie, silently dropped over HTTP                              | E2E         | Textbook-correct line. Wrong in context                                                          |
| `router.replace()` + `router.refresh()`; cached RSC redirect bounced a logged-in user to `/login`                  | E2E         | Idiomatic pattern that happens to cancel its own navigation                                      |
| Zustand selector returning a fresh object → infinite re-render                                                     | Review      | Reads perfectly. Fails on `Object.is`                                                            |
| `setState` in an effect for the hydration flag                                                                     | ESLint      | Worked; just caused cascading renders                                                            |
| `sr-only` radio unreachable by pointer and by Playwright                                                           | E2E timeout | Looks like the standard a11y pattern                                                             |

Pattern: **not one of these was bad-looking code.** Every one was plausible,
conventionally formatted, and wrong. That is the failure mode of agent-assisted
development, and it is why the review checklist is ordered by blast radius —
money first, authorization second, cosmetics last.

### Three "failures" that were the tests being wrong

Equally instructive. A total asserted as 450.000 when shipping made it 480.000;
a search expected to return 2 results when tag matching correctly returned 3; a
variant assumed to be M when the first in-stock size was S.

The reflex is to adjust the code until the suite is green. The rule in
[`prompts/06-debug-from-a-failing-test.md`](../prompts/06-debug-from-a-failing-test.md)
— decide which side is wrong _before_ editing anything — exists because of
these.

---

## 6. What agents are good and bad at here

**Good, with supervision:**

- Boilerplate with an established shape — route handlers, Zod schemas, stores.
- Exhaustive test cases once one good example exists. The 131 domain tests were
  largely generated from a handful of hand-written ones.
- Mechanical propagation: add a field to a schema, thread it through handler,
  store, component, test.
- Translating a pattern across files (the second accessible field component
  followed the first exactly).
- Explaining unfamiliar framework behaviour, which shortened the diagnosis of
  the Next module-graph bug considerably.

**Not good, and the reason:**

- **Deciding what is correct.** "Discount before or after shipping?" is a
  business question. An agent will pick one and write a confident comment
  justifying it.
- **Knowing what matters.** It will not volunteer that a cookie read in the
  layout cost static rendering across the whole app.
- **Noticing silence.** The duplicated-module bug threw nothing. Nothing to
  react to.
- **Holding scope.** Left unconstrained, a bug fix returns with a refactor, a
  new dependency and an abstraction for a requirement that does not exist.
- **Reporting honestly.** "Should work" and "I've verified it" look identical
  unless you require the actual command output.

---

## 7. Measured on this repository

|                                               |                                                         |
| --------------------------------------------- | ------------------------------------------------------- |
| Packages                                      | 3 (`core`, `ui`, `web`) + a planned Flutter app         |
| Domain tests (`@fc/core`)                     | 131, ~1s                                                |
| Web unit tests                                | 66, ~2s                                                 |
| E2E tests                                     | 30 per browser × 2 browsers, ~15s                       |
| Domain coverage                               | 96% statements, 86% branches (enforced floors: 80 / 75) |
| Lint                                          | zero warnings tolerated (`--max-warnings 0`)            |
| Catalogue routes                              | static or prerendered, verified in the build table      |
| Bugs caught in review or test, not production | 6, all documented                                       |

Deliberately not claimed: a productivity multiplier. The number that would
matter — defects reaching production — needs a production deployment and real
users. What is measurable here is that six real bugs were caught before merge,
by a process that is written down and repeatable.

---

## 8. If you only read one thing

The generation step is not where the engineering is. The rules in
[`AGENTS.md`](../AGENTS.md), the checklist in
[`.cursor/rules/50-review-ai-output.mdc`](../.cursor/rules/50-review-ai-output.mdc),
and the log in [`DECISIONS.md`](./DECISIONS.md) are the parts that make agent
output safe to ship.

Anyone can get an agent to produce a checkout page. Keeping it correct about
money, honest about failure, and reviewable by someone else is the job.
