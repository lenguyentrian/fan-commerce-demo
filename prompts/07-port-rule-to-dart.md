# Prompt — port a `@fc/core` rule to Dart

For phase 2, when the Flutter app needs a rule that already exists in
TypeScript. See `apps/mobile/README.md` for the target structure.

---

## Prompt

```
Port a rule from packages/core (TypeScript) to packages/core_dart (Dart).

SOURCE
File: packages/core/src/domain/<file>.ts
Function(s): <names>
Its tests: packages/core/src/domain/<file>.test.ts

APPROACH
1. Read the TypeScript source AND its tests first. The tests are the
   specification — they encode the edge cases and the orderings that the
   signatures do not show.
2. Port the TESTS first, one for one, keeping the same names. A missing test
   means a rule that can silently diverge between platforms, and divergence
   here means web and mobile quote different prices for the same cart.
3. Then port the implementation until the Dart tests pass.
4. Produce a short table mapping each TS test to its Dart test, so a reviewer
   can see nothing was dropped.

TRANSLATION RULES
- Money → an immutable Dart class with `final int amount` and
  `final Currency currency`. Integer minor units, same as TS. Never `double`.
- Rounding: TS uses Math.round (half-up). Dart's `num.round()` rounds half away
  from zero, which matches for the non-negative values we deal with. Add a test
  at a .5 boundary to prove it rather than assuming.
- Zod schema → a `fromJson` factory that THROWS on invalid input, plus a
  `tryFromJson` returning null. Do not silently default a missing field; that is
  how a null price becomes a zero price.
- Thrown typed errors → a sealed class hierarchy with the same codes as the TS
  version. Keep the code strings identical so analytics and logs line up.
- Immutable data: `final` fields, `copyWith`, value equality. The TS functions
  never mutate their inputs and the Dart port must not either.
- Pure functions stay top-level functions. Do not turn them into methods on a
  service class, and do not inject anything.
- No Flutter imports in core_dart. It is a pure Dart package, same constraint as
  the TS version having no React.

DIVERGENCE IS A BUG
If you cannot express something faithfully, stop and tell me. Do not approximate
a pricing rule. A rule that differs between platforms is worse than a rule that
exists on only one.

VERIFY
`dart test` in packages/core_dart. Report the actual output and the mapping
table.
```

---

## Why port the tests first

The tests are the only place the invisible decisions are written down. From the
TypeScript suite:

- `totals()` applies the discount **before** evaluating free shipping. Nothing
  in the signature says so; one test does.
- `money()` rejects non-integers, so a float cannot enter the domain at all.
- `addLine` merges into an existing line for the same variant but keeps separate
  lines across variants.
- `stock: null` means untracked and is capped at the per-line maximum — it does
  not mean unlimited.

Port the implementation first and an agent will reproduce the function
signatures and quietly invent its own answer to each of those.

## Why this matters more than it looks

Two platforms computing two different totals for the same cart is the kind of
bug that reaches customers through a support ticket rather than through
monitoring. The shared-core-plus-ported-tests arrangement is the cheapest
defence: one specification, two implementations, the same assertions on both.
