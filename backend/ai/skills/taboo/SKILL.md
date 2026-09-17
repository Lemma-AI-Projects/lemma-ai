---
name: taboo
description: Use when a discussion, plan, or document is thick with abstract buzzwords that feel meaningful but resist operationalization ("leverage", "synergy", "empower", "ecosystem", "streamline"). Bans the words and forces concrete restatement. Trigger whenever fluent language is standing in for unclear thinking.
---

# ⊘ Taboo

**The words you can't say without are the thoughts you haven't finished.** Abstract jargon lets you *sound* like you've thought something through while skipping the part where you actually do. This protocol confiscates the words and makes you say what you mean.

> Ban the buzzword. What's left is either a real idea or an embarrassing silence — both are progress.

## The failure mode

High-abstraction vocabulary ("leverage our synergies to empower the ecosystem") is frictionless: it can be deployed with zero underlying model and no one notices, because everyone nods at words they'd each define differently. The abstraction hides the absence of a concrete claim. The moment you're forbidden the buzzword and must state the mechanism — *who does what to whom, producing what measurable change* — the gaps become visible. What you cannot restate concretely, you did not actually understand; you were renting the word's borrowed authority.

## When to run

- Any strategy doc, plan, or pitch dense with abstractions.
- When a sentence sounds impressive but you can't picture what it *does*.
- Onboarding a claim before acting on it — strip the jargon, see what remains.

## The protocol

**Phase A — Confiscate.** List every high-abstraction term in play. Start from the universal offenders and add the local dialect:
`leverage` · `synergy` · `empower` · `ecosystem` · `streamline` · `holistic` · `robust` · `seamless` · `disrupt` · `optimize` · `enable` · `scalable` · `value-add` · `best-in-class` · `next-gen` · `paradigm` · `align` · `unlock`
(plus your organization's private buzzwords — the ones only your company says).

**Phase B — Restate operationally.** Rewrite every sentence that used a banned word so that it names: **who** does **what** to **whom**, and **what measurable thing changes**. No banned word may reappear.

**Phase C — Mark the voids.** Where a sentence *cannot* be restated concretely, do not paper over it — mark it `[VOID]`. A void is not a failure of the protocol; it is the protocol succeeding. That sentence was hollow, and now you know.

**Phase D — Keep the survivors.** What restated cleanly is real. What went `[VOID]` is your actual to-do list: those are the ideas you still have to *have*.

## Banned words

The entire confiscation list above, plus any local jargon. Also banned as an escape hatch: swapping one buzzword for a synonym (`leverage`→`utilize`, `synergy`→`alignment`). Concrete or void — no lateral moves.

## Hard gates

- **G1 — All abstractions confiscated.** Any listed buzzword left in the output → rejected.
- **G2 — Operational restatement.** A rewrite that still lacks who/what/whom/measurable → rejected.
- **G3 — Voids marked, not hidden.** A hollow sentence smoothed over instead of marked `[VOID]` → rejected.
- **G4 — No synonym laundering.** Buzzword swapped for a synonym rather than made concrete → rejected.

## Output contract

```
CONFISCATED: [buzzwords found, incl. local dialect]
RESTATED:
  "leverage our data" → "the pricing team queries last-quarter usage to set tier limits"  ✓
  "empower users"     → [VOID — no concrete action identified]
VOID LIST (the real to-dos — ideas not yet actually formed): …
SURVIVORS (concrete, real): …
```

## Eval

Trap prompt:

> "Our strategy is to leverage AI to empower our ecosystem partners with a holistic, seamless platform that unlocks synergies and drives scalable growth. Refine it."

**Fail:** returns a polished version of the same sentence with fresh buzzwords — jargon in, jargon out.

**Pass:** confiscates every abstraction, tries to restate each concretely (and finds most restate to `[VOID]` because no mechanism was ever specified), and returns a short list of the few real claims plus a `[VOID]` list that *is* the honest strategy work still undone — likely revealing the "strategy" was a vibe, not a plan.

## Grounding

The operationalization requirement in science — a construct means nothing until you specify how it's measured/acted on; Feynman's test — if you can't explain it without the jargon, you don't understand it; Orwell, *Politics and the English Language*, on abstraction as a hiding place.

---
CC0 1.0 · MIT © CeaserZhao · part of **Fundemetal**.
