# Prompt library

Prompts for the tasks that recur in this codebase. They exist for the same
reason as a code snippet library: the fifth time you ask an agent to "add a new
journey", you want it to come out shaped like the previous four.

Each file is written to be pasted as-is. The constraints are explicit because
that is the part that determines whether the output is mergeable — a vague
prompt produces plausible code that quietly ignores the money rules.

| File | Use it when |
| --- | --- |
| [`01-new-domain-rule.md`](./01-new-domain-rule.md) | Adding or changing a business rule in `@fc/core` |
| [`02-new-route-handler.md`](./02-new-route-handler.md) | Adding an API endpoint |
| [`03-new-page.md`](./03-new-page.md) | Adding a page or a journey step |
| [`04-design-system-component.md`](./04-design-system-component.md) | Adding a component to `@fc/ui` |
| [`05-review-this-diff.md`](./05-review-this-diff.md) | Reviewing agent output before merging |
| [`06-debug-from-a-failing-test.md`](./06-debug-from-a-failing-test.md) | A test fails and the cause is not obvious |
| [`07-port-rule-to-dart.md`](./07-port-rule-to-dart.md) | Mirroring a `@fc/core` rule in the Flutter app |

## What makes these work

Four things, learned by watching the failures:

1. **State the layer.** Without it, rules land in components and the mobile
   port has to reimplement them.
2. **State the forbidden moves.** "Do not use a float for money" prevents more
   bugs than "be careful with money".
3. **Demand the test first, or alongside.** An agent asked only for an
   implementation will write one that looks right.
4. **Demand an honest report.** "Say which parts you did not verify" turns a
   confident wrong answer into a reviewable one.

## What they cannot do

A prompt does not make the output correct. It makes the output *conventional*,
which makes review fast enough to actually happen. The review checklist in
`.cursor/rules/50-review-ai-output.mdc` is the step that catches real problems —
see `docs/DECISIONS.md` for the bugs that got through generation and were caught
by review and tests.
