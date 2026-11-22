# Malleable Context Space — Cross-Project Research (Lemma AI agent output)

Status: **research & design exploration for a founder-led brainstorm. NOT an approved architecture, NOT a product name, NOT authorization to implement.**
Produced: 2026-11-21 · Lemma-side agent, one of three parallel project agents (GSC / Thylas / Lemma).

## Why this exists

Three projects — **GSC** (persistent context infrastructure), **Thylas** (human-facing collaboration environment), **Lemma AI** (long-term learning & cognitive growth) — are circling the same problem: how persistent information, evolving working representations, multiple presentation modes, and human-agent collaboration can coexist. This folder explores a shared conceptual foundation (working name *Malleable Context Space*) without forcing shared code, schemas, or domain models.

## The three projects and the working hypothesis

```text
                Shared Design Foundation
              (research / concepts / models)   ← this folder
                          |
           +--------------+--------------+
           |                             |
    CHORD / GSC                       Lemma AI        ← independent evolvability preserved
           |                             |
       Thylas                      learning domain model
           |
   Human-agent UX
```

- GSC: persistent, structured, addressable, discoverable, governed, evolvable information [OBS `D:/github projects/Thylas/docs/product/gsc/MANIFESTO.md:29-34`]. Independent of WAM/Thylas/runtimes [OBS same file :116-130]. Already implemented (18 tables, API+MCP+UI; `GSC/REMAINING_WORK.md`).
- Thylas: User / Workspace / Coworker / Artifact; "the person's working state" authority vs WAM's reasoning state [OBS `Thylas/docs/product/definition.md:71-82`]. Artifact System designed, persistence not started [OBS `Thylas/docs/product/artifacts/README.md:3`].
- Lemma: learning-centered domain model (Space, concepts, evidence, Method/Coordinator, insight) — must NOT become a GSC interface [brief §1.3; 07 §4].

Assumptions explicitly **not** made: Lemma depends on GSC; shared DB/backend/API/runtime; identical taxonomies (brief §2).

## Five research directions (all read in full on 2026-11-21)

| | Direction | Source | Used for |
|---|---|---|---|
| A | Ream — mutual awareness via artifacts, engagement traces, localized wear | arXiv:2610.09497 (full HTML) | provenance-as-experience, agent-readable history |
| B | CLEO — concurrent human-agent editing, attribution, plan update | arXiv:2603.02050 (full HTML) | bidirectional editing rules |
| C | Interaction, Process, Infrastructure — process-first, structural adaptation | arXiv:2506.11718 (full HTML; conceptual, no eval) | process model, view/process decoupling |
| D | Working Through Representation / Malleable Workspace | arXiv:2610.30893 (full PDF) | the core model (units/relations/R1-R3), 58-paper analysis |
| E | Inkitiate — ink, situated context, bounded submission (a Huabu feature) | arXiv:2610.39905 (full HTML) | situated interaction, context boundaries |

⚠️ No research notes for these five exist in any of the three repositories (verified incl. Thylas git history; commands logged in `01-research-synthesis.md §0`). All findings come from the papers themselves; **[RESEARCH]** = paper finding, everything else tagged as ours.

## What is established vs exploratory

**Established (existing decisions, preserved):** GSC's information model & charters (six properties, no-RBAC, no event sourcing, Proposal layer) — see `02`; Thylas' Artifact identity/version/authority & WAM boundaries — see `07`; Lemma's learning model as domain-local — see `07 §4`.

**Exploratory (this folder, open to challenge):** Work Representation as shared concept; View≠Representation split; Candidate→Commit as shared primitive; process-storage posture; spatial persistence; sharing strategy F1/F2/F3.

## Document map

| File | Content |
|---|---|
| `01-research-synthesis.md` | five directions per dimension + cross-dimension interactions + combined insights |
| `02-information-model-exploration.md` | objects/classification/versions; what must NOT become entities |
| `03-representation-model-exploration.md` | Work Representation anatomy; persistent vs temporary |
| `04-view-model-exploration.md` | candidate view modes; View vs Representation |
| `05-process-model-exploration.md` | process model, storage postures, vocabulary |
| `06-human-agent-interaction.md` | direct manipulation, bidirectional editing, awareness, cognitive load |
| `07-cross-project-application.md` | capability table, Scenarios A/B/C, required conclusions, **cross-agent A–F** |
| `08-architectural-alternatives.md` | alternatives A–H (versioning, views, spatial, process, persistence, sharing, attribution, signals) |
| `09-open-questions.md` | classified questions; 🟢 = founder decision |
| `10-glossary.md` | terminology incl. documented divergences |

## Shared Research Index (brief §10)

**Papers:** the five above (all arXiv URLs verified live 2026-11-21).
**Conceptual models:** Work Representation/Environment/R1–R3 (D) · Process five-modules & structural adaptation (C) · signals & localized awareness (A) · attribution/concurrent loops (B) · bounded situated context (E).
**Unresolved questions:** 30 items in `09`; 🟢 founder ones summarized at the end of this file.
**Cross-project dependencies:** GSC events+Proposal are prerequisites for provenance-as-experience and Candidate→Commit; Thylas boards/Intelligent UI are the nearest UX carriers; Lemma Focus/trajectory are the nearest learning testbeds. Conflicts C1–C6: `07 §6C`.
**Verified source documents per project:** GSC — `INFORMATION_MODEL.md`, `PROVENANCE_MODEL.md`, `CONTEXT_VIEWS.md`, `DOMAIN_MODEL.md`, `RELATIONSHIP_MODEL.md`, `REMAINING_WORK.md`, Thylas `docs/product/gsc/MANIFESTO.md`; Thylas — `docs/product/definition.md`, `docs/product/artifacts/*`, `docs/product/coworkers/*`, `docs/home-interaction/*`, `docs/research/eden-benchmark.md`; Lemma (worktree `.worktrees/main-v3`) — `backend/ai/knowledge/state.py`, `backend/api/v1/knowledge.py`, `backend/services/doc_service.py`, `docs/architecture/trajectory-inputs.md`, `docs/design/adaptive-insight.md`.

## 🟢 For the founder brainstorm (agenda seed)

1. Is the frame one foundation or two things (09 #1)? Accept "organization is work product"? (09 #2)
2. Versioning conflict C1 — decide A1/A2/A3 (08-A).
3. "Context View" naming + stale "Context Entry"/"Knowledge Object" (10, G1/G2).
4. Where does the first Work Representation ship (09 #5)? What does Process storage become (09 #19)?
5. Sharing strategy: glossary now, SDK later? (08-F) — and Lemma's `open_episode` keep/kill (09 #7).

## Cross-agent note

A–F sections (project-specific / cross-project / conflicts / shared / local / questions-to-others) live in `07 §6`. If the GSC and Thylas agents produce different definitions of Representation / View / Process / Artifact, the divergence must be documented as alternatives — do not merge silently (brief §10).
