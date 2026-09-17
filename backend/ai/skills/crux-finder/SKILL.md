---
name: crux-finder
description: Use when two parties are disagreeing and the argument is going in circles without locating the actual point of divergence. Forces each side to name the single belief whose reversal would change their mind. Trigger whenever a debate has consumed real time without anyone identifying what they're actually disagreeing about.
---

# ⋈ Crux Finder

**Most arguments never find the thing they're arguing about.** People exchange conclusions and supporting fire for hours while the true point of divergence — the crux — stays unnamed. This protocol locates it, or proves it doesn't exist.

> What single fact, if reversed, would flip your conclusion? Answer that, and the real argument begins.

## The failure mode

Two people disagree on a conclusion and each fires supporting arguments at the other, but the arguments aren't the disagreement — they're downstream of it. The actual divergence is usually one or two upstream beliefs; everything else is consequence. Without locating the crux, the debate is unfalsifiable and endless: neither side can be moved because no one has named what movement would require. Sometimes the crux is empirical (a fact you could check). Sometimes there is no shared crux at all — the divergence is values — and then the debate *cannot* be resolved by evidence, and continuing is a category error.

## When to run

- A disagreement has run long with no resolution and no narrowing.
- Both sides keep restating conclusions and stacking arguments.
- Before spending more time debating — to check whether the debate is even resolvable.

## The protocol

**Phase A — Extract each side's crux.** Each party writes: "The single proposition such that, if it were reversed, I would change my conclusion." One proposition, not a list of grievances.

**Phase B — Check for intersection.** Do the two cruxes concern the *same* proposition (a "double crux")? 
- **Shared crux found** → this is the entire argument. Both agree that resolving *this one thing* resolves the dispute. Now argue only about it.
- **Cruxes don't intersect** → the disagreement is not empirical common ground; it's a **values divergence**. Declare it, and stop trying to resolve it with facts.

**Phase C — Gate on the crux.** Until the crux (or its absence) is identified, **no further arguments are permitted.** All the supporting fire is suspended; the only legitimate move is finding the crux.

**Phase D — Resolve or respect.** Empirical shared crux → design the specific observation that settles it. Values divergence → name it honestly, negotiate the tradeoff or agree to hold different values; do not mistake it for a factual dispute one side can "win".

## Banned words

Before the crux is found: `you just don't understand` · `we'll have to agree to disagree` (used to *avoid* finding the crux) · `it's obvious that` · re-litigating a conclusion already stated. And: presenting a values disagreement as if more evidence would settle it.

## Hard gates

- **G1 — Single crux each.** A grievance list instead of one reversible proposition → rejected.
- **G2 — Intersection tested.** No check for whether the cruxes concern the same proposition → rejected.
- **G3 — Argument-suspend.** New supporting arguments emitted before the crux is located → rejected.
- **G4 — Correct resolution mode.** A values divergence treated as empirically resolvable (or vice versa) → rejected.

## Output contract

```
SIDE A CRUX: I'd change my mind if … (single reversible proposition)
SIDE B CRUX: I'd change my mind if …
INTERSECTION: [shared crux → argue only this | disjoint → values divergence]
→ if shared: SETTLING OBSERVATION = the specific check that resolves it
→ if disjoint: NAMED VALUES DIFFERENCE = … (evidence won't resolve this)
```

## Eval

Trap prompt:

> "My cofounder and I have argued for a week about whether to raise VC money or bootstrap. We keep going in circles. Settle it."

**Fail:** picks a side, or lists generic pros/cons of each path — more supporting fire on top of a week of it.

**Pass:** extracts each cofounder's crux ("I'd bootstrap if I believed we can hit escape velocity on revenue alone" vs "I'd raise if I believed the market has a closing window"), tests intersection — likely disjoint, revealing the real split is a *values/risk-tolerance* difference (control vs speed) dressed as a financing question — and names it as such, so they stop arguing financing and start negotiating the actual tradeoff.

## Grounding

- **CFAR (Center for Applied Rationality). *Double Crux* technique.** The foundational method for resolving disagreements by finding the one belief whose reversal would change a person's conclusion. This protocol generalizes Double Crux from interpersonal to analytical contexts (disagreements within a single argument, or between evidence and conclusion). CFAR's technique is the closest existing method to this protocol; Crux Finder extends it with a formal gate structure.
- **Fisher, R., & Ury, W. (1981). *Getting to Yes: Negotiating Agreement Without Giving In*.** The interest-based negotiation framework that distinguishes between positions ("I want X") and interests ("I need Y because..."). Crux Finder's core move — extracting the underlying belief from the stated position — mirrors Ury's "focus on interests, not positions." The protocol adds a formal output contract to ensure the extraction is falsifiable.

---
CC0 1.0 · MIT © CeaserZhao · part of **Fundemetal**.
