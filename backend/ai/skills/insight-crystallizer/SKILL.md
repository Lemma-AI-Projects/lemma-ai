---
name: insight-crystallizer
description: "A meta-skill for recognizing when a reusable methodology has emerged during work, articulating that tacit 'unnameable' insight into explicit words, and crystallizing it into a new skill for future reuse. Trigger proactively (don't wait for an explicit request) when any of these signals fires: (a) a breakthrough after prolonged struggle; (b) the user's short correction fundamentally changes your approach; (c) the same non-obvious judgment keeps recurring (3+ times); (d) someone says 'it just feels off / I can't say why but it should be this way'; (e) explicit request such as 'turn this into a skill' / 'save this as a skill' / 'always do it this way' / 'this matters' / 'crystallize it'. Also use it to review past work for lessons worth codifying. Operate in the user's working language."
---

# Insight Crystallizer

A meta-protocol: recognize "a methodology worth accumulating has just emerged," force that unspoken-yet-important tacit understanding into explicit language, then crystallize it into a reusable new skill.

Inspiration: Christopher Alexander's *Pattern Language*. He proved that "quality without a name" can be captured — if you interrogate it with the right structure: **Context → Tension → Move → Boundary**.

This skill runs in three phases: **Recognize → Articulate → Crystallize**. None can be skipped, and the order cannot be reversed — without recognition there is no material; without articulation you only ever crystallize hollow slogans.

> This skill works in the user's working language: it speaks to the user and writes the crystallized skill in whatever language the user is using.

---

## Phase 1 — Recognize (when is something worth crystallizing?)

Not every experience deserves to become a skill. What's worth crystallizing is a **methodology**, not a **fact**.

- Fact: "This API's timeout is 30 seconds" → just note it down, no need to crystallize.
- Technique: "Library X is faster than library Y" → a one-line remark suffices.
- **Methodology**: "When the stakeholder says 'we want everything,' first ship an ugly-but-complete version to force out the real priorities" → this is worth crystallizing.

### Trigger signals (act when any fires)

1. **Breakthrough after struggle** — repeated failed attempts, then a perspective shift suddenly makes the problem simple. The "perspective delta" before and after the breakthrough *is* the methodology.
2. **Corrective redirection** — a short user remark makes you scrap the entire approach. Ask: what judgment framework does the user possess that let them see what I missed?
3. **Recurring judgment** — the same non-obvious trade-off appears three or more times in a task. Three times is a pattern.
4. **"I can't say why" moment** — you or the user say something like "this feels off," "it's almost there," "I can't explain it but it should be this way" — and later it proves the intuition was right.
5. **Explicit request** — the user directly asks to crystallize.

> A signal firing ≠ must interrupt. First pass it through the suppression rules below.

### Suppression rules (avoid being a nuisance)

When a signal fires, check these first. If any hits, **hold the confirmation prompt, just jot one line in the conversation**, and do not force an interruption:

- It is already covered by a crystallized skill (re-crystallizing is noise).
- The user is in high-density flow and clearly does not want to be interrupted (e.g., rapid short commands, rushing).
- It is merely a fact or technique, not a methodology.
- The same topic has already been asked about once this session.

### Action after recognition

Pause and, in the user's working language, say a confirmation (see appendix), e.g.:
> "I noticed the turning point just now was ___. There seems to be a reusable methodology behind it — worth crystallizing into a skill?"

If the user agrees, move to Phase 2. If they decline, just record one line in the conversation; don't push.

---

## Phase 2 — Articulate (say the unnameable)

This is the hardest step. The enemy of tacit knowledge is **premature generalization** — the moment you generalize, it collapses into "communicate more" / "grasp the essence," platitudes everyone repeats and no one can use.

Countermeasure: **tell the story first, distill later**. Rigorously interrogate with the four questions below; each answer must be grounded in the specific incident that just happened. No abstract conclusions first.

### Four-question structure (a Pattern Language variant)

1. **Context** — what specifically happened? In what task, under what conditions? — write it concretely enough that a reader says "oh, I've been in that situation too."
2. **Tension** — what two forces were in conflict? (e.g., fast vs. right; what the user said vs. what they wanted; local optimum vs. global optimum). The unnameable usually hides in the tension — it is an unspoken resolution of that tension.
3. **Move** — what specific action resolved the tension? Use verbs, not adjectives. "Ship an ugly-but-complete version first" is a move; "stay agile" is not.
4. **Boundary** — when does this move stop working? State at least one **concrete, credible, observable** counterexample — a way to tell you've crossed the line. A methodology that can't state its failure mode is a slogan, not a methodology.

> **Tension-first (advanced)**: if the four questions stall and you're speechless, work backward from Tension — force out the unspoken contradiction first; Context and Move will usually surface on their own. When the user says "I can't say why but it's this way," you can almost always recover a tension.

### Quality gate

After articulating, self-check:
- ✅ Could someone who wasn't in that conversation read this and **behave differently** in their own situation?
- ✅ Is it **falsifiable** (has a boundary where it breaks)?
- ❌ Has it degenerated into a motivational quote? ("Have more empathy" / "focus on what matters" → rejected, go back to the concrete case.)

Read the four answers back to the user (in their working language) and invite correction — **the user can usually supply the half-sentence the AI can't see**. Do not skip this step: the unnameable usually emerges jointly between human and machine; writing it alone is incomplete.

---

## Phase 3 — Crystallize (become a reusable skill)

Once the user confirms the articulation, solidify it into a standard skill.

### Crystallization template

Create `skills/<skill-name>/SKILL.md` (in the user's working language):

```markdown
---
name: <verb-phrase name describing "what it does", e.g. ugly-first-prototype>
description: <critical: this decides whether it triggers correctly in future. Must include
  (1) one sentence on the methodology itself;
  (2) a concrete description of the trigger situation — rewrite Phase 2's Context answer,
      writing what the user might say or how the task might appear;
  (3) "pushy" wording — better to over-trigger than miss.>
---

# <skill name>

## When (Context) / When
<Phase 2 question 1 answer>

## Core tension / Core tension
<Phase 2 question 2 answer>

## How (Move) / How
<Phase 2 question 3 answer, as executable steps>

## When not (Boundary) / When not
<Phase 2 question 4 answer>

## Source case / Source case
<a minimal excerpt of the actual dialogue/event (with struggle → breakthrough before/after).
 The case is the anchor of tacit knowledge; re-reading it on future triggers evokes
 better judgment than re-reading abstract steps. Keep it in the original language.>
```

### Discipline

- **Crystallize one methodology at a time.** Found three? Make three skills; don't merge them into one blob.
- **Keep the source case (most critical)**: abstraction drifts, cases don't. The case must include the **struggle → breakthrough** before/after, not just the polished conclusion — judgment lives in the turn. Keep the case in its original language.
- **Write the description in the trigger situation's language**, not the methodology's language. Future triggering relies on situation-matching, not concept-matching.
- After crystallizing, package it as a `.skill` (if a skill-creator bundler is available) to hand to the user for their library.

---

## Reuse: after crystallization

When a new task appears, the crystallized skill enters the candidate set via its description. Then:

1. First re-read that skill's **source case**; confirm the current situation is *truly isomorphic* to the case (not merely superficially similar).
2. Check the **Boundary** section — is the current situation inside the failure zone?
3. After using it, if the methodology needs revision (new boundary, better move), **write it back** and append the new case to the source-case section. A skill is alive; every use is a chance to re-crystallize.

> **Live-test loop**: the best test is live. Next time a "turning point" appears in conversation, say "crystallize it" and see whether the forced four-question answer is exactly that unnameable thing in your head. If what comes out is still too shallow, that's where the four-question structure needs more pressure — iterate on this skill itself.

---

## TL;DR

> Recognize the turn → force the unnameable out via Context–Tension–Move–Boundary → crystallize with the source case → each reuse re-crystallizes.

---

## Appendix: localizable microcopy

### Recognition prompt
- "I noticed the turning point just now was ___. There seems to be a reusable methodology behind it — worth crystallizing into a skill?"

### Falsifiability gate
- "Any methodology that can't state a failure counterexample is rejected — the unfalsifiable is a slogan, not a methodology. Give at least one concrete situation where it breaks."

### Delivery
- "Crystallized as skill <name>. Open the .skill to save it to your library. Next reuse = re-crystallization."
