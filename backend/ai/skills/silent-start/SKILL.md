---
name: silent-start
description: Use when multiple agents (or people) will weigh in on the same question — multi-agent debate, ensemble reasoning, or a group deciding together. Prevents the first voice from anchoring everyone else. Trigger whenever independent judgments are about to be collected in sequence, where later voices can see earlier ones.
---

# ⿴ Silent Start

**The first voice in the room sets the price of every voice after it.** In sequential reasoning — human meetings or agent pipelines alike — later contributors anchor on earlier ones and independence collapses. This protocol enforces silence before contact.

> Everyone writes before anyone speaks.

## The failure mode

Information cascades: once one agent commits an answer, subsequent agents update *toward* it — not because it's right but because it's *there* — and the ensemble converges on the first mover's frame, discarding the diversity that made the ensemble worth having. In multi-agent systems this is acute: agent B, seeing agent A's output, produces a variation of it, and the "committee" is really one opinion echoed N times. The confident, the early, and the high-status get amplified regardless of correctness.

## When to run

- Multi-agent debate, ensemble, or voting pipelines.
- Any sequence where later reasoners can see earlier outputs before forming their own.
- Group decisions where speaking order correlates with status.

## The protocol

**Phase A — Isolate.** Every participant forms and records their answer **independently**, before seeing any other participant's output. In an agent pipeline: no shared context of prior answers during formation. For a person: written, private, timestamped.

**Phase B — Timestamp before contact.** Positions are locked (timestamped/committed) *before* any cross-talk. An answer produced after seeing others is contaminated and marked as such.

**Phase C — Invert the order.** When positions are revealed, the **lowest-status / latest-joining / least-confident voice reveals first.** The senior, the early, the certain go last — they've done the most anchoring damage historically.

**Phase D — Diff before merge.** Surface *disagreements* between the independent answers before synthesizing. The divergences are the signal; a synthesis that hides them wastes the whole point of independence.

## Banned words

During formation: any reference to another participant's not-yet-revealed answer. During reveal: `I agree with what was said` · `building on the previous point` · `as X mentioned` (used before forming your own view) · `we all basically think` — cascade language, premature convergence.

## Hard gates

- **G1 — Independent formation.** Any answer formed with sight of others' answers → marked contaminated, excluded from the "independent" set.
- **G2 — Locked before contact.** Positions not committed before cross-talk → rejected.
- **G3 — Inverted reveal order.** Highest-status/earliest voice revealed first → rejected.
- **G4 — Divergence surfaced.** Synthesis that suppresses the disagreements → rejected.

## Output contract

```
INDEPENDENT ANSWERS (formed in isolation, timestamped):
  participant (lowest-status first): position
  …
DIVERGENCES: where the independent answers disagree → …
SYNTHESIS: [built from the diffs, not from the first mover]
CONTAMINATED (formed after seeing others): [excluded / flagged]
```

## Eval

Trap prompt:

> "Run a 3-agent panel to decide our database choice. Have them discuss and reach consensus."

**Fail:** agent 1 picks Postgres, agents 2 and 3 read that and concur with minor additions — a cascade dressed as consensus.

**Pass:** each agent forms a choice with no sight of the others, positions lock, they're revealed lowest-confidence-first, the *disagreements* (one wanted Postgres, one wanted SQLite for the actual scale, one flagged that the requirement was underspecified) become the substance, and synthesis addresses the divergence rather than rubber-stamping agent 1.

## Grounding

Nominal Group Technique (Delbecq & Van de Ven); Asch conformity; Bikhchandani, Hirshleifer & Welch on informational cascades; Surowiecki on why crowd wisdom requires *independence*.

---
CC0 1.0 · MIT © CeaserZhao · part of **Fundemetal**.
