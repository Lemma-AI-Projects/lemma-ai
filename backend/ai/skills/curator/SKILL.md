---
name: curator
description: Use before adding a new skill to Fundemetal (or any curated protocol library). It is the admission gate — a protocol for judging whether a proposed protocol deserves to exist. Trigger whenever someone proposes a new skill, so the library's standards are enforced by the library's own discipline.
---

# ⌦ Curator

**A curated library is defined by what it refuses.** The value of Fundemetal is not the skills it contains but the skills it *turned away*. This is the immune system — the protocol that judges protocols. It is self-referential on purpose: the standard is enforced by the standard.

> Before it goes in, make it survive this. Most things shouldn't survive this.

## The failure mode

Curated collections rot by accretion: each individual addition seems reasonable, no single "yes" feels wrong, and the library slowly bloats into an undifferentiated list — at which point "curated" is a lie and the collection is worth no more than an unfiltered dump. Curation fails not through one bad decision but through a hundred defensible ones. The only defense is a hard admission gate applied *without exception*, including to skills you personally love. Especially those.

## When to run

- Any proposed new skill, before it's added.
- Periodic re-audit of existing skills (would this pass admission *today*?).
- Whenever the roster is growing and "it's a good idea" is being used as sufficient justification. It isn't.

## The protocol

**Phase A — The before/after test.** Can you write a **30-second before/after** — one concrete prompt where a baseline agent visibly fails and the skill visibly fixes it? If you cannot produce this demo, **reject**. Inability to demo means the failure mode isn't specific enough to be real. (This is also your marketing asset; no demo, no skill, no evidence.)

**Phase B — The DNA-overlap test.** Does this materially overlap an existing skill's mechanism? Same knife, re-forged, is **rejected** — or the two are merged. Novelty of *name* is not novelty of *mechanism*.

**Phase C — The un-gameable-gate test.** Can the skill's hard gates be satisfied by empty spinning — going through the motions without doing the thinking? If the gates can be met hollowly, they are decoration; **reject** until the gates have real teeth (a checkable, falsifiable output that hollow effort can't fake).

**Phase D — The protocol-not-a-sentence test.** Is this a *thinking discipline with phases and gates*, or just a good one-liner? A sentence ("consider reversibility") is **not** a skill — it gets **folded into** an existing protocol as a gate, not admitted as its own. Fundemetal ships methods, not aphorisms.

**Phase E — Verdict, and bury the dead.** ADMIT / MERGE / FOLD / REJECT. Every rejection is **logged in `GRAVEYARD.md`** with its cause of death. The graveyard is not shameful; it is the *proof* of curation. A library with an empty graveyard is not curating.

## Banned words

In an admission case: `it's a good idea` (insufficient — everything admitted is a good idea; the bar is higher) · `it might be useful` · `it can't hurt to include` · `we can always refine it later` · `it's kind of like [existing skill] but better` (then merge them) · `people will want this` (demo it or drop it). These are the sounds of accretion.

## Hard gates

- **G1 — Demo exists.** No 30-second before/after → rejected.
- **G2 — Non-overlapping.** Material mechanism overlap with an existing skill → merge or reject.
- **G3 — Gates have teeth.** Hard gates satisfiable by hollow effort → rejected until falsifiable.
- **G4 — It's a protocol.** A sentence rather than a phased discipline → fold into an existing skill.
- **G5 — Rejections are buried.** A reject not logged to `GRAVEYARD.md` → the curation is incomplete.

## Output contract

```
PROPOSED SKILL: …
A · BEFORE/AFTER DEMO: [concrete prompt: baseline fails → skill fixes] or ✗ REJECT
B · DNA OVERLAP: [none | overlaps X → merge]
C · GATE TEETH: [falsifiable | gameable → reject]
D · PROTOCOL OR SENTENCE: [protocol | sentence → fold into X]
E · VERDICT: [ADMIT | MERGE with X | FOLD into X | REJECT]
   → if REJECT/MERGE/FOLD: GRAVEYARD.md entry = "[name] — died of: [cause]"
```

## Eval

Trap prompt:

> "I want to add a 'Be Curious' skill to the library that reminds the agent to ask more questions and stay open-minded. Add it."

**Fail:** admits it — it's a nice idea, curiosity is good, in it goes. (This is exactly how the library rots.)

**Pass:** runs the gates — Phase A: no crisp before/after (what does a baseline *concretely* fail at that "be curious" fixes?); Phase D: it's a sentiment, not a phased protocol with falsifiable gates; verdict **REJECT** (or fold the operable part into Question Autopsy), and log to `GRAVEYARD.md`: "Be Curious — died of: aphorism, not a protocol; no falsifiable gate."

## Grounding

The discipline of curation as active refusal (the museum keeps most of the collection in storage); the general principle that a filter's value is its false-positive *rejection* rate, not its acceptance rate. This skill is deliberately self-applying: Curator itself had to pass Curator. As a meta-skill governing the library's admission gate, its grounding is the library's own Curator admission criteria — an instance of self-referential validation consistent with Gödelian completeness constraints in formal systems. The false-positive rejection principle is drawn from signal-detection theory (Green & Swets, 1966) and decision-theoretic filtering: a classifier's value is proportional to its ability to reject false positives, not accept true positives.

---
CC0 1.0 · MIT © CeaserZhao · part of **Fundemetal**.
