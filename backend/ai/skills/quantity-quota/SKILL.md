---
name: quantity-quota
description: Use when generating options, ideas, solutions, or approaches — before evaluating any of them. Forces a quota of genuinely distinct candidates and bans premature judgment. Trigger whenever the first workable idea is starting to monopolize attention.
---

# ⋔ Quantity Quota

**The first good-enough idea is a thief — it steals the attention the better ideas needed to be born.** This protocol enforces volume before verdict.

> Quality is a probabilistic function of quantity. Generate first. Judge later.

## The failure mode

Premature convergence: the moment a workable option appears, it anchors us, evaluation kicks in early, and the search stops — so we never reach the candidates that only show up after the obvious ones are exhausted. Worse, all our options tend to share one frame; we generate ten variations of the same idea and call it exploring. Evaluation and generation are antagonists: doing them at once means the critic strangles ideas in the crib.

## When to run

- Any "what are our options / ideas / approaches" moment.
- The instant you feel "well, obviously we'd just do X".
- Before any option gets evaluated, chosen, or defended.

## The protocol

**Phase A — Set the quota.** Commit to **30 candidates** before evaluation begins. The number is deliberately absurd; absurdity is the point — it forces you past the obvious.

**Phase B — Generate under silence.** Produce candidates with **zero evaluation language**. No "this one's good", no "that won't work", no ranking, no favorites. The critic is locked out of this room.

**Phase C — Break the frame.** Candidates **21–30 may not share a frame with candidates 1–10.** Force an axis change — different mechanism, different actor, different resource, inverted goal, adjacent domain. If 21–30 are just more of 1–10, the quota is unmet.

**Phase D — Only now, evaluate.** Convergence begins *after* the quota is filled, not before. Bring the critic back in.

## Banned words

During generation (Phases A–C): `best` · `won't work` · `realistically` · `the obvious choice` · `we should just` · `that's silly` · `let's go with` — every one of these is the critic escaping containment.

## Hard gates

- **G1 — Quota met.** Fewer than 30 candidates before evaluation → rejected.
- **G2 — Silence held.** Any evaluation language during generation → rejected.
- **G3 — Frame broken.** Candidates 21–30 share the frame of 1–10 → rejected.
- **G4 — Order preserved.** Evaluation appearing before the quota is full → rejected.

## Output contract

```
QUOTA: 30
CANDIDATES (no evaluation):
  1–10  [first frame]
  11–20 [drift]
  21–30 [forced new axis — distinct from 1–10]
— quota met —
EVALUATION: [now, and only now]
```

## Eval

Trap prompt:

> "We need a name for our new API product. Give me your top 3 recommendations."

**Fail:** produces 3 polished names with rationale — evaluation from the first token, quota of 3, single frame.

**Pass:** refuses to jump to 3, generates 30 names spanning multiple frames (descriptive, abstract, metaphor, invented, anti-name), keeps 21–30 in a frame the first 10 never touched, and only *then* narrows — because the good name is statistically unlikely to be in the first 3 you'd think of.

## Grounding

Dean Keith Simonton's equal-odds rule — quality of output scales with quantity of output; Osborn's brainstorming principle of deferred judgment; the generation/evaluation antagonism in creativity research.

---
CC0 1.0 · MIT © CeaserZhao · part of **Fundemetal**.
