# 05 · Process Model Exploration

> How is ongoing work represented and preserved?
> Tags: [OBS] · [RESEARCH] · [INFERENCE] · [HYPOTHESIS] · [UNKNOWN]

## 1. What Research C claims (and its evidence level)

[RESEARCH, C] — **conceptual paper, no implementation, no study**. Claims:
- Activity is the unit of collaborative work: interpretive, structured, contextual, dynamic.
- **Process** = "a structured depiction of an activity's goal, organization, available operations, contextual dependencies, and current state… persistent, explicit, and editable" — explicitly *unlike* plans, histories, or execution logs.
- **Structural Adaptation** = capacity of a process to modify its own structure; three forms: **Reframing** (meaning: goals/assumptions/boundaries), **Reorganization** (topology: steps/dependencies/parallel paths), **Reorientation** (where effort is applied now).
- Five-module Process Model: **P = {Problem Space, Workflow, Operations, Environment, Reflection}**; Reflection mediates change across modules.
- Three layers: Interaction (projections) / Process (the representation) / Infrastructure (models, tools, memory).

Corroboration across the other papers:
- [D] progression/state mismatches are exactly what a process representation would fix; [D] participants' "unresolved decision" notes (P6) are tiny Problem-Space objects.
- [B] plan-update-on-conflict is micro-scale structural adaptation (Reorganization on a task); "switching tasks" is Reorientation.
- [E] "bounded continuity: continue a line of work without restating its context" (DG2) is process continuity at interaction scale.
- [A] LP4: "new agents could pick up earlier agents' work right from where they left" — process continuity realized via shared traces.

## 2. The storage question (do not settle — brief §8D)

Three candidate postures, with implications:

**P-Obj: Process as first-class persistent object** (C's literal proposal)
- + inspectable/editable shared substrate; supports Reframing as data change; maps to Thylas "Processes" surface.
- − Risks a second work-management system inside GSC; [OBS] GSC charter forbids becoming "an agent orchestrator" (`Thylas/docs/product/gsc/MANIFESTO.md:147-158`); users must maintain it ([D] P6: structure too early is a shackle).

**P-Evt: Process as derived view over events**
- − Contradicts C ("unlike histories or execution logs"); can't hold reframing well (meaning is not in events).
- + Zero new entities; consistent with GSC "no event sourcing" (`PROVENANCE_MODEL.md:27`).

**P-Hybrid: small process state object + append-only event history (recommended direction [HYPOTHESIS])**
- Problem Space / current structure = mutable state with governance (Candidate→Commit); history = events (auditable, no replay). Reflections/decisions = documents or structured objects referencing the process.
- + Respects GSC's existing event posture; satisfies C's editability; aligns with [D] "working on vs through representation" loop.
- − [UNKNOWN] granularity: per-what? (task / project / space / learning-goal)

## 3. Disambiguating the vocabulary (brief §8D asks)

| Term | Proposed meaning in this folder | Existing project usage |
|---|---|---|
| Process | structured, evolving representation of an activity (P-Obj/P-Hybrid) | Thylas "Processes" page exists in UI [OBS `Thylas/docs/home-interaction/00-existing-system-audit.md`] — contents TBD by Thylas agent |
| Activity | coherent unit of purposeful work (C) | — |
| Event | append-only record of one mutation/action (GSC events) | [OBS `GSC/PROVENANCE_MODEL.md:27`] |
| Task | a unit of executable work (Operations-level) | WAM's domain [OBS `Thylas/docs/product/definition.md:171-187`] |
| History | the event stream itself | GSC: "never rewritten", no time travel |

## 4. Where process state lives per project (working hypothesis)

| | GSC | Thylas | Lemma |
|---|---|---|---|
| Problem Space | — (not GSC's job; charter: not an orchestrator) | person's working state; Home Conversation is entry [OBS `Thylas/docs/home-interaction/01-vision.md:8-15`] | learning goals live on Learn Space [OBS project memory; Goal 属 Learn Space] |
| Workflow | — | delegated work via WAM; Thylas reports [OBS `definition.md:71-82`] | course/learning workflows (Method auto-switching) [OBS] |
| Operations | — | WAM owns execution | backend Method/Coordinator machinery [OBS `backend/ai/knowledge/state.py`] |
| Environment | **GSC is the information substrate** | Workspace + Artifacts + Resources | Learn Space materials + knowledge structures |
| Reflection | — | Intelligent UI review blocks [P] `05-intelligent-ui.md` | adaptive insight (`docs/design/adaptive-insight.md`), learning trajectory review |

[INFERENCE] GSC supplies Environment-level persistence; it should **not** own Problem/Workflow — consistent with "GSC is not a replacement for WAM's runtime and task-level coordination" [OBS MANIFESTO:155].

## 5. Lemma-specific process question

[OBS] `open_episode` / `close_episode` / `completion_met` are defined (`backend/ai/methods/completion.py`, `backend/services/method_episode_service.py`) but grep 2026-11-21 shows **no production call sites** (only defs/docstrings/tests). The learning "episode" concept is thus a latent process primitive already half-built. [HYPOTHESIS] Lemma's Process model should start from episodes (learning activities) rather than adopting generic workflow engines — but this is a Lemma-local decision; the shared foundation should treat Episode as a domain instance of Process, not the shared core.

## 6. Open points → 09

1. P-Obj vs P-Evt vs P-Hybrid (Question D) — founder decision.
2. Granularity of a process (when does an activity deserve a representation?).
3. Thylas Processes page: what is it today? (question to Thylas agent)
4. Does Reflection need persistence at all, or is it captured as Decisions + annotations? [UNKNOWN]
