# Prompt — debug from a failing test

For when a test fails and the cause is not obvious. The goal of this prompt is
to stop the agent from reaching for the fastest way to make the red go away.

---

## Prompt

```
A test is failing. Find the root cause before changing anything.

FAILURE
<paste the full failure output, including the call log>

RULES OF ENGAGEMENT
1. Do not edit any file until you can state the cause in one sentence.
2. First decide which is wrong: the test or the code. Say which, and why. Both
   are plausible — several of this repo's "failures" were tests asserting the
   wrong total.
3. You may add temporary logging or a scratch test to investigate. Remove it
   before you finish.
4. FORBIDDEN as a fix:
   - loosening an assertion, widening a regex, or deleting a case
   - adding waitForTimeout, raising a timeout, or adding a retry
   - adding try/catch to swallow the error
   - marking the test skipped
   If you believe one of those is genuinely correct, explain why and ask first.
5. If the failure is environmental (jsdom missing an API, an ESM-only package, a
   browser that does not support the interaction), fix it in the test setup or
   scope the test to the browsers where the assertion is meaningful — and say
   which, with the reason in a comment.

THEN
- State the root cause in one sentence.
- Make the smallest change that fixes it.
- If the cause is a class of bug rather than a one-off, add a test that would
  catch the whole class, and add a line to docs/DECISIONS.md.
- Run the full suite, not just the one test. Report the actual output.

REPORT
Root cause · what you changed · what you ruled out · anything still unexplained.
```

---

## Why the forbidden list is the whole point

An agent asked to "fix the failing test" will make the test pass. Those are
different jobs. Every item on the forbidden list is something that produces a
green suite and a broken product:

- A widened regex turns an assertion about a total into an assertion that a
  number exists.
- A `waitForTimeout` converts a race condition into a flaky test that passes on
  your machine and fails in CI on a bad day.
- A skipped test is a deleted test with extra steps.

## The payoff, from this repository

Four E2E failures that looked like flaky tests were each a real bug, and the
root-cause rule is what surfaced them:

| Symptom | Looked like | Actually was |
| --- | --- | --- |
| Login returns 200, user stays anonymous | A timing issue | `secure` cookie dropped over plain HTTP |
| Order placed, orders page says "none yet" | A caching issue | Module state duplicated across Next's module graphs |
| Logged in, bounced back to `/login` | A proxy bug | Client router serving a cached redirect |
| Most logins fail in the suite | Broken auth | The rate limiter working correctly |

And three "failures" were the tests being wrong, not the code: a total asserted
as 450.000 when shipping made it 480.000, a search expected to return 2 results
when tag matching correctly returned 3, and a preselected variant assumed to be
M when the first in-stock size was S. Each was corrected in the test, with the
reason recorded.
