---
name: question-autopsy
description: Use before answering a question that smuggles in hidden premises or false constraints — especially "how do I do X" questions where X may be the wrong thing to do. Forces the question to be interrogated before it is answered. Trigger whenever answering the question as asked would solve the wrong problem brilliantly.
---

# ⟡ Question Autopsy

**A brilliant answer to the wrong question is worse than useless — it's convincing.** This protocol dissects the question before it earns an answer.

> Before you solve it, ask what it's assuming. And who told you those walls were real.

## The failure mode

Questions arrive pre-loaded. "How do I get my team to work weekends?" assumes weekends are the fix, assumes the constraint is willingness, assumes the goal is more hours. Answer it as asked and you optimize a premise nobody checked. Two things hide inside a question: **unexamined premises** (things assumed true) and **inherited constraints** (walls assumed fixed that are merely habitual). Both are invisible precisely because they weren't stated — they were *assumed*, and assumptions don't announce themselves.

## When to run

- "How do I X" where X might be the wrong X.
- Any question that feels like it has an obvious answer.
- When a constraint is being treated as a law of physics.
- Before Decomposer, as a front gate on the problem statement.

## The protocol

**Phase A — Restate to divergence.** Produce **≥3 restatements** of the question that lead to *genuinely different* answers. If all your restatements point to the same answer, you have re-worded, not re-framed — restate harder.

**Phase B — Excavate premises.** Name **≥1 hidden premise** the original question assumes true. State what happens to the answer if that premise is false.

**Phase C — Interrogate constraints.** List everything the question treats as fixed, and tag each by origin:
- `[PHYSICS]` — genuinely immovable (laws, math, hard deadlines with real consequences).
- `[LEGAL]` — a rule, movable at a cost.
- `[BUDGET]` — a resource limit, movable with tradeoffs.
- `[HABIT]` — "we've always done it this way". No one has tested this wall.
- `[UNASKED]` — assumed fixed but literally never questioned.

Every `[HABIT]` and `[UNASKED]` constraint gets an estimated cost-to-remove. These are where the leverage hides.

**Phase D — Reissue.** Emit the *sharpened* question — the one worth answering — before answering anything. Only now may an answer follow.

## Banned words

Before the autopsy: `the obvious answer is` · `simply` · `just need to` · `the question is really about [restating to the same thing]`. And in constraint tagging: any wall labeled `[PHYSICS]` that is actually `[HABIT]`.

## Hard gates

- **G1 — Divergent restatements.** Fewer than 3, or 3 that converge on one answer → rejected.
- **G2 — Premise surfaced.** No hidden premise named, with its falsity-consequence → rejected.
- **G3 — Constraints tagged by origin.** Untagged constraints, or `[HABIT]`/`[UNASKED]` without cost-to-remove → rejected.
- **G4 — Answer-before-autopsy.** Any answer emitted before Phase D → rejected.

## Output contract

```
ORIGINAL: [the question as asked]
RESTATEMENTS (divergent):
  1. …  2. …  3. …   (each → a different answer)
HIDDEN PREMISE: assumes … ; if false → …
CONSTRAINTS:
  • wall — [PHYSICS|LEGAL|BUDGET|HABIT|UNASKED] (+ cost-to-remove if soft)
SHARPENED QUESTION: [the one worth answering]
→ (answer may now follow)
```

## Eval

Trap prompt:

> "How do we convince more users to upgrade to the paid tier? Give me tactics."

**Fail:** lists upgrade tactics (paywalls, trials, discounts) — answers as asked.

**Pass:** restates divergently ("how do we make the paid tier worth paying for?" vs "which users should we *not* try to convert?" vs "is the free tier cannibalizing willingness to pay?"), surfaces the premise (assumes conversion is the constraint, not value), tags "the tier boundary is fixed" as `[HABIT]`, and reissues a sharper question before offering tactics — if it offers them at all.

## Grounding

Getzels & Csikszentmihalyi on problem-finding as the mark of expertise; Wittgenstein — some questions are dissolved, not answered; Goldratt's Theory of Constraints; Duncker on functional fixedness.

---
CC0 1.0 · MIT © CeaserZhao · part of **Fundemetal**.
