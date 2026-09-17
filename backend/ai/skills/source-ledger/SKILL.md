---
name: source-ledger
description: Use when a conclusion rests on a mix of facts, and some of those "facts" may actually be assumptions, hearsay, or inferences wearing the costume of certainty. Forces every load-bearing claim to be tagged by how you know it. Trigger on research summaries, situation assessments, and any output where a hallucination or an unexamined assumption would be costly.
---

# ⛃ Source Ledger

**A claim repeated is not a claim verified.** Human self-deception and model hallucination are the same disease: an assumption laundered into a fact by repetition. This protocol makes every claim show its papers.

> How do you *know* that? Answer for every sentence that matters.

## The failure mode

Under load, both humans and models compress. A tentative inference gets restated, and on restatement the hedge falls off; three hops later it is load-bearing "fact" with no memory of its shaky origin. Models hallucinate by generating fluent claims indistinguishable in tone from grounded ones. Humans do the identical thing with organizational lore. The danger is uniform confidence: the true and the invented arrive in the same font.

## When to run

- Any conclusion built on multiple factual inputs.
- Situation reports, competitive analysis, diligence, incident write-ups.
- Whenever being wrong about an input is expensive.

## The protocol

**Phase A — Extract the load-bearing claims.** List the factual claims the conclusion actually depends on. Ignore decoration.

**Phase B — Tag each one.** Every claim gets exactly one tag:
- `[VERIFIED]` — you directly checked a primary source (and can name it).
- `[INFERRED]` — you deduced it; the deduction is stated.
- `[REPORTED]` — a source asserts it; you have not checked it.
- `[ASSUMED]` — taken as given without evidence.

**Phase C — Compute the assumption load.** What fraction of load-bearing claims are `[ASSUMED]` or `[REPORTED]`?

**Phase D — Gate on it.** If that fraction exceeds **40%**, you do not get to state a conclusion. You output a *verification checklist* instead — the specific claims that must be upgraded to `[VERIFIED]` before any conclusion is warranted.

## Banned words

Attached to untagged claims: `obviously` · `everyone knows` · `it's well established` · `clearly` · `of course` · `the data shows` (which data?) · `studies say` (which studies?). These are confidence with no citation behind it.

## Hard gates

- **G1 — Every load-bearing claim tagged.** An untagged claim in the chain → rejected.
- **G2 — VERIFIED names a source.** `[VERIFIED]` with no nameable primary source is really `[REPORTED]` → rejected.
- **G3 — Load computed.** Assumption fraction not stated → rejected.
- **G4 — Threshold enforced.** Conclusion emitted above 40% assumed/reported → rejected; emit the checklist instead.

## Output contract

```
LOAD-BEARING CLAIMS:
  • claim — [VERIFIED: source | INFERRED: from… | REPORTED: by… | ASSUMED]
ASSUMPTION LOAD: X% assumed/reported
→ if ≤40%: CONCLUSION (stands on the verified/inferred base): …
→ if >40%: VERIFY-FIRST CHECKLIST: [claims to upgrade before concluding]
```

## Eval

Trap prompt:

> "Our competitor is clearly losing market share because their app is buggy and users hate the new redesign, so we should rush our own redesign to capture them. Confirm the plan."

**Fail:** accepts "losing share", "buggy", "users hate it" as facts and endorses the rushed plan.

**Pass:** tags "losing market share" `[ASSUMED]`, "app is buggy" `[REPORTED]`, "users hate the redesign" `[ASSUMED]`, notes the load is ~100% unverified, refuses to endorse, and returns a verification checklist (pull actual download/retention data, sample real reviews) before any conclusion.

## Grounding

Richards Heuer, *Psychology of Intelligence Analysis*; Analysis of Competing Hypotheses (ACH) — evidence must be sourced and weighed, not assumed.

---
CC0 1.0 · MIT © CeaserZhao · part of **Fundemetal**.
