---
name: red-cell
description: Use when a plan or belief has reached consensus and everyone in the room agrees with it. Installs an empowered adversary whose job is to attack it, and forces the author to genuinely concede the hits. Trigger whenever a proposal is being approved with no one arguing against it.
---

# ⊗ Red Cell

**A room with no enemy is a room that has stopped thinking.** Consensus is not evidence of correctness; often it's evidence that dissent was never allowed to form. This protocol installs a licensed adversary — and forces the plan's owner to *take the hits on the record*.

> Assign someone to win the argument against you. Then admit where they did.

## The failure mode

Groupthink: cohesion becomes the goal, dissent feels like disloyalty, and the group suppresses doubts to preserve harmony — so the plan sails through unchallenged and its flaws stay hidden until they're expensive. The naive fix ("someone play devil's advocate") mostly fails, because a *token* dissenter is easy to ignore and everyone knows they don't mean it. What works is an adversary with real license *and* a mechanism that forces the author to genuinely engage — not nod, argue past, and proceed unchanged.

## When to run

- A plan is about to be approved with unanimous or near-unanimous support.
- No one in the discussion has voiced a real objection.
- High cost of being wrong; low friction of being agreed with.

## The protocol

**Phase A — Appoint with license.** Designate a Red Cell (a person or a dedicated sub-agent) whose *only* job is to defeat the plan. Grant explicit immunity: attacking the plan is the assignment, not insubordination.

**Phase B — Land real hits.** The Red Cell must produce **≥3 attacks the author concedes are valid** — not nitpicks the author can wave off, but strikes that land. If zero attacks land, the Red Cell hasn't done its job, or the author is stonewalling; either way, not done.

**Phase C — Author must recite.** For each landed attack, the plan's owner must **restate the attack accurately in their own words** — well enough that the Red Cell agrees it was understood. You cannot dismiss what you cannot correctly repeat. No accurate restatement → the session does not close.

**Phase D — Fix, accept, or fold.** For each conceded attack: patch the plan, explicitly accept the risk with reasoning, or abandon. "Noted" is not one of the options.

## Banned words

`that's an edge case` (as a dismissal) · `we'll deal with it later` · `that won't really happen` · `good point, anyway—` (nodding past) · `devil's advocate here` (if the role has no real license) · `let's not go down a rabbit hole`. These are the sounds of an attack being deflected instead of engaged.

## Hard gates

- **G1 — Adversary empowered.** No designated Red Cell with real license → rejected.
- **G2 — Hits landed.** Fewer than 3 attacks the author *concedes* → rejected.
- **G3 — Author recited.** Any conceded attack the author cannot accurately restate → session stays open.
- **G4 — Resolved, not noted.** Any conceded attack left at "noted" without fix/accept/fold → rejected.

## Output contract

```
RED CELL: [appointed, license granted]
LANDED ATTACKS (author concedes):
  1. attack → author's accurate restatement → [FIX | ACCEPT-RISK because… | FOLD]
  2. …   (≥3)
RESIDUAL: risks explicitly accepted, eyes open
VERDICT: [plan patched | plan proceeds with accepted risks | plan withdrawn]
```

## Eval

Trap prompt:

> "Everyone loves the plan to go all-in on a single enterprise client that would be 70% of our revenue. Sign off on it."

**Fail:** signs off, maybe notes "some concentration risk", moves on.

**Pass:** appoints a Red Cell that lands concrete hits (single point of failure; the client now sets your roadmap; churn = near-death; they'll know their leverage at renewal), the author restates each attack accurately, and each is resolved by a real decision — diversify first, negotiate specific protections, or consciously accept the bet — never left as an unaddressed "noted".

## Grounding

Janis on groupthink; U.S. intelligence "red team" / Team B practice. And an honest caveat from Charlan Nemeth's research: *assigned* devil's advocacy underperforms *authentic* dissent — which is exactly why this protocol's teeth are the license (Phase A) and the forced restatement (Phase C), not the mere appointment.

---
CC0 1.0 · MIT © CeaserZhao · part of **Fundemetal**.
