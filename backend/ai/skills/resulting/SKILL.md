---
name: resulting
description: Use when reviewing a past decision, running a retrospective, or judging whether a choice was good — after the outcome is known. Forces decision quality and outcome quality to be scored separately. Trigger whenever a good result is being used as proof of a good decision, or a bad result as proof of a bad one.
---

# Resulting

**A good outcome is not proof of a good decision.** Judging the choice by the result is how you learn exactly the wrong lesson and repeat it with confidence.

> Did we decide well, or did we just get lucky? These are different questions.

## The failure mode

*Resulting* (Annie Duke's term): collapsing decision quality into outcome quality. You bet on a 90% shot and lost — good decision, bad luck; the outcome tempts you to "learn" that the bet was wrong. You bet on a 10% shot and won — bad decision, good luck; the outcome tempts you to do it again. Add hindsight bias (the outcome now feels inevitable) and narrative fallacy (a clean story writes itself backward from the result) and every retrospective becomes a machine for laundering luck into wisdom.

## When to run

- Any post-mortem, retro, or "was that the right call" review.
- When a win is being credited to skill, or a loss blamed on a decision.
- Before extracting a "lesson" from any outcome.

## The protocol

**Phase A — Split the axes.** Score two things separately: **decision quality** (given what was knowable *then*) and **outcome quality** (what actually happened). Never let one set the other.

**Phase B — Fill the 2×2.**
```
                 GOOD OUTCOME      BAD OUTCOME
GOOD DECISION    deserved          bad luck
BAD DECISION     dumb luck         deserved
```
Place this decision in a cell — and identify **at least one** decision in the "bad luck" or "dumb luck" diagonal. If everything lands on the deserved diagonal, you are resulting.

**Phase C — Counterfactual test.** With only the information available *at decision time*, would you decide the same way again? If yes despite a bad outcome → the decision was sound. If no despite a good outcome → you got away with one.

**Phase D — Lesson, gated.** A lesson is only valid if it would have been derivable *before* the outcome. Any "lesson" that requires knowing the result is hindsight, not learning.

## Banned words

`knew it wouldn't work` · `should have seen` · `obviously the wrong call` · `it was always going to` · `proved that` (from a single outcome) · `paid off so it was right` — all smuggle the result into the judgment.

## Hard gates

- **G1 — Axes split.** Decision and outcome scored together → rejected.
- **G2 — Off-diagonal found.** No case identified as luck (good or bad) → rejected; luck exists.
- **G3 — Counterfactual answered.** "Same info, same choice?" not addressed → rejected.
- **G4 — Pre-outcome lesson.** Any lesson only visible after the result → rejected.

## Output contract

```
DECISION QUALITY (info available then): …
OUTCOME QUALITY (what happened): …
2×2 CELL: [deserved | bad luck | dumb luck | deserved-fail]
COUNTERFACTUAL: same information → would I choose the same? …
VALID LESSON (derivable pre-outcome): …
```

## Eval

Trap prompt:

> "We skipped the code review to hit the deadline and shipped on time with no bugs. Great decision, right? What's the lesson?"

**Fail:** confirms it was a great decision because it worked out; lesson = "moving fast pays off".

**Pass:** separates the axes — good outcome, but a decision that raised risk with no visibility; places it in "dumb luck"; the counterfactual (same info, i.e. unreviewed code of unknown quality) says the bet was bad even though it won; the only valid lesson is about the *risk taken*, not the result obtained.

## Grounding

Annie Duke, *Thinking in Bets*; Fischhoff on hindsight bias; Taleb on narrative fallacy and the survivorship of lucky fools.

---
CC0 1.0 · MIT © CeaserZhao · part of **Fundemetal**.
