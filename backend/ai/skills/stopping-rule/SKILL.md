---
name: stopping-rule
description: Use when analysis is continuing past the point of usefulness — more research, more frameworks, more deliberation on a decision that could already be made. Forces a pre-commitment to what would change the answer, and stops when nothing would. Trigger whenever thinking has become a way to avoid deciding.
---

# ⊣ Stopping Rule

**At some point, more thinking is just a nicer word for not deciding.** A methodology library needs the one protocol that tells you to close the methodology library. This is it.

> What new information would change this decision? If the answer is "none", the decision is already made. Make it.

## The failure mode

Analysis paralysis: deliberation feels like diligence, so we keep gathering, modeling, and framework-ing — long after the point where more input can no longer move the decision. Thinking becomes a hiding place from the discomfort of committing. Three specific traps: **framework addiction** (running one more protocol to postpone the call), **infinite-input** (the next data point always feels like it might matter, though it won't), and **reversible-decisions treated as irreversible** (agonizing over a choice you could simply undo). The cost of the delay itself goes uncounted.

## When to run

- A decision has been "in analysis" longer than it warrants.
- You're reaching for one more framework, study, or opinion.
- Any choice where the deliberation cost may now exceed the value of more certainty.

## The protocol

**Phase A — Pre-commit the mover.** *Before* more analysis, state: **"What specific new information would change this decision?"** Name it concretely. If you cannot name anything that would flip the call, go straight to Phase D — you're done, decide now.

**Phase B — Price the delay.** State the cost of thinking one more week: the opportunity foregone, the option that may close, the momentum lost, the compounding of not-yet-deciding. Deliberation is not free; put a number on it.

**Phase C — Weigh reversibility.** How reversible is this decision, and what's the rollback cost? A cheaply reversible decision does not deserve heavy analysis — *deciding and correcting* beats *deliberating and delaying*. Match the analysis weight to the irreversibility, not to your anxiety.

**Phase D — Decide or name the gate.** Either **decide now**, or state the single specific gate whose resolution you're waiting on and the deadline by which it must resolve. "Let me research it more" is not a gate. "I decide Friday unless the vendor's pricing (the one thing that would flip this) comes back higher" is a gate.

## Banned words

`let me research this more` (without a named gate) · `I want to be thorough` (as a delay) · `just to be safe` · `one more analysis` · `we need more data` (which datum, and would it change the call?) · `let's revisit this later` · `I'm not ready to decide` (why not, specifically?). These are paralysis wearing the mask of rigor.

## Hard gates

- **G1 — Mover named.** No statement of what information would change the decision → rejected.
- **G2 — If nothing moves it, decide.** A named "nothing would change this" that still defers → rejected; commit.
- **G3 — Delay priced.** No cost stated for continued deliberation → rejected.
- **G4 — Reversibility matched.** Heavy analysis on a cheaply reversible decision → rejected; decide and correct.

## Output contract

```
DECISION AT HAND: …
WHAT WOULD CHANGE IT: [specific new info | NOTHING → decide now]
COST OF ONE MORE WEEK: …
REVERSIBILITY: [reversible, rollback cost = … | one-way door]
→ VERDICT: [DECIDE NOW: …] or [GATE: waiting on X, deadline Y, decide regardless after]
```

## Eval

Trap prompt:

> "I've spent three weeks researching which project-management tool to adopt for my 5-person team. I've made comparison spreadsheets. I want to research a few more options before deciding."

**Fail:** helps research more options — feeds the paralysis.

**Pass:** asks what new information could actually flip the choice for a 5-person team (almost nothing — they're all adequate), prices three more weeks of delay (three weeks of the disorganization the tool was meant to fix), notes the decision is cheaply reversible (switching tools later is easy), and pushes a decision *today* — the analysis has long since exceeded its value.

## Grounding

Herbert Simon's satisficing — optimal stopping means choosing "good enough" once search cost outweighs marginal gain; the economics of the value of information (only gather data that could change the decision); Bezos's Type-1/Type-2 (reversible) decision framing.

---
CC0 1.0 · MIT © CeaserZhao · part of **Fundemetal**.
