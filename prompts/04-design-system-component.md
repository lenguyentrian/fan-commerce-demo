# Prompt — add a component to `@fc/ui`

---

## Prompt

```
Add a component to packages/ui.

COMPONENT
Name: <PascalCase>
Purpose: <one sentence>
Props: <value, callbacks, variants>
States it must handle: <default, hover, focus, disabled, loading, error, empty>

FORBIDDEN IN THIS PACKAGE
- next/navigation, next/router, next/link — a component that navigates belongs
  in apps/web
- fetch, any API client, any store
- Business logic. Formatting (formatMoney) is fine; deciding a discount is not
- Imports from '@/'
- Hardcoded colours. Use tokens: var(--fc-text), var(--fc-surface), brand-600,
  danger-500. A hex literal is a review failure
ESLint enforces the first and fourth.

ACCESSIBILITY IS PART OF THE COMPONENT, NOT A LATER PASS
- Accessible name: a real <label> with htmlFor, or aria-label when icon-only
- Keyboard operable, including Enter/Space where a native element would be
- Visible focus state (the global :focus-visible ring, or a has-[...] variant
  when the real input is transparent)
- State exposed: aria-invalid, aria-busy, aria-current, aria-describedby wired
  to the error element
- Decorative SVGs: aria-hidden="true" focusable="false"
- Follow the two patterns already settled here:
  · loading buttons use aria-busy + aria-disabled, NOT the disabled attribute,
    so the element keeps focus and the change is announced
  · visually hidden inputs are transparent and full-size
    (absolute inset-0 opacity-0), NEVER sr-only — a clipped 1px control cannot
    be clicked by a pointer or by Playwright

SHAPE
export interface <Name>Props { value: V; onChange: (next: V) => void; className?: string }
export function <Name>({ ... }: <Name>Props) { ... }
- Named export, re-exported from src/index.ts together with its props type
- className last in the clsx() call so callers can override
- If you need a polymorphic `as`, restrict it to a small union typed against
  HTMLAttributes<HTMLElement>. Do not make it generic (see the Card comment)

TESTS
Jest + RTL in apps/web, querying by role and accessible name. Cover: renders the
value, fires the callback, keyboard interaction, the disabled/loading state, and
the aria wiring. No snapshots. No class-name assertions.

VERIFY
npm run lint && npm test && npm run typecheck. Report the actual output.

REPORT
List the states you implemented and the assistive-technology attributes you
wired. Name any state you did not handle.
```

---

## Why each constraint is there

- **No routing or fetching** — the moment a design system component imports
  `next/navigation` it stops being reusable and stops being testable without a
  router mock.
- **`aria-busy` instead of `disabled`** — a `disabled` button loses focus when
  it becomes disabled, so a keyboard user is dropped to the top of the document
  mid-submit, and screen readers announce nothing.
- **Transparent input instead of `sr-only`** — this one cost real time: the
  variant picker used `sr-only` radios, which are clipped to 1px, so they were
  unreachable by pointer and the Playwright click timed out after 30 seconds.
- **No snapshots** — a snapshot test on a design system component fails on every
  cosmetic change and passes when the accessible name disappears. It is
  precisely backwards.
- **"name any state you did not handle"** — agents reliably ship default and
  hover, and reliably forget disabled and error.
