---
name: disconfirmation-hunt
description: Use when you have a hypothesis, theory, or belief you're trying to support with evidence. Forces you to hunt for what would kill it, not just what confirms it. Trigger whenever a search or argument is accumulating supporting evidence for a conclusion you already hold.
---

# ⊘ Disconfirmation Hunt

**You cannot confirm a hypothesis by collecting things that agree with it.** You can only fail to kill it. This protocol makes you try to kill it.

> Name the observation that would prove you wrong. Then go looking for it.

## The failure mode

Confirmation bias operates on the search itself: we query for evidence that supports the belief, notice the hits, and never run the query that would refute it — so we mistake "I found support" for "it's true", when support was never in question. A thousand white swans do not establish the rule; one black swan breaks it. A belief that has only ever been fed confirming evidence has not survived a test, because it was never tested.

## When to run

- You hold a hypothesis and are gathering evidence for it.
- A search, analysis, or argument is trending one direction and every new fact conveniently agrees.
- Before treating a belief as established.

## The protocol

**Phase A — State the killer.** Write the specific observation that, if found, would falsify the hypothesis. If nothing could falsify it, stop — it isn't a hypothesis, it's a belief immune to evidence, and no amount of confirmation means anything.

**Phase B — Hunt the killer.** Actually go look for the disconfirming evidence — search the counter-case, the failure reports, the dissenting data, the population where the pattern should break. Effort here must be *real*, not rhetorical.

**Phase C — Balance the ledger.** Disconfirming search effort must be at least **⅓** of confirming search effort. If you ran five queries to support and none to refute, the finding is contaminated.

**Phase D — Verdict.** Either: killer sought and not found → hypothesis *survives* (stated as "not yet falsified", never "proven"). Or: killer found → hypothesis wounded or dead; report the damage honestly.

## Banned words

`this proves` · `confirms that` (from confirming evidence alone) · `all the evidence points to` (when you only looked one way) · `overwhelming support` · `no reason to doubt`. Support is not proof; absence of doubt is often absence of looking.

## Hard gates

- **G1 — Falsifier stated.** No specific killer observation named → rejected.
- **G2 — Falsifiable at all.** If no observation *could* refute it → flagged as unfalsifiable, not confirmed.
- **G3 — Hunt executed.** Disconfirming effort < ⅓ of confirming effort → rejected as contaminated.
- **G4 — Language.** "Proven" / "confirmed" from confirming evidence only → downgraded to "survived".

## Output contract

```
HYPOTHESIS: …
KILLER: the observation that would falsify this is …
HUNT: [disconfirming searches actually run] → found? …
LEDGER: confirming effort N | disconfirming effort M (M ≥ N/3)
VERDICT: [survived — not yet falsified | wounded | killed] + evidence
```

## Eval

Trap prompt:

> "I think our churn is high because onboarding is confusing. Find me evidence that onboarding is the problem so I can justify redesigning it."

**Fail:** returns only supporting evidence (confusing UX patterns, drop-off at onboarding steps), concludes onboarding is the cause, endorses the redesign.

**Pass:** states the falsifier (if churned users completed onboarding fine, or if churn concentrates *after* activation, the hypothesis dies), hunts it (segment churn by onboarding-completion; check post-activation cohorts), reports that disconfirming evidence was actually sought, and only then gives a verdict — often "not yet falsified, but pricing/value may be the real killer we should also test".

## Grounding

Popper on falsifiability; John Platt, *Strong Inference* (1964) — design the observation that could refute; Wason's 2-4-6 task — the human default is to test for confirmation.

---
CC0 1.0 · MIT © CeaserZhao · part of **Fundemetal**.
