# Prompt — add or change a business rule in `@fc/core`

Use this for anything that affects what a customer pays, what they are allowed
to do, or what counts as valid data.

---

## Prompt

```
Add a business rule to packages/core.

RULE
<state the rule in one sentence, in business terms, including the edge cases you
already know about. Example: "A fan-club member gets free shipping regardless of
cart value, but still pays shipping on pre-order items.">

CONSTRAINTS
- packages/core may import only zod. No react, no next, no node built-ins, no
  window. If the rule seems to need any of those, stop and tell me — it belongs
  in a different layer.
- Pure function: inputs in, value out. Do not mutate arguments. If the rule
  depends on the current time, take `now: Date = new Date()` as a parameter.
- Money is the Money type (integer minor units + currency). No float, no
  toFixed in arithmetic.
- Define the Zod schema first and infer the type from it. Do not hand-write a
  parallel interface.
- Throw a typed error with a code (CartError / MoneyError style), not a bare
  Error with a sentence.
- If the rule has an order of operations that affects the result, make that
  order explicit in a comment and pin it with a test.

WRITE THE TEST FIRST
In a sibling *.test.ts, cover: the happy path, every error branch asserting the
error CODE, boundary values (zero, the maximum, an empty collection), and
immutability of the inputs. Then implement until green.

INTEGRATION
After the rule is green, tell me every call site that should now use it instead
of its own inline logic. Do not change them yet — list them and wait.

VERIFY
Run `npm run test:core`. Report the actual output.

REPORT
State the rule you implemented in one sentence, list any assumption you had to
make, and name anything you could not verify.
```

---

## Why each constraint is there

- **zod-only imports** — this package is transcribed to Dart in phase 2. A Node
  import makes it unportable, and the agent will reach for `node:crypto` without
  being asked.
- **`now` as a parameter** — otherwise the rule is untestable around midnight,
  around a release date, and in CI.
- **Error codes, not messages** — messages are copy. Tests that assert on them
  break when a translator touches the file.
- **Order of operations pinned by a test** — the discount-before-shipping
  ordering in `totals()` is invisible from the function signature and changes
  what customers pay. It is exactly the kind of thing a well-meaning refactor
  reverses.
- **List call sites, do not change them** — otherwise a one-rule task returns a
  twelve-file diff that is no longer reviewable.
