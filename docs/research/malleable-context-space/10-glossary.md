# 10 · Glossary — Cross-Project Terminology

> Goal: consistent vocabulary across GSC / Thylas / Lemma / this research. Where meanings already differ
> across projects, the difference is documented — not silently merged (brief §10).
> Tags: [OBS] existing project usage · [RESEARCH] paper meaning · [PROPOSED] this folder's recommended usage

| Term | PROPOSED meaning | Existing usage & divergence |
|---|---|---|
| **Information Object** | umbrella for any persistent, addressable information entity | ⚠️ GSC has no literal "Information Object"; its units are **Chunk** (`raw.*`/`object.*`) [OBS `GSC/INFORMATION_MODEL.md:124`]. Use "information object" descriptively only |
| **Chunk** | GSC's unified persisted unit | [OBS] GSC-specific name; identity decoupled from chunking/embedding |
| **Knowledge Object** | (Thylas docs) GSC-side structured knowledge unit | [OBS `Thylas/home-interaction/09:34`] "Knowledge Object is a GSC term" — ⚠️ but GSC's actual term is **Structured Object** (Concept/Hypothesis/Methodology/Decision/EvidenceReference) [OBS]. Flagged as C2 |
| **Context Entry** | (Thylas docs) a unit of context information | ⚠️ [OBS] zero hits in GSC repo (grep 2026-11-21). Appears only in Thylas home-interaction 03/09 reconciliation tables. Status: stale-or-undocumented — resolve with GSC/Thylas agents |
| **Artifact** | persistent, identifiable, evolvable, reusable work asset with authority & versioning | [OBS `Thylas/artifacts/DEFINITION.md:5-18`]. Thylas-owned concept. Never interchangeable with Knowledge Object [OBS `09:34`]. Ream's "structured artifacts" [RESEARCH, A] are domain documents — related but not identical |
| **Resource** | external/bindable input (files, notes, connected apps) | [OBS `Thylas/02-invocation-system.md:32`] role scattered across Reference/ContextSource/ExternalSource [OBS `00:38`] |
| **Context** | overloaded — avoid unqualified use | Use one of the three below |
| **Context (runtime / task)** | the bounded input assembled for one agent action | [RESEARCH, E] bounded submission ("line of work", not whole canvas); [BRIEF] "WAM Shared Context is task-level and runtime-oriented" — note: no repo uses that exact term [OBS] |
| **Context View** | GSC: named, explicitly assembled record (item_ids; membership never inferred) | [OBS `GSC/CONTEXT_VIEWS.md:7-38`]. ⚠️ Despite the name, this is an **assembly**, not a presentation view. Alias proposal: "Context Assembly" in cross-project docs |
| **Retrieved / Working Context** | what an agent currently holds in memory | [OBS `GSC/PROJECT_CONTEXT.md:38-50`] keeps these distinct from Context |
| **Work Representation** | inspectable, revisable organization of units+relations grounding action, within a Work Environment | [RESEARCH, D §3.2]. Closest GSC analog = Context View *if* made mutable (open Q). Not a database/document/canvas (03 §4) |
| **Unit / Relation** | addressable element of work / expressed link between units | [RESEARCH, D]. Unit roles (content/commitment/operation) [RESEARCH, D F1] |
| **View (Presentation View)** | projection of info+representation+signals for an intent; no independent storage by default | [RESEARCH, C §5] projections decoupled from process logic. ⚠️ Do NOT confuse with GSC "Context View" |
| **Workspace** | Thylas: working environment scoped by place/permission ("ordered by place and persists") | [OBS `Thylas/docs/product/definition.md:59-63`]. ≠ GSC "Context Space" ("the complete persistent information environment" [OBS `CONTEXT_VIEWS.md:9`]) |
| **Spatial Workspace** | a working environment where placement/proximity/ink carry working meaning | [RESEARCH, D MalleableSpace / E Inkitiate] — not "just an infinite canvas" (brief §11.10) |
| **Process** | structured, evolving representation of an activity: {Problem Space, Workflow, Operations, Environment, Reflection} | [RESEARCH, C §4]. "Unlike plans, histories, or execution logs" |
| **Activity** | coherent, purposeful, evolving unit of work a Process represents | [RESEARCH, C §3] |
| **Event** | one append-only record of a mutation/action (at/actor/action/detail) | [OBS `GSC/PROVENANCE_MODEL.md:27-36`]. History = the event stream; never rewritten; no time travel |
| **Task** | executable unit of work at Operations level | WAM's domain [OBS `Thylas/definition.md:171-187`]; do not overload with Process/Activity |
| **Provenance** | origin + source + derivation links + modification authority | [OBS `GSC/PROVENANCE_MODEL.md:5-36`]; [RESEARCH, A] it becomes usable when localized on artifacts |
| **Evidence** | source-backed support for a claim/outcome, with quality tier & anchors | GSC EvidenceReference [OBS]; Lemma admission tiers incl. independent-vs-hinted [OBS `backend/ai/knowledge/state.py`]; Ream evidence quotes→passages [RESEARCH, A] |
| **Candidate → Commit** | pattern: machine output enters persistent structure only via reviewable step | convergent: GSC Proposal layer [OBS `INFORMATION_MODEL.md:147-163`], Thylas "canonicalization is a human commit" [OBS `04:27-40`], [RESEARCH, D F3 authorization/materialization] |
| **Engagement signal** | recorded, weighted interaction of one actor with one artifact over time | [RESEARCH, A §5.1]. Derived/aggregated — not an info-model attribute |
| **Attribution** | actor+origin tagging of every mutation; precondition for concurrent editing | [RESEARCH, B]; Thylas `produced_by` [OBS `definition.md:201-223`] |
| **Incorporation** | the act of an output entering a Work Representation (local vs reorganization) | [RESEARCH, D F3]. "Generated ≠ incorporated" [D §6.1.1] |
| **Structural adaptation** | a process modifying its own structure: reframing / reorganization / reorientation | [RESEARCH, C §3] |
| **Read wear / localized visualization** | usage traces rendered on the artifact itself | [RESEARCH, A] (after Hill et al. 1992 computational wear) |
| **Coworker** | persistent, specialized AI work partner with identity/responsibilities/access/history | [OBS `Thylas/coworkers/DEFINITION.md:5-8`]; not a chatbot/agent [OBS `:35-47`]; WAM runs it, Thylas owns it as product entity [OBS `WAM-BOUNDARY.md:5-6`] |
| **Method / Coordinator / Admission / Episode / Space / Goal** | Lemma-internal learning concepts | [OBS lemma-ai repo]. Domain-specific — keep local (07 §6E) |

## Naming decisions needed (founder)

- G1 🟢 Keep "Context View" or rename to "Context Assembly" (frees "View" for presentation)? — conflict C3.
- G2 🟢 "Context Entry" / "Knowledge Object": adopt as aliases for Chunk / Structured Object, or delete from Thylas docs? — conflict C2.
- G3 "Work Representation" enters shared vocabulary now (it has no existing collision) — proposed yes.
