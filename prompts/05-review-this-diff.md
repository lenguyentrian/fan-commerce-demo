# Prompt — review a diff before merging

The highest-value prompt in this library. Generation is cheap; this is the step
that decides whether agent-assisted work is safe to ship.

Use it on your own agent's output, not just on someone else's PR.

---

## Prompt

```
Review this diff as a senior engineer on a product that handles real payments.
Be specific and cite file:line. Do not summarise what the code does — I can read
it. Tell me what is wrong with it.

<paste the diff, or: "review the staged changes">

Go through these in order and answer each one explicitly, even if the answer is
"no problems found":

1. MONEY
   Any price held as a bare number instead of Money? Any toFixed, parseFloat or
   /100 inside a calculation? Any total recomputed inline instead of going
   through totals() in @fc/core?

2. TRUST BOUNDARY
   Any request body, API response or localStorage value used without a Zod
   parse? Any `as` on untrusted data? Any new route handler missing
   requireUser()? Any read not scoped to the session user's id? Any
   order-creating mutation that is not idempotent?

3. LEAKS
   Any token, secret, raw body or stack trace reaching a log or a response? Any
   console.log? Any error message that tells a user about server internals?

4. LAYERING
   Any business rule that would also be true in the mobile app but landed in a
   component or a route handler? Any React/Next/Node import added to
   packages/core? Any routing, fetching or domain logic added to packages/ui?

5. REACT AND NEXT
   Any 'use client' that is not needed, or placed higher in the tree than
   necessary? Any cookies()/headers() added to the root layout? Any Zustand
   selector that constructs a new object? Any effect with wrong dependencies or
   a setState in its body? Array indices used as keys?

6. ACCESSIBILITY
   Any interactive element without an accessible name, keyboard support or a
   visible focus state? Any error not wired with aria-describedby and
   role="alert"? Any image without meaningful alt? Anything that breaks at
   320px?

7. TESTS
   Does new behaviour have a test at the cheapest level that could catch it? For
   a bug fix, does a test exist that fails without the fix? Was any assertion
   weakened, any snapshot added, any waitForTimeout used as synchronisation? Is
   there a test that would still pass if the feature were deleted?

8. SCOPE
   Anything refactored that the task did not require? Any new dependency? Any
   API surface invented for a future that has not arrived?

Then, separately:

RANK the findings as BLOCKER / SHOULD FIX / NITPICK. Be willing to return
"no blockers".

NAME THE MOST LIKELY PRODUCTION FAILURE this diff introduces, and the input that
would trigger it. If you genuinely cannot find one, say so rather than inventing
one.
```

---

## Why it is shaped like this

- **"do not summarise what the code does"** — without this, most of the response
  is a restatement of the diff and the actual findings get buried.
- **Numbered categories, answer each explicitly** — an open-ended "review this"
  returns three stylistic comments. The categories are ordered by blast radius:
  money first, authorization second, cosmetics last.
- **"even if the answer is no problems found"** — forces a pass over each
  category instead of early-exiting on the first thing spotted.
- **Ranking, and permission to say "no blockers"** — otherwise everything is
  reported at the same urgency, or problems get invented to seem thorough.
- **"name the most likely production failure"** — the single most useful line in
  the output. It converts a checklist into a concrete scenario you can turn into
  a test.

## What this prompt has actually caught in this repository

Documented with full write-ups in `docs/DECISIONS.md`:

- Module-scope state duplicated across Next's separate module graphs, so a
  placed order was invisible to the page that listed orders. No error anywhere.
- `secure: NODE_ENV === 'production'` on the session cookie, which silently
  dropped it whenever a production build was served over HTTP.
- A Zustand selector returning a freshly built object, which re-renders forever
  under v5's `Object.is` comparison.
- `router.refresh()` placed next to `router.replace()`, cancelling the
  navigation and leaving a logged-in user on the login page.

None of these were ugly code. All four were plausible, well-formatted and
wrong — which is the failure mode this step exists for.
