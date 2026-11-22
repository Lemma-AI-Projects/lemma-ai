# 06 · Human-Agent Interaction — Intelligent UI Consequences

> How do the four models translate into real interactions?
> Tags: [OBS] · [RESEARCH] · [INFERENCE] · [HYPOTHESIS] · [UNKNOWN]

## 1. Direct manipulation

Evidence base: [D] selection/groupping/connecting/reorganizing are how representations get built; [E] ink makes manipulation itself the instruction; [B] concurrent manipulation is *feedback*.

| Operation | Paper evidence | Interaction requirement |
|---|---|---|
| Select objects | [E] explicit selection + lasso; nearby ≠ selected | selection boundary is part of the instruction; show it |
| Group / ungroup | [D] Frames, emergent grouping | agent may propose regrouping ([D] P5, P6) — commit step required |
| Connect objects | [D] labelled edges; [E] relational ink 6.1% | relations are data (03); ink-created relations need confirmation |
| Reorganize | [D] F3 reorganization (few systems support it!) | rare capability = opportunity; but P6 warns premature structure harms exploration |
| Mark / annotate | [A] notes/stars; [E] annotation as both thinking and instructing | annotations belong in provenance, visible to agent ([A] P1's notes were read by agent unprompted) |
| Move materials between representations | [D] drag fragments from chat/PDF onto canvas (R2) | drag = incorporation gesture; record source anchor |
| Create objects from existing info | [D] unitization; [A] .paper consolidation | candidate→commit when agent does it |

## 2. Conversational interaction

- Object references: [OBS] Thylas `@` invocation system designed (`docs/home-interaction/02-invocation-system.md`, `src/lib/invoke.ts` landed) covering Coworkers/Resources; [E] shows pointing-at-materials beats restating content ("compact request can refer to represented work without restating it", [D] MalleableSpace Fig 4C).
- Context selection: [E] bounded submission; [D] DC2: decide in advance vs agent-directed acquisition — and make *both* inspectable ("how far an agent may seek information beyond that context").
- Delegation & clarification: [E] clarification via suggested options beats re-writing; [B] directive steering works when user believes verbal guidance suffices (enabling-factor model).
- Review/approval: Candidate→Commit (01 §3.1) at varying granularity ([D] DC3: humans inspect and authorize at different granularities).

## 3. Bidirectional editing

[RESEARCH, B] the hard-won rules:
1. **Attribute every change** (user vs agent) or concurrency destroys work (probe-1 reversions).
2. **User edits during agent execution are semantic signals**, graded by granularity: fine edits = correction to apply going forward; mid takeover = redistribution; coarse appropriation = validation → more autonomy.
3. Plan updates should be *selective* (only on conflict/new direction) — not every user edit resets the plan.
4. Intermediate results must be **reified** into manipulable objects to be appropriable ("Concurrent interaction requires reification").
5. Process transparency (visible step-level execution in domain terms) is the precondition for all of the above; text-only reasoning traces failed (D4: "I don't need to read paragraphs—I just see it creating a button").

[OBS] Thylas already encodes the governance half: "agent output arrives as reviewable, editable structure"; user edits structured UI and "the agent interprets those edits and continues working on the *same object*" (`Thylas/docs/home-interaction/05-intelligent-ui.md:9-16`) — this is B's requirement stated as product policy. Gap: the 8 interaction blocks are designed but unimplemented (`00-existing-system-audit.md:76-84`).

## 4. Mutual awareness (the who/what/why layer)

[RESEARCH, A] design approach, portable beyond literature review:
- Track both parties' engagement over time (signals: who/what/where/when/how/why + strength).
- Visualize **locally on artifacts** (file-tree bars, per-file history, read wear, inline chips) — not in a separate dashboard.
- Expose the same history to agents (query tools with recent/top/artifact-scoped/filtered modes).
- Show patterns + drill-down; don't infer intent from single events.

Cross-project mapping: [OBS] GSC events + provenance supply the data; the localized visualizations are Views (04) over them. Thylas' 8-block Intelligent UI (Proposal/CandidateList/EvidenceView/Compare-Dedup/Diff-Revision/StructuredEditor/Approval/Status, `05-intelligent-ui.md:22-32`) are the *interaction* half of the same story; Ream chips/bars are the *ambient* half. [INFERENCE] Both are needed; neither alone answers "what changed, why, supported by which sources, unresolved what".

Multi-party extension: [RESEARCH, A §8.3] users wanted per-agent attribution ("which agent was responsible for this edit") and live per-agent activity — directly relevant to Thylas multi-Coworker workspaces ("colleagues sharing a room, not a multi-agent system", `coworkers/WAM-BOUNDARY.md:27-36` [OBS]).

## 5. Cognitive load

Principles backed by evidence:
- **Progressive disclosure**: [A] bars first, history on demand, evidence on click-through. [OBS] Thylas Eden T4 "work trace compressed to one line"; T5 "single card anatomy".
- **Show the decision, not the database** [OBS `05-intelligent-ui.md:66-68`]; [RESEARCH, D] P5 judged candidate structure as a whole, not node-by-node.
- **Minimal mandatory confirmation**: [B] fine-grained corrections want "apply now and going forward" (fewer dialogs); [D] authorization granularity should vary with change scope (local vs reorganization).
- **Defaults**: [E] outputs in content-appropriate structure, placed near their referents; [A] agent suggestions sit by the input (user keeps initiation control) — 11.9% adoption without annoyance.
- **Warning against hiding**: [B] 14% observation-only turns were mental-model building — users *want* process visibility early ("informed confidence", §5.2). Simplicity ≠ concealment.

## 6. Design implications by project (short)

- **GSC**: add agent-queryable engagement projections over events (Ream's read_signals equivalent) *later*; nothing in the info model blocks it. [INFERENCE]
- **Thylas**: implement attribution + reification first (B) before the fancier Intelligent UI blocks; both are already in their docs. [HYPOTHESIS]
- **Lemma**: Socratic interaction is *directive/concurrent* by nature; ink/selection-style situated gestures (E) fit Focus mode block ops; reflective value of traces (A §7.2.3) is a learning feature, not a UX nicety. [HYPOTHESIS]
