# 08 · Architectural Alternatives

> For each major question: ≥2 alternatives, no declared winner unless evidence forces one (none does).
> Tags: [OBS] · [RESEARCH] · [INFERENCE] · [HYPOTHESIS] · [UNKNOWN]

## A. Versioning of persistent objects (conflict C1)

**A1 — Status-superseded only (GSC today).** Old stays addressable, no history chain.
+ Simple; matches "no time travel" [OBS `PROVENANCE_MODEL.md:27`]. − Thylas artifacts *require* immutable versions ("Version N is never edited", rollback=forward [OBS `LIFECYCLE.md:17-67`]) — incompatible for canonical deliverables. GSC: keep. Thylas: breaks. Lemma: fine for knowledge items, insufficient for graded submissions.

**A2 — Full immutable version chain (Thylas artifacts).** Every edit = new version.
+ Auditability, pinned/current references [OBS `CANONICAL-REUSE.md:45-51`]. − Storage + UX cost for high-churn working items; conflicts with GSC's lean posture. GSC: heavy. Thylas: keep for Artifacts. Lemma: heavy for blocks.

**A3 — Two-tier (recommended direction [HYPOTHESIS]):** *working objects* evolve in place with append-only events (A1); *committed artifacts* get immutable versions (A2). Promotion is a Candidate→Commit act. Unknowns: promotion granularity; whether representations themselves version.

## B. Static vs dynamic Views (Question A)

**B1 — Fixed system views.** Predictable, cheap; fails power users ([A] users adapted views to strategies anyway — one view, many readings). 
**B2 — User-configurable views (saved configurations).** Flexible; risk of config sprawl; [UNKNOWN] demand (no paper evidence).
**B3 — Agent-generated views as *candidates*.** Agents propose arrangements (D DC1: "agents as interpretive layer"); humans commit — consistent with Candidate→Commit. Cost: review burden.
[INFERENCE] B1+B3 is the evidence-consistent minimum; B2 only where usage proves it (Lemma trajectory views are a testbed).

## C. Spatial Workspace: View or special environment? (Question C)

**C1 — Just another View.** Cheap; but [RESEARCH, E/D] spatial state carries semantics (placement, proximity, ink) that other views can't express; dropping state loses meaning.
**C2 — Special working environment with own state/ops (canvas as first-class).** Fidelity to E/D; [OBS] GSC has a Canvas info-tree component, Lemma has trajectory canvases, Thylas has boards — three near-canvases already exist. Cost: state model (Question E), "don't equate Spatial Workspace with infinite canvas" (brief §11.10).
**C3 — Hybrid [HYPOTHESIS]:** spatial layout = *optional persisted attribute of a Work Representation* (arrangement rows), while the interaction surface stays a View. Persists when user saves; scratch otherwise. Unknowns: layout schema; per-form ops (ink) coverage.
What persists when closed (C3): membership, user-set positions/frames/edges, agent-reorg history; NOT: camera, transient ink unless committed ([E] retained ink was valued — maybe keep as annotation objects).

## D. Process as first-class? (Question D)

**P-Obj / P-Evt / P-Hybrid** — full comparison in 05 §2. [HYPOTHESIS] P-Hybrid (small state + events) is the only option compatible with all three charters, but the *granularity* (per what?) is an open product question. Process vs Activity vs Event vs Task vs History definitions fixed in 10-glossary to prevent drift.

## E. Representation persistence (Question E)

**E1 — Everything persists automatically.** Guarantees continuity; [RESEARCH, D] P6 evidence: premature structure harms exploration; storage noise.
**E2 — Nothing persists unless explicitly saved.** Clean; loses ambient continuity ([A] longitudinal value came from accumulation).
**E3 — Session-local default + save-on-demand + agent *suggestions* to save [HYPOTHESIS].** Same Candidate→Commit grammar. Same object in multiple representations: allowed and expected (GSC Cluster multi-membership precedent [OBS `INFORMATION_MODEL.md:131-145`]); representation membership references objects, never copies (Context View `item_ids` model [OBS]).

## F. Shared foundation strategy (Question F)

| | F1 Shared concepts + glossary only | F2 Shared spec + reference impl (SDK/lib) | F3 Shared service (GSC as dependency of Lemma) |
|---|---|---|---|
| Description | vocabulary + written model; each codebase implements | common schema/SDK for units/provenance/proposals | Lemma reads/writes GSC directly |
| + | zero coupling; fastest; respects independence ("independently implementable, useful, evolvable" [OBS MANIFESTO:116-130]) | consistent primitives without merge | one real store |
| − | drift risk (already happening: C2) | spec cost before proof | contradicts brief §2 ("Do NOT assume Lemma must depend on GSC"); GSC is local-first PGlite today [OBS `DATABASE_DESIGN.md:49-51`] |
| GSC | unaffected | becomes reference platform | becomes product dependency |
| Thylas | unaffected | consumes SDK like Lemma | consumer (already assumed) |
| Lemma | free | adapter cost; keeps domain model | domain model at risk of flattening into GSC |
| Unknowns | — | who maintains spec; versioning of spec | deployment/topology; latency; auth across products |

[INFERENCE] Evidence supports F1 now (glossary + primitives described), F2 *after* one concrete reuse (e.g. Thylas representation persistence) proves the boundary. F3 not supported by current evidence.

## G. Attribution & concurrent editing (from B; worth an explicit decision)

**G1 — Optimistic concurrency + attribution tags (actor, origin, incorporation status) + human resolution on conflict.** [HYPOTHESIS] matches Thylas "produced_by" + GSC events + B's findings.
**G2 — Agent pauses on any concurrent user edit (serialize).** Safe; loses B's entire concurrent-collaboration benefit (31.8% of turns).
**G3 — Plan-update-on-conflict only (CLEO's rule).** Selective, proven in B's probe; needs reliable change attribution first — which is exactly B study-1's failure mode.

## H. Engagement signals (Ream) storage

**H1 — Derived on read from events** (no storage). Consistent with 02 §3; cost at query time.
**H2 — Materialized aggregates.** Fast bars; staleness/denoising complexity.
[UNKNOWN] scale requirements; defer until a product surface exists.
