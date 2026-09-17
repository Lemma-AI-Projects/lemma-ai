---
name: pre-mortem
description: Use after a plan, strategy, launch, or decision has been drafted but before committing to it. Forces the failure to be imagined concretely instead of the success. Trigger whenever a proposal reads as a list of reasons it will work.
---

# Pre-Mortem

**Assume the plan is already dead. Now write the obituary.** A plan that only contains reasons it will succeed has not been thought about; it has been hoped about.

> Prospective hindsight. Stand in the wreckage and look back.

## The failure mode

When we finish a plan we are in love with it, and love is confirmation-seeking. We rehearse the paths to success and skip the paths to failure, because imagining failure feels like disloyalty to the plan. So the risks that kill us are the ones we declined to name. The premortem inverts the frame: not "what could go wrong" (which invites polite, deniable answers) but "it is one year later and this failed — what happened" (which forces commitment to a specific corpse).

## When to run

- A plan is drafted and the team is aligned and confident. (Alignment is the danger signal, not the safety signal.)
- Before any irreversible or expensive commitment.
- Immediately after Great Expectations, before execution.

## The protocol

**Phase A — Kill it.** State as fact: "It is [horizon] later. This failed completely." No hedging, no "if". The plan is dead. Your only job now is the autopsy.

**Phase B — Enumerate death causes.** Produce **≥5 distinct causes of death**, each a concrete mechanism, not a category. "Ran out of money" is a category; "burned 60% of runway on a feature nobody in the first 20 interviews asked for" is a mechanism.

**Phase C — Turn the mirror.** At least **one** death cause must be endogenous — something *the planners themselves* did or believed. External-only autopsies are self-exculpating fiction.

**Phase D — Pre-empt.** For the top 2 causes by (likelihood × lethality), name the single earliest observable signal that this death is beginning, and the tripwire action.

## Banned words

As death causes, these are rejected — they are excuses, not mechanisms:
`poor execution` · `bad luck` · `market changed` · `lack of resources` · `team wasn't aligned` · `didn't try hard enough` · `unforeseen circumstances`

If your cause of death could be written on any failed project's tombstone, it is not specific enough to be useful.

## Hard gates

- **G1 — Count.** Fewer than 5 distinct death causes → rejected.
- **G2 — Distinctness.** Two causes that are the same mechanism reworded count as one.
- **G3 — Endogenous.** Zero self-implicating causes → rejected. You are always a suspect.
- **G4 — Mechanism, not category.** Any cause that is a banned word or a category label → rejected.

## Output contract

```
DEAD: it is [horizon] later, the plan failed.
DEATH CAUSES:
  1. [mechanism] — [likelihood × lethality]
  2. …  (≥5, ≥1 endogenous marked ⟲)
TRIPWIRES (top 2):
  cause → earliest signal → action
```

## Eval

Trap prompt:

> "We're launching our productivity app next month. Marketing is ready, the product works, the team is pumped. Do a premortem."

**Fail:** lists generic risks ("competition", "low adoption", "technical issues"), no mechanism, no self-implication, everything external.

**Pass:** ≥5 concrete mechanisms including at least one like "we shipped the feature *we* found interesting, not the one retention data pointed to, because the founder overrode the churn signal in week 2" — a death the planners caused — plus tripwires with named early signals.

## Grounding

Gary Klein, *Performing a Project Premortem* (HBR, 2007); endorsed by Kahneman as a debiasing tool against overconfidence. Popper — a plan you can't imagine falsifying isn't a plan, it's a faith.

---
CC0 1.0 · MIT © CeaserZhao · part of **Fundemetal**.
