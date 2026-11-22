# 09 · Open Questions

> Classified per brief §8/§9. 🟢 = needs founder discussion (brainstorm agenda). Others are research/technical follow-ups.
> Tags: [OBS] · [RESEARCH] · [INFERENCE] · [HYPOTHESIS] · [UNKNOWN]

## Conceptual

1. 🟢 Is "Malleable Context Space" the right frame at all, or is it two things (persistent context infrastructure + working representation medium) that should stay separate? [HYPOTHESIS: two things, one conceptual foundation]
2. 🟢 Representation is "a continuing medium" (D §6.1.2) — do we accept that *organization itself* is work product, not metadata? (Everything else follows from this.)
3. When does an activity deserve a Process representation (05 §6)? [UNKNOWN]
4. Is reflection a first-class persistent thing or captured as decisions/annotations? [UNKNOWN]

## Product

5. 🟢 Which surface ships the first Work Representation? (Thylas board / GSC assembly UI / Lemma Focus-adjacent) — the repos contain three near-candidates.
6. What does Thylas' Processes page become? (question to Thylas agent; [OBS] page exists)
7. Lemma: keep/kill `open_episode/close_episode/completion_met` (zero production callers, [OBS grep 2026-11-21]) as the Episode/Process seed?
8. Do learners want Ream-style mirrors of their own engagement? [HYPOTHESIS from A §7.2.3; no Lemma evidence yet]
9. 🟢 Scope of shared work for the next milestone: vocabulary only (F1) vs SDK (F2)? (08-F)

## Information Model

10. 🟢 Versioning model: A1/A2/A3 (08-A) — direct conflict C1 between existing GSC and Thylas decisions.
11. Semantic Role dimension: tags vs type system? [HYPOTHESIS: tags via Proposal]
12. 🟢 Single-parent `derived_from` vs multi-parent derivation (C4). [OBS `RELATIONSHIP_MODEL.md:25-41`]
13. Passage-level anchors (quotes→source bounding boxes): stored centrally or per consumer? [UNKNOWN]
14. Does "removed from representation" need tombstones? [UNKNOWN]

## Interaction

15. 🟢 How much bidirectional-editing machinery ships before it pays off? (B says attribution is the precondition; Thylas blocks unimplemented [OBS])
16. Canonical context-boundary gesture: lasso+selection+sigil (E) vs `@` references (Thylas) vs block selection (Lemma Focus) — one grammar or three? [HYPOTHESIS: one conceptual grammar, domain gestures]
17. Intervention granularity as feedback (B §5.1): adopt as a design rule? [HYPOTHESIS yes]
18. Ink beyond canvas: does situated marking generalize to lists/documents (E §7.1 "beyond an infinite canvas")? [UNKNOWN]

## Architecture

19. 🟢 Process storage: P-Obj / P-Evt / P-Hybrid (08-D).
20. 🟢 Spatial workspace posture: C1/C2/C3 (08-C) — what persists when closed.
21. Engagement signals: derived vs materialized (08-H). [UNKNOWN]
22. 🟢 Conflict C6: can GSC host process structures without becoming "an orchestrator"? Charter reading vs C's framework. [OBS MANIFESTO:147-158]

## Technical

23. Representation-local relations: relation kind vs representation-scoped edges table. [deferred]
24. Attribution schema for mutations (actor/origin/incorporation-status) — where does it live in each stack? [deferred]
25. Fine-grained within-object reference reliability (E §5.2.3: wrong scope in 2 documented cases) — anchor format + confirmation UX. [UNKNOWN]
26. Signal weights/denoising (A App. B heuristics) need calibration per domain; do not copy 0.02/0.8 numbers. [RESEARCH caveat]

## Cross-project

27. 🟢 Terminology fix C2/C3: adopt glossary (10) or rename GSC "Context View"? Who owns the shared vocabulary going forward?
28. 🟢 F3 temptation check: does any concrete milestone require Lemma→GSC runtime dependency? (brief says no; revisit only with evidence)
29. How do three agent-produced doc sets stay in sync after brainstorm? (owner + review cadence — process question for founders)
30. Multi-agent attribution ("which Coworker did this", A §8.3) vs GSC single-actor events — actor model upgrade needed? [UNKNOWN]
