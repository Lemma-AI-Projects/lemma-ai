---
name: teaching-foundation
description: Use when designing pedagogical content, lessons, or slides that should TEACH rather than merely INFORM. Applies evidence-based teaching primitives, the teaching/visual grammar, and the Intelligence/Renderer boundary distilled from the Academic Teaching Skill research foundation.
---

# Teaching Foundation

**Core thesis:** teaching is not information delivery. A slide or segment "teaches"
only if it specifies an *IntendedEffect* on the learner — not just "here is a fact"
but "by encountering it this way, you should now be able to X".

## When to use

- Generating course lessons, explainer slides, or study material.
- Reviewing whether existing content *teaches* or only *informs*.
- Choosing a visual representation for a concept.
- Deciding what an AI layer should decide vs. what a renderer should decide.

## Minimal conceptual model

```
Source → Intelligence (select / sequence / structure)
       → Intermediate Representation (teaching plan)
       → Renderer (visualize / layout)
       → Slide → Learner
```

## Core ontology

- **Claim** — the atomic assertion the learner should accept, understand, or evaluate.
  Without claims we cannot tell "information" from "teaching".
- **Evidence** — data, citation, example, or reasoning supporting a claim.
  Claim without evidence = assertion (academically unsound).
- **Teaching Move** — `Operation × Subject × IntendedEffect`. Separates *what to say*
  from *what it does to the learner*.
- **Visual Structure** — how a claim is expressed visually (diagram, chart, comparison…).
- **Slide** — output unit expressing claims + evidence + visual via a teaching move.

## Teaching primitives (pedagogical functions)

Introduce · Distinguish · Demonstrate · Explain · Compare · Challenge · Apply · Synthesize

## Deck model (v0.1 working sequence)

```
Frame → Context → Key Idea → Evidence → Elaboration → Application → Synthesis
```

Rules:
1. Key Idea must be preceded by Context (why it matters).
2. Evidence must follow a Key Idea (evidence supports claims).
3. Application must follow Evidence (cannot apply what was not shown).
4. Synthesis comes last (connects everything).
5. ≤ 3 Key Ideas per 15-minute segment (cognitive load constraint).

## Visual grammar (knowledge structure → representation)

| Knowledge structure | Use |
|---|---|
| Sequence (A→B→C) | timeline, process diagram, flow chart |
| Hierarchy (A contains B,C,D) | tree, nested boxes, org chart |
| Comparison (A vs. B) | side-by-side panels, small multiples |
| Distribution (values across range) | histogram, box plot, density |
| Relationship (A correlates B) | scatter, network, connected nodes |
| Causality (A causes B) | arrow diagram, mechanism diagram |
| State (current condition) | status diagram, condition table |
| Transformation (A becomes B) | before/after, change diagram |
| Space (where things are) | map, spatial layout |

Rules: match structure to representation; ≤ 6 distinguishable elements per visual;
label directly (spatial contiguity — no separate legend); color encodes information,
not decoration; keep lie factor = 1 (proportional = proportional).

## Intelligence / Renderer boundary

- **Intelligence decides WHAT & WHY** — content selection, teaching sequence,
  claim extraction, evidence mapping, teaching-move assignment, visual-structure choice.
  If a decision changes what the learner understands, it belongs here.
- **Renderer decides HOW** — exact coordinates, typography, color palette, shapes,
  chart generation from specs, animation, export format.

## Evidence-based anchors (Mayer et al.)

- Working memory is limited (~7±2 items, <30s active retention).
- Words + pictures > words alone (d = 1.35).
- Spatial contiguity improves learning (d = 0.82); coherence principle (d = 0.86).
- Worked examples reduce novice extraneous load (expertise reversal: can hinder experts).
- Avoid: decorative images, 3D effects on 2D data, multiple chart types on one slide,
  animated charts without narration (transience effect).

## Source

Full research foundation with evidence tables (F1–F10), core questions (CQ1–CQ5),
complete ontology, grammars, and proposed experiments:
`D:/github projects/Academic Teaching Skill/FOUNDATION.md`
