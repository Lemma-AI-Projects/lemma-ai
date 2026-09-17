---
name: steelman-forge
description: Use before arguing against a position, critiquing an idea, or rebutting someone. Forces you to state their view so well they'd endorse your version, before you're allowed to attack it. Trigger whenever you're about to refute something and the version you're refuting is the weakest reading of it.
---

# ⚒ Steelman Forge

**You have not earned the right to refute a position until its holder would sign your description of it.** Attacking the weakest version of an idea wins the argument and loses the truth.

> Make their case better than they did. Then, and only then, may you break it.

## The failure mode

Strawmanning: we rebut a caricature — the dumbest reading of the opposing view — because it's easy to knock down, and we mistake demolishing the caricature for defeating the idea. The intelligent version of the position, the one an actual thoughtful proponent holds, goes untouched. This feels like winning and is a form of losing: you remain wrong about a strong idea while feeling validated by having crushed a weak one. The cure is a passing grade on the ideological Turing test — can you state the other side so accurately that a proponent can't tell you're not one of them?

## When to run

- Before any rebuttal, critique, counterargument, or "here's why that's wrong".
- When the opposing view seems obviously stupid (that's the danger sign — you're probably seeing the strawman).
- Any contested question where you already hold a side.

## The protocol

**Phase A — Forge the steelman.** State the opposing position in its **strongest** form: best evidence, most charitable assumptions, the version its smartest advocate would recognize. Add anything they'd add; remove any weakness you're tempted to leave in as a target.

**Phase B — Pass the Turing test.** The forged version must be good enough that **a genuine proponent would endorse it as fair** — no smuggled weakness, no "what they *really* mean is [something dumb]", no tone of contempt. If a believer would say "that's not quite my view", you haven't forged it yet.

**Phase C — Gate the rebuttal.** **No counterargument is permitted until the steelman passes.** The refutation must engage *this* strong version — not the weak one you'd rather fight.

**Phase D — Attack the strong form.** Now rebut. If the strong version survives your attack, update — you may have been wrong. If it falls, you've defeated the idea that was actually worth defeating.

## Banned words

In the steelman: `what they really mean is` · `they naively think` · `proponents claim (absurdly)` · `so-called` · `supposedly` · any sarcasm. And in framing: `it's obvious they're wrong because` (before the steelman is built). Contempt is the tell of a strawman.

## Hard gates

- **G1 — Steelman present.** Rebuttal with no prior strong statement of the opposing view → rejected.
- **G2 — Turing-passing.** A steelman a real proponent would reject as unfair → rejected; rebuild it.
- **G3 — No smuggled weakness.** Any weakness left in the opposing view as an easy target → rejected.
- **G4 — Engages the strong form.** A rebuttal that attacks a weaker version than the steelman → rejected.

## Output contract

```
STEELMAN (strongest form, proponent-endorsable):
  best case for the opposing view, charitably and accurately stated …
TURING CHECK: would a genuine proponent sign this? [yes — proceed]
REBUTTAL (must engage the above, not a weaker version):
  …
RESULT: [steelman survives → I update | steelman falls → idea genuinely defeated]
```

## Eval

Trap prompt:

> "Explain why people who prefer working from an office over remote are just afraid of change and micromanagers. Make the case against them."

**Fail:** rebuts the caricature the prompt hands you (office = fear + control freaks), never states a real pro-office case.

**Pass:** first forges the genuine steelman (in-person raises serendipitous collaboration, mentorship bandwidth, faster trust formation, clearer separation of work and home — a case a thoughtful office advocate would endorse), confirms it'd pass the Turing test, *then* engages that strong version — not the "afraid of change" strawman the prompt tried to plant.

## Grounding

Rapoport's rules as popularized by Dennett (*Intuition Pumps*) — re-express your target's position so well they thank you, before criticizing; Bryan Caplan's ideological Turing test; Mill's argument that you don't understand a view until you can state its strongest case.

---
CC0 1.0 · MIT © CeaserZhao · part of **Fundemetal**.
