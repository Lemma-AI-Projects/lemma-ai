# 02 · Information Model Exploration

> What persistent information exists? This is an *exploration*, not a schema. No table/API is proposed here.
> Tags: [OBS] project fact · [RESEARCH] paper · [INFERENCE] · [HYPOTHESIS] · [UNKNOWN]

## 1. Starting point: preserve existing GSC decisions

GSC already has a layered information model. Per brief, we extend rather than replace it.

| Layer | GSC concept (authority: `GSC/INFORMATION_MODEL.md`) | Status |
|---|---|---|
| Raw | Raw Information — original info + source + provenance; 4 types (`raw.document/message/evidence/filecontent`) | [OBS] `INFORMATION_MODEL.md:15`, `RAW_INFORMATION_TAXONOMY.md:11-18` |
| Structured | Structured Object — 5 types (Concept / Hypothesis / Methodology / Decision / EvidenceReference) | [OBS] `INFORMATION_MODEL.md:16`, `STRUCTURED_OBJECT_TAXONOMY.md:13-60` |
| Unit | Chunk = any persisted item (`raw.*`/`object.*`); identity decoupled from chunking/embedding/LLM | [OBS] `INFORMATION_MODEL.md:124`, `DOMAIN_MODEL.md:12-16` |
| Metadata | shared fields: id/type/title/domain(knowledge/work/user/coworker/artifact)/origin(user/import/agent)/source_label/timestamps/status | [OBS] `INFORMATION_MODEL.md:48-64` |
| Lifecycle | Raw: active/archived · Object: draft/active/**superseded** ("the old one stays addressable") | [OBS] `INFORMATION_MODEL.md:66-73` |
| Provenance | origin + source_label + `derived_from`/`references`; 5 info states (raw source / machine interpretation / user modification / user confirmation / derived↔source) | [OBS] `INFORMATION_MODEL.md:75-91`, `PROVENANCE_MODEL.md:5-36` |
| History | append-only events (at/actor/action/detail); "History is never rewritten"; explicitly **no event sourcing / no time travel** | [OBS] `PROVENANCE_MODEL.md:27` |
| Assembly | Context View — named, explicitly assembled (item_ids); "Membership is never inferred from tags, embeddings, or relation traversal" | [OBS] `CONTEXT_VIEWS.md:7-38` |
| Grouping | Cluster — named multi-membership group; "not a folder, not a project workspace, and owns no content" | [OBS] `INFORMATION_MODEL.md:131-145` |
| Relations | 5 kinds: derived_from / references / related_to / supports / challenges | [OBS] `RELATIONSHIP_MODEL.md:25-41` |
| Tags | tag_definitions (dimensions) vs tag_values (assignments, scoped global/project:/context:) | [OBS] `DOMAIN_MODEL.md:35-42` |
| Machine suggestions | Proposal layer (semantic_name/classification/meta_tag/association/cluster; pending→accepted/rejected; never writes user data) | [OBS] `INFORMATION_MODEL.md:147-163` |

**Explicit non-goals preserved**: no RBAC/multi-tenant policy engine (`GSC/SECURITY_MODEL.md:22-27`, `DESIGN_BOUNDARIES.md:44-48`); "Context Entry" and "Information Object" as literal names **do not exist** in GSC's model [OBS, grep 2026-11-21] — closest are item/Chunk and Structured Object. (Thylas docs do use "Context Entry" — see conflict C2 in README.)

## 2. The dimensions the brief asks about

### 2.1 Objects, attributes, relations — what's missing for a Malleable Context Space?

[INFERENCE] The existing model covers *information* well. The research adds three requirements that are **not** new entity types:

1. **Actor on every mutation** (B: attribution failure caused reverted user edits). GSC events already carry `actor` [OBS `PROVENANCE_MODEL.md:27-36`]; the gap is that agent-vs-user distinction must be *queryable* (B's Attribution Change Module emits separate user/agent summaries; A's signals tag `who` on every event).
2. **Incorporation status** (D: "generated ≠ incorporated"). Agent outputs need a state between "exists" and "in the representation" — GSC's Proposal layer already models pending→accepted for *classification*; D shows the same pattern is needed for *content and organization*.
3. **Engagement weight** (A: strength ∈ [-1,1] + denoising heuristics). This is derived/aggregated data over events — [INFERENCE] it belongs in a projection layer, **not** as an attribute of the information object.

### 2.2 Classification: multidimensional, not a tree

[RESEARCH, D] unit roles (content / commitment / operation) cut across object types; [RESEARCH, E] ink marks mix referential+linguistic in one gesture. Both argue for **faceted classification**.

Candidate dimensions (exploration, not mandatory):

| Dimension | Example values | GSC hook that already exists |
|---|---|---|
| Object Type | raw.* / Concept / Hypothesis / Decision / EvidenceReference | [OBS] taxonomies already fixed |
| Semantic Role | content / commitment (goal, criterion) / operation / question / guidance | [RESEARCH, D F1] — partially new |
| Provenance | user / import / agent / derived | [OBS] `origin` field exists |
| Lifecycle | draft / active / superseded / archived | [OBS] status exists |
| Scope | global / project / context | [OBS] tag_values.scope exists |
| Relationship | 5 relation kinds | [OBS] `RELATIONSHIP_MODEL.md` |
| Domain | knowledge / work / user / coworker / artifact | [OBS] domain field exists |

[INFERENCE] Only **Semantic Role** is genuinely new, and D's evidence shows roles *emerge in use* rather than being assigned up front (P6's dual-role Text node) — so Semantic Role should be a **tag-like, revisable annotation**, not a type. [HYPOTHESIS] Keep it out of the type system entirely at first.

Anti-taxonomy guardrails (brief §11): [RESEARCH, D DC1] "Stable schemas provide clarity, while open organization supports emerging understanding" — the model must allow both; [HYPOTHESIS] the Proposal layer is the right place for agents to *suggest* new roles/values, with human commit, rather than letting users and agents freely fragment the vocabulary (Question B).

### 2.3 Sources, evidence, ownership, scope, versions, permissions, lifecycle

- **Sources/Evidence**: [OBS] GSC has Source sync adapters and EvidenceReference objects; [RESEARCH, A] evidence must stay *linked to the claim it supports, at passage granularity* (PDF read wear: quotes matched to sentence bounding boxes). [INFERENCE] Passage-level anchors are a *provenance refinement*, not a new object.
- **Ownership/scope/permissions**: [OBS] GSC = owner-only write + cluster_shares (view/add) + audit; Thylas = workspace-scoped everything + artifact authority ("Producing ≠ overwriting"). [INFERENCE] These compose: GSC governs information, Thylas governs product objects; do not build one permission model to rule both.
- **Versions — REAL TENSION (C1)**: GSC models evolution as `status=superseded` + append-only events and explicitly rejects time travel [OBS `PROVENANCE_MODEL.md:27`]; Thylas Artifacts require "Version N is never edited after creation", rollback=forward, full version chain [OBS `Thylas/docs/product/artifacts/LIFECYCLE.md:17-67`]; the brief lists Versions as a first-class info-model concern. These are three different answers. Alternatives are in 08-A; do not resolve here.
- **Lifecycle**: [RESEARCH, D] authorization/materialization of agent output is a lifecycle concern: outside → candidate → incorporated (local or reorganizing) → possibly removed/reorganized. Map onto GSC Proposal + status; [UNKNOWN] whether "removed from representation" needs a tombstone in the representation layer (03).

## 3. What must NOT become a database entity (explicit)

Per brief §11 and GSC's "do not turn every concept into an entity":

| Concept | Treatment | Why |
|---|---|---|
| Engagement signals / read-wear | projection over events | [RESEARCH, A] they are heuristic aggregates; A deliberately avoids inferring intent from them |
| Views (presentation) | code/config, not data | [RESEARCH, C] UI decoupled from process logic; 04 |
| Ink marks / selections | ephemeral inputs whose *residue* (chosen scope, anchors) may be recorded in provenance | [RESEARCH, E] only the boundary matters downstream |
| "Reflection" | a Process module (05), not an info object — unless the team decides reflections are documents | [RESEARCH, C] |
| Every spatial arrangement | only arrangements users *save* become representations (03) | [RESEARCH, D] roles emerge in use; premature structure "is a shackle" (P6) |

## 4. Open points carried to 09

1. Version model conflict (C1) — founder decision.
2. Does Semantic Role enter metadata or the tag vocabulary? [HYPOTHESIS: tags] — needs owner decision.
3. Passage-level anchors: store in GSC or leave to consumers? [UNKNOWN]
4. Should `derived_from` (max one per object, `RELATIONSHIP_MODEL.md:25-41`) remain single-parent when D's recombination (P2 merged three slide versions) implies multi-parent derivation? [INFERENCE] conflict candidate — flag for GSC agent.
