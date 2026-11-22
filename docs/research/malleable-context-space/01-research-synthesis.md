# 01 · Research Synthesis — Five Directions, One Picture

> Evidence tags used throughout this folder:
> **[OBS]** observed project fact (path:line) · **[RESEARCH]** paper finding (cited) ·
> **[INFERENCE]** architectural deduction from evidence · **[HYPOTHESIS]** design judgment · **[UNKNOWN]**
> All five papers were fetched and read on 2026-11-21 (full text except where marked). Citations are `●` verified-live.

## 0. Sources

| ID | Paper | Access level | Local notes pre-existing? |
|---|---|---|---|
| A | Ream: Unfolding Mutual Awareness in Human-Agent Workspaces (arXiv:2610.09497, Jiang et al., UCSD/Ai2/UW) | ● full HTML read | none — zero hits in GSC / Thylas / lemma-ai (`grep -ril "Ream"` only substring noise) |
| B | "When to Hand Off, When to Work Together": Concurrent Interaction (arXiv:2603.02050, Son et al., KAIST et al.; CLEO) | ● full HTML read | none (`grep -ri CLEO` zero hits in all three repos) |
| C | Interaction, Process, Infrastructure: A Unified Framework (arXiv:2506.11718, Wang & Lu) | ● full HTML read | none (`grep` zero hits) |
| D | Working Through Representation: Malleable Workspaces (arXiv:2610.30893, Chen et al., MSRA/Tongji; MalleableSpace) | ● full PDF extracted & read | none |
| E | Inkitiate: Initiating and Steering Agent Assistance through Ink (arXiv:2610.39905, Wang, Tsung, Qiu et al.; feature of Huabu, `github.com/microsoft/Huabu`) | ● full HTML read | none |

**[OBS]** The task brief said "use the existing research reference in the project if available" for B/C/E. None of the three repositories (verified 2026-11-21, including Thylas full git history) contains research notes on any of the five. All five were identified and read from arXiv directly. Findings below are paper findings; everything tagged [INFERENCE]/[HYPOTHESIS] is ours.

Note on D and E: both are built on **Huabu** (Microsoft's open-source spatial workspace), which the brief calls "Huabu's research direction". D's MalleableSpace source is `github.com/microsoft/huabu`; E states "Inkitiate is implemented as a feature within Huabu".

---

## 1. Per-dimension synthesis

### 1.1 Representation — "What are we working with?" (D primary; C secondary)

- **Core insight [RESEARCH, D]**: Conversational histories do not capture the evolving organization that guides subsequent action. Four structural mismatches vs. conversation-centered AI: **unit** (can't address fragments at the right granularity), **relation** (semantic/evidential links not preserved), **state** (what is current/unresolved is implicit), **progression** (materials don't carry into the next action). The fix is a *Work Representation*: an inspectable, revisable organization of **units** (coherent objects of work, boundaries need not match source messages/documents) and **relations**, distinct from both a chat transcript and a final artifact.
- **Supporting evidence [RESEARCH, D]**: 58-paper/61-case comparison: unit roles split into content / commitments / operations; relations preserve interpretive, compositional, or developmental continuity. 3-month deployment (7 users, 43 Spaces, largest 629 nodes): representational *roles* emerge in use, not from node type (P6's Text node was both an unresolved-decision reminder and an agent prompt).
- **Limitations [RESEARCH, D]**: model proven descriptive/analytic over the corpus; generative value untested; 7 users, narrow roles.
- **Product implications [INFERENCE]**: "Representation" is a *working* structure layered over persistent information — it must not become a second database. D explicitly warns the model "concerns the relationships among representation, action, and environment rather than a particular visual interface category" — i.e. not just a canvas.
- **Cross-project**: GSC already separates Raw Information / Structured Object from Context View (explicit assembly) [OBS, `GSC/INFORMATION_MODEL.md:93-103`] — structurally compatible with D's split. Thylas Artifacts are closer to D's *Work Environment* objects (persistent, versioned) than to Work Representations.
- **Unresolved**: does every representation need persistence? (→ 03, Question E).

### 1.2 Situated Interaction — "How do we manipulate it?" (E primary)

- **Core insight [RESEARCH, E]**: Ink-initiated requests are never self-contained: meaning comes from *brief marks + selected materials + spatial relationships + prior results*. Three connected activities: **bringing materials in, thinking with materials, shaping the space**. The context unit users expect is "an evolving line of work" — not one query, not the whole canvas.
- **Supporting evidence [RESEARCH, E]**: formative N=8 + study N=18, 181 ink queries; 69.1% of queries explicitly reused earlier generated/retrieved material. Ink vocabulary: linguistic 97.8%, referential/scope-marking 39.2%, spatial/layout 9.4%, depictive 9.9%, relational 6.1%; 76/181 combined ≥2 functions. Bounded submission (lasso + explicit selection + sigil) matters: nearby-but-unselected material is *not* task input.
- **Limitations [RESEARCH, E]**: single session, students, descriptive not comparative; within-object fine-grained references (a paragraph, one day of an itinerary) were meaningful but unreliable (U07 asked about one song, got all eight).
- **Product implications [INFERENCE]**: "selection is a semantic act" — the boundary of a selection *is* part of the instruction. Local context ≠ global context must be representable and inspectable, and the agent's interpretation of the boundary must be correctable.
- **Cross-project**: E's bounded submission is *runtime* context (WAM-side in CHORD terms); GSC's Context View is *persistent* named assembly. Do not collapse these layers. Lemma's Focus mode block-selection is the same gesture family.
- **Unresolved**: can spatial operations become reliable semantic operations? (E says only partially, today).

### 1.3 Mutual Awareness — "How do participants understand each other?" (A primary)

- **Core insight [RESEARCH, A]**: Files capture current state, not how they came to be. Mutual awareness = tracking **both parties'** engagement over time, visualizing it *locally on the artifacts* (computational wear), and exposing the same history to agents as retrievable signals.
- **Supporting evidence [RESEARCH, A]**: signals carry when/who/category (search, read, write, chat, organize)/target/strength ∈ [-1,1] with heuristic weights and denoising; localized views (file-tree attention bars, per-file signal history, PDF read wear, inline reference chips); `read_signals` tool with 4 query modes. Lab N=12 + longitudinal N=6: traces helped users inspect evidence and steer (P8 redirected when a subfolder was barely touched); agents picked up implicit interests from workspace activity (P1's inline notes, P11's surprise section "not what I asked… very helpful"); users recognized their own evolving focus from their own traces (P6 "uncover patterns that I could not recognize"); new agents continued earlier agents' work (LP4).
- **Limitations [RESEARCH, A]**: no baseline/ablation; all participants graduate researchers; noisy single actions (a paper left open ≠ interest) — the design deliberately shows patterns + on-demand history instead of inferring intent.
- **Product implications [INFERENCE]**: provenance becomes a *working surface* when it is localized on the object being read/edited — not when it lives in a detached audit log. Trace display should aggregate + allow drill-down; do not infer purpose of every interaction.
- **Cross-project**: GSC's append-only events + provenance [OBS, `GSC/INFORMATION_MODEL.md:75-91`] is exactly the missing substrate; what's missing is the *presentation* and the *agent query* layers. Thylas' "who created / who last modified / why" questions in Intelligent UI map 1:1 onto Ream's who/what/where/when/how/why table.
- **Unresolved**: per-agent attribution when multiple Coworkers act (A §8.3: users asked "which agent was responsible for this edit").

### 1.4 Concurrent Collaboration — "How do we work together?" (B primary)

- **Core insight [RESEARCH, B]**: Process transparency creates intervention opportunities — but without **attribution** (whose change is this?) and **adaptation** (update the plan), interventions produce conflicts (probe 1 reverted user edits). CLEO adds User Change Detection → Attribution Change → Plan Update modules (plan updates *only* when user changes conflict or redirect). Concurrent interaction "requires reification — making the agent's intermediate work products into discrete, manipulable objects".
- **Supporting evidence [RESEARCH, B]**: Study 2 (N=10, 214 turns): Hands-off 70.1%, Observational 68.7%, Concurrent 31.8%, Directive 28.5%, Terminating 8.9% of turns. 5 categories/10 codes; 6 triggers (idea-spark / early-outcome-visibility / fine-detailing readiness → concurrent only; misaligned-interpretation / quality-drop → any of C/D/T; new-task → D/T); 4 enabling-factor categories (mental model of agent, relative task importance, preferred intervention modality, expected agent response). Decision model with 6 loops; hands-off is dynamic, not a fixed state. Granularity of intervention = calibrated feedback (fine edits = "apply going forward"; appropriation = "direction validated").
- **Limitations [RESEARCH, B]**: 2-day, N=10, Figma/design only; ReAct architecture is one choice; note an earlier listing of this paper reports N=12/255 turns/33.7% concurrent — the arXiv v2 read here reports 214 turns / 31.8%; treat counts as version-dependent. §5.5 says 9.7% termination while §4.3 reports 8.9% — internal inconsistency in the paper; we cite 8.9%.
- **Product implications [INFERENCE]**: any human-agent shared representation must (a) tag every mutation with actor, (b) let agent and human edit concurrently, (c) interpret edit granularity as signal. "Producing ≠ overwriting" (Thylas) is the governance side of the same coin.
- **Cross-project**: GSC's `events` already record actor [OBS, `GSC/PROVENANCE_MODEL.md:27-36`]; Thylas B2 boundary ("WAM never writes Thylas tables… `produced_by` link", `Thylas/docs/product/definition.md:201-223`) is the ingestion-side attribution rule.
- **Unresolved**: how do human edits and agent operations *conflict-resolve* in a persistent object with versioning? (neither B nor D fully answers).

### 1.5 Process & Infrastructure — "How does work persist and evolve?" (C primary)

- **Core insight [RESEARCH, C]**: The missing capability is not model quality but **structural adaptation**: a process representation that can modify its own structure — Reframing (meaning), Reorganization (topology), Reorientation (where effort goes). Process = persistent, explicit, editable — "unlike plans, histories, or execution logs". Five-module Process Model: **Problem Space, Workflow, Operations, Environment, Reflection**. Three layers: Interaction (projections; UI decoupled from process logic) / Process / Infrastructure (models, tools, memory, coordination).
- **Supporting evidence [RESEARCH, C]**: conceptual/theoretical paper — argument + representational analysis of chatbots/copilots/agents (each encodes an implicit collaboration model; all treat structural change "implicitly, locally, reactively"). No empirical evaluation. Its Environment module is a *workspace of artifacts and intermediate results* — convergent with D's Work Environment.
- **Limitations [RESEARCH, C]**: no implementation, no study; five modules are asserted minimal-sufficient, unvalidated.
- **Product implications [INFERENCE]**: if Process is first-class, then "goals/decisions/reflections" become inspectable objects and session handoff stops being a re-prompt ritual. But C does not decide storage: process-as-object vs process-as-events remains open (→ 05).
- **Cross-project**: GSC explicitly says history is append-only and **not** event-sourced ("no time travel", `GSC/PROVENANCE_MODEL.md:27`) — compatible with C only if Process is a stateful object whose history is events, not rebuild-from-events. Thylas keeps "the person's working state" authority vs WAM's "system's reasoning state" (`Thylas/docs/product/definition.md:71-82`) — C's Problem Space lives on the person's side; Operations/execution on WAM's.
- **Unresolved**: Process vs Activity vs Event vs Task vs History (→ 05, 10).

---

## 2. Interactions between dimensions (what happens when combined)

| Interaction | Finding |
|---|---|
| Situated interaction × Representation | E's bounded submission defines *what enters* a Work Representation unit; D's R2 incorporation defines *how it lands*. Combined: selection boundaries should survive as part of provenance ("this unit came from that lasso on that source"). [INFERENCE] |
| Mutual awareness × Provenance | A shows provenance only becomes usable when localized on the object; D shows representation changes are the *substance* of work. Combined: "who reorganized whom, when" is first-class history, not metadata. [INFERENCE] |
| Concurrent editing × Persistence | B's attribution requirement + D's "generated ≠ incorporated" + Thylas "Producing ≠ overwriting": every write needs (actor, authorization scope, incorporation status). Without one of the three, conflicts surface as silent reverts (B study 1). [RESEARCH + OBS] |
| Process history × Context retrieval | C's Reflection + A's signals: accumulated engagement/decisions should influence *future context assembly* (A: agents built on earlier work; LP4). But A warns against inferring intent from single actions — aggregate + drill-down. [RESEARCH] |
| Spatial organization × Semantics | E: spatial marks *sometimes* carry semantics (39.2% referential, 9.4% layout) and fail silently when the agent misses scope. D: organization is meaning, but roles emerge in use. Combined: spatial structure is a *weak-but-cheap* semantic channel — must be inspectable/correctable, never the only channel. [RESEARCH] |

## 3. Ideas that only emerge from the combination

1. **The Candidate→Commit convergence (shared primitive).** GSC's Proposal layer ("Neither writes user data directly", `GSC/INFORMATION_MODEL.md:147-163`), Thylas' "canonicalization is a human commit" + Revision Proposals (`Thylas/docs/home-interaction/04-artifact-creation-evolution.md:14-40`), D's three incorporation-authorization modes (human incorporates / system-formed candidates requiring approval / predefined rules), and B's "appropriation = validation" all independently conclude: **agent output enters persistent structure through a reviewable step**. [INFERENCE]
2. **The "context carrier" failure is GSC's existence proof.** D's deployment: without two-way connections, "participants became context carriers, manually transferring information into and out of the Space" (P1 re-uploading Zotero papers; P7 copying between repo and Space). This is the strongest empirical statement of the problem GSC's charter claims to solve ("let valuable context outlive a single conversation, workspace, or Coworker", `GSC/PROJECT_CONTEXT.md:7`). [RESEARCH + OBS]
3. **Awareness traces are a mirror, not just a control channel.** A's users discovered their *own* research focus from their traces; Lemma's learning-trajectory work asks the same question in the learning domain. Trace visualization has a reflective function no prompt can replace. [RESEARCH + INFERENCE]
4. **Three different "context boundaries", one gesture family.** Bounded submission (E, per-task, runtime) / Context View (GSC, named, persistent) / representation membership (D, evolving) are complementary layers. A single "context" concept would destroy all three. [INFERENCE]
5. **Attribution is the price of admission for concurrency.** B: without attribution, transparency *hurts*. Any Malleable Context Space allowing human+agent edits must spend schema budget on actor + origin before spending it on taxonomy. [RESEARCH]

## 4. What this synthesis does NOT claim

- [UNKNOWN] Whether one shared technical substrate (SDK/API/schema) should serve CHORD and Lemma — see 08-F alternatives; the evidence above only supports shared *concepts*.
- [UNKNOWN] Whether D's model improves task outcomes (no controlled evaluation exists).
- [HYPOTHESIS] That Ream-style localized wear would be adopted by learners (A's population was researchers; Lemma's population differs).
