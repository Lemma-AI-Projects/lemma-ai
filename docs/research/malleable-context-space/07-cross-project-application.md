# 07 · Cross-Project Application — GSC × Thylas × Lemma

> All three repositories were inspected read-only on 2026-11-21. Claims about GSC/Thylas below carry file:line
> (verified). Claims about Lemma carry its repo paths (worktree `.worktrees/main-v3`). Where only the brief
> (not a repository) supports a claim, it is marked [BRIEF].
> Tags: [OBS] · [RESEARCH] · [INFERENCE] · [HYPOTHESIS] · [UNKNOWN]

## 1. Capability comparison table (required §7)

| Capability | GSC | Thylas | Lemma |
|---|---|---|---|
| Information Model | **Defines it.** Chunk/Raw/Structured Object, provenance, events, relations, tags, Proposal layer [OBS `GSC/INFORMATION_MODEL.md`] | Consumer + product objects (Artifact identity/version/authority [OBS `artifacts/DEFINITION.md`, `LIFECYCLE.md`]); explicitly does not own GSC infra [OBS `home-interaction/03:4-6`] | **Domain model stays learning-first**: concepts, mastery/evidence (`backend/ai/knowledge/state.py`), pages/blocks, insights (`docs/design/adaptive-insight.md`). May *reference* GSC-style primitives, must not become a GSC UI [brief §1.3] |
| Classification | tag_definitions/values (dimensions vs assignments) + 5 object types [OBS `DOMAIN_MODEL.md:35-42`] | Artifact six-term workflow vocabulary (Source/Evidence/Candidate/Canonical/Revision/Application) [OBS `home-interaction/04:14-23`] | Learning-specific: independent-vs-hinted evidence tiers (`state.py` is_evidence_admissible), Method/Space/Goal [OBS] |
| Representation | Context View = named explicit assembly; Cluster = grouping [OBS `CONTEXT_VIEWS.md`, `INFORMATION_MODEL.md:131-145`] — closest thing to persistent Work Representations | Boards/notes (client-local today) [OBS `00-existing-system-audit.md:101`]; Artifacts are representation *contents*, not representations | Learn Space block docs (Focus `blockOps.ts`), trajectory canvases (`trajectory/canvasLayout.ts`), knowledge structures |
| Multiple Views | Web UI: Layout v2, Canvas info-tree [OBS `REMAINING_WORK.md:5-13`, `COMPONENT_REGISTRY.md`] | Overview/Chat/Artifacts/Coworkers/Compute pages; Intelligent UI blocks [P] [OBS `home-interaction/05`] | Focus mode, learn-space views, user-trajectory views (`features/user-trajectory/`), `/preview/*` prototypes |
| Process Model | **Explicitly out of scope** (not orchestrator; no time travel) [OBS MANIFESTO:147-158, `PROVENANCE_MODEL.md:27`] | "Person's working state" authority; reports WAM's reasoning state; Processes page exists [OBS `definition.md:71-82`] | Learning episodes latent (`open_episode`… no production callers [OBS grep]), Method switching, Free Course flows |
| Provenance | Full: origin + derived_from + append-only events + 5 information states [OBS `PROVENANCE_MODEL.md`] | Artifact version chain + `produced_by` + proposals [OBS `artifacts/LIFECYCLE.md`, `definition.md:201-223`] | Evidence layer (admission tiers), source-linked materials; insight rules (S1→S3) use hint_used/independent fields [OBS `state.py:282-296`] |
| Collaborative Editing | Governance-ready (actor in events) but single-user MVP focus [OBS `SECURITY_MODEL.md`, `REMAINING_WORK.md`] | Designed ("same object" bidirectional editing, 8 blocks) — **not implemented** [OBS `05-intelligent-ui.md:9-16`, `00:76-84`] | User+Agent co-editing of explanations (Socratic) — no concurrent-attribution machinery yet [OBS] |
| Context Assembly | Context View explicit membership; MCP retrieval tools (9) [OBS `server/mcp/index.ts`]; semantic retrieval is P3/GAP-14 [OBS `REMAINING_WORK.md:17-20`] | `@` invocation + workspace scoping [OBS `02-invocation-system.md`]; "retrieval is not implemented" [OBS `00:77`] | Coordinator-driven context for Method turns; Free Course intent routing; space-scoped evidence |

## 2. Scenario A — GSC (hundreds of persistent objects)

User journey: explore knowledge → find info → understand relations → inspect provenance → make custom representation → ask a Coworker to analyze a selected group → save resulting knowledge.

- Explore/find/relations/provenance: already GSC's core (items, relations, events, clusters) [OBS]. Missing: Ream-style *localized* provenance display and signal-weighted "attention" ordering [INFERENCE] — implementable as Views over events, no schema change.
- Custom representation: Context View covers explicit assembly; extend-or-sibling question (03 §5) is the only blocker.
- "Ask a Coworker to analyze a selected group": = hand a Context View to an agent; MCP tools already expose chunk/cluster/context reads [OBS `server/mcp/index.ts:45-180`]. The *return path* (agent results back as candidates) is the Proposal layer generalized [INFERENCE].
- **How GSC avoids becoming a knowledge-management app**: keep views and interactions thin; remember P6/D §5.3 ("structure is a shackle") — GSC should not *demand* organization. Its charter already says Progressive Complexity [OBS MANIFESTO §6].
- Save resulting knowledge: candidate→commit into items/structured objects. [INFERENCE]

## 3. Scenario B — Thylas (user + Coworkers on a research project)

Share Artifacts · organize materials · common representation · observe agent activity · modify agent output · preserve decisions/provenance · reuse prior work.

- Artifacts + authority/versioning answer share/preserve/reuse [OBS `artifacts/*`].
- Common representation: Thylas has no persistent representation object today (boards client-local) [OBS]. Options: (a) own it in Thylas, (b) use GSC Context Views via stable interface [BRIEF: "Thylas can use GSC through stable interfaces"], (c) hybrid: Thylas owns the working surface, GSC owns membership+provenance. [INFERENCE] (c) matches both charters ("Thylas is a consumer", `03:4-6`).
- Observe agent activity: Ream's signals over Artifacts (file-tree bars equivalent = library rows; read wear = clause/passage highlights) [RESEARCH, A §8.2 explicitly prototypes legal due diligence].
- Modify agent output: 8 Intelligent UI blocks + B's attribution rules; blocked on implementation [OBS].
- Decisions/provenance: Thylas' nine-step artifact workflow ("canonicalization is a human commit") already matches Candidate→Commit [OBS `04-artifact-creation-evolution.md:27-40`].

## 4. Scenario C — Lemma (learner over months)

Collect materials · build concepts/knowledge structures · understand relations · find gaps · reorganize understanding · co-revise explanations with Agent · observe learning development.

Same underlying capabilities, **different domain model**:

| Shared capability | Lemma's learning-specific form |
|---|---|
| Units + relations | Concepts + prerequisite/evidence relations (`state.py` outer/inner edge sets), NOT generic nodes |
| Representation malleability | Reorganizing one's understanding = changing concept structure — literally learning (D §6.1 "working on representation *is* understanding") — high-value mapping [INFERENCE] |
| Provenance/awareness | Learning trajectory + engagement traces as *reflective mirror* (A §7.2.3 users discovered own focus; learners discovering own misconceptions is the same phenomenon) [INFERENCE] |
| Candidate→Commit | Insight S1–S3 pipeline already rule-gated human-visible (`docs/design/adaptive-insight.md`); agent explanation revisions should be proposals |
| Context assembly | Method/Coordinator context selection — stays Lemma-owned; may consume shared primitives for "which materials" |

**Guardrail (brief §1.3)**: Lemma must not become a GSC interface. Its truth is cognitive state (mastery, independence, gaps). GSC-shaped things (chunks, tags) are substrate, never the product model.

## 5. Required conclusion (brief §7 "Required Conclusion")

1. **Shared primitives**: (i) addressable unit with provenance + actor-tagged events; (ii) explicit membership assembly (named, human-committed); (iii) Candidate→Commit for machine output; (iv) relations with typed kinds incl. derivation; (v) bounded-context handoff (selection + scope as part of instruction).
2. **Shared interaction patterns**: localized awareness over artifacts; graded intervention granularity as feedback; inspectable agent interpretation before/during execution; compact requests referencing represented work.
3. **Shared infrastructure candidates** (not decisions — see 08-F): provenance/event recording; signal projection API; proposal/commit workflow; reference/anchor format.
4. **Domain-specific models**: GSC taxonomy + governance; Thylas Artifact authority + workspace; Lemma mastery/evidence/concept model.
5. **Domain-specific views**: GSC browsing/assembly; Thylas workspace/coworker surfaces; Lemma Focus/trajectory/insight views.
6. **NOT to be shared**: Method/Coordinator logic (Lemma); WAM execution (CHORD); permission engines (GSC explicitly refuses RBAC); any universal ontology (brief §12).
7. **Possible future integration points**: GSC-as-context-provider for Lemma via MCP-like read interface (GSC already ships an MCP server [OBS]); Thylas Artifact ingestion surface as the pattern for cross-system writes; shared vocabulary (10-glossary) as the cheapest real integration.

## 6. Cross-agent sections (brief §10)

### A. Project-specific findings (for Lemma)
- Learning trajectory/insight work = the reflective-trace phenomenon (A §7.2.3); worth citing in positioning docs.
- `open_episode/close_episode/completion_met` (no production callers) is a latent Process/Episode primitive — decide keep/kill (05 §5).
- Focus blockOps + selection gestures are Lemma's situated-interaction assets (E); fine-grained within-object reference is *the* known hard problem (E §5.2.3) — relevant to block-level editing.

### B. Cross-project findings (what others can reuse)
- Lemma's independent-vs-hinted evidence admission (`state.py` is_evidence_admissible) is a mature *evidence-quality* model GSC's EvidenceReference lacks.
- Lemma's rule-gated insight pipeline (S1 rules → S2 threshold → S3 restricted generation) is a worked example of Candidate→Commit with low AI-slop risk.

### C. Potential conflicts (cross-project)
| # | Conflict | Evidence |
|---|---|---|
| C1 | Versioning: GSC superseded/no-time-travel vs Thylas full immutable version chain vs brief "Versions" | `GSC/PROVENANCE_MODEL.md:27` vs `Thylas/.../LIFECYCLE.md:17-67` |
| C2 | Terminology drift: Thylas docs use "Context Entry"/"Knowledge Object" as GSC terms; GSC's model has no such names (has item/Chunk/Structured Object) | `Thylas/home-interaction/03:21-24`, `09:34` vs `GSC/INFORMATION_MODEL.md` (grep 2026-11-21: "Context Entry" zero hits in GSC) |
| C3 | "Context View" means *assembly* in GSC but reads as *presentation* to outsiders | `CONTEXT_VIEWS.md:7-13` |
| C4 | Single-parent `derived_from` vs recombination practices (D P2 merged 3 versions) | `RELATIONSHIP_MODEL.md:25-41` vs [D §5.3.2] |
| C5 | "WAM Shared Context" (brief) is not a term any repo uses; GSC docs say "Shared Context" = info shared among authorized participants | `GSC/PROJECT_CONTEXT.md:38-50` [OBS]; [BRIEF §1.1] |
| C6 | Process first-class (C) vs GSC "not orchestrator/no event sourcing" | MANIFESTO:147-158 vs [C §4] |

### D. Shared concepts needing consistent definitions
Information Object/Chunk, Artifact, Context (and its layers), Work Representation vs View, Process/Activity/Event/Task/History, Provenance, Evidence, Candidate→Commit. See 10-glossary.

### E. Domain-specific (keep local)
Lemma: Method, Coordinator, Admission tiers, Space/Goal, Socratic rules, insight states. GSC: tag vocabulary, cluster sharing. Thylas: Coworker lifecycle, workspace membership, CHORD auth.

### F. Questions for other agents
- **To GSC agent**: (1) Is Context View intended to become mutable/editable (membership + local relations + arrangement), or should a sibling "Working Assembly" concept exist? (2) Can Proposal kinds extend from classification/association to *content incorporation* and *reorganization* (D F3 scopes)? (3) Is single-parent derived_from a deliberate constraint? (4) Any appetite for engagement-signal projections over events, or is that out of charter?
- **To Thylas agent**: (1) Source of the term "Context Entry" — stale or deliberate? (2) Status of board/representation persistence decision (own vs GSC)? (3) Is the Processes page meant to carry C-style process structure? (4) Does artifact storage [Q] (`artifacts/DEFINITION.md:109-110`) block or enable representation work first?
