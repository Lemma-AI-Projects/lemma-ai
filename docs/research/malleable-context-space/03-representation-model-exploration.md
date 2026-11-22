# 03 · Representation Model Exploration

> How are information objects selected and organized for a particular working purpose?
> Tags: [OBS] · [RESEARCH] · [INFERENCE] · [HYPOTHESIS] · [UNKNOWN]

## 1. Definition used in this folder

**Work Representation** [RESEARCH, D §3.2]: an inspectable, revisable organization of **units** (elements treated as coherent objects of work; boundaries need not coincide with source messages or documents) and **relations** (how units are currently understood w.r.t. each other), through which humans and agents ground subsequent action, inside a wider **Work Environment** (tools, source materials, artifacts, agents).

Key properties:
- Representational **malleability** = capacity to reshape the organization as a way of advancing the work (not just documenting it).
- The represented *state* is the current organization itself — "not a separate summary or fixed record".
- Three relationships: **R1 grounding** (organization guides action), **R2 interpretation/incorporation** (action results revise units/relations), **R3 environmental transformation** (action changes the Work Environment). "Visible ≠ grounded; generated ≠ incorporated; represented ≠ consequential." [RESEARCH, D §6.1.1]

## 2. Inventory of representational ingredients (and where each project already has them)

| Ingredient | Paper basis | Existing hook in our projects | Gap |
|---|---|---|---|
| Units | [D] content / commitments / operations | GSC Chunk/Structured Object [OBS `INFORMATION_MODEL.md:124-16`] · Lemma Focus block selection (`frontend/src/features/learn-space/focus/blockOps.ts`) [OBS] | unit = *role in a representation*, not a new object type ([D] roles emerge in use) |
| Relations | [D] interpretive / compositional / developmental continuity | GSC 5 relation kinds [OBS `RELATIONSHIP_MODEL.md:25-41`] | representation-local relations (edges between arranged units) are missing in GSC; Thylas boards have none persisted [OBS boards client-local, `Thylas/docs/home-interaction/00-existing-system-audit.md:101`] |
| Groups | [D] Frames; [E] spatial grouping | GSC Cluster (multi-membership, owns no content) [OBS `INFORMATION_MODEL.md:131-145`] | Cluster ≈ group candidate; but Cluster is persistent-taxonomy-ish, Frames are per-representation |
| Hierarchies / sequences | [D] Sensecape abstraction hierarchy; version trees | Lemma course/learning sequences [OBS] | domain-specific — keep local |
| Spatial arrangements | [D] spatial forms (33/61 cases); [E] layout ink | GSC Canvas info-tree component [OBS `GSC/COMPONENT_REGISTRY.md`] · Lemma `trajectory/canvasLayout.ts` pure functions [OBS] | persistence & semantics of layout — Question C |
| Clusters of attention | [A] engagement bars | — (derived view, see 01 §3) | don't store |
| Representation history | [D] developmental continuity (IdeationWeb derivation paths; Spatial Balancing version trees) | GSC append-only events [OBS] | whether representation edits need their own event stream — Question E |

## 3. The central distinction (brief §5.2)

| Kind | Persistent? | Created by | Example | Maps to |
|---|---|---|---|---|
| Persistent information | yes | any | a paper, a decision, a concept | GSC items; Thylas Artifacts |
| Temporary working representation | maybe not | human/agent | today's comparison board | MalleableSpace scratch Space; Lemma Focus session |
| User-created arrangement | yes (if saved) | human | curated Context View | GSC Context View [OBS `CONTEXT_VIEWS.md`] |
| Agent-generated arrangement | candidate first | agent | thematic grouping of interview findings | [D] P5 case: agent grouping judged "too loose", revised jointly |
| Shared representation | yes + governance | multi-party | team research board | Thylas Workspace-scoped |
| Private exploration | no/soft | one user | alternative drafts kept in parallel | [D] P2 parallel slide versions |

[RESEARCH, D §5.3.2] strongest caution against premature persistence-as-structure: P6 abandoned a tree and kept materials loose — "Starting with structure is a shackle… without those boundaries my thinking was free." Structure is often *an output of thinking*, not an input.

**Answer to "does every representation need to become persistent?"** — [HYPOTHESIS] No. Default should be *session-local, save-on-demand*. Persistence is a user act (or an explicit agent proposal). Supporting evidence: D found participants created 3–11 Spaces each and reused selectively; [OBS] GSC's Context View is already an explicit, named, human-approved assembly — the "save" primitive exists.

## 4. What a Work Representation is NOT

- Not a database: it *references* information objects (GSC membership by explicit `item_ids`, never inferred — [OBS `CONTEXT_VIEWS.md:32-38`] — this rule is exactly D's "selectively externalize what currently matters rather than reproducing it in full").
- Not a document: documents can be *units inside* a representation ([D] .report in Ream is a unit that other units cite [RESEARCH, A]).
- Not a canvas: [RESEARCH, D §6.1.2] "the model concerns the relationships among representation, action, and environment rather than a particular visual interface category". List/table/notebook forms qualify (61-case corpus: Node-link 25, Spatial 21+, Table/Document/Notebook/Mixed also present).
- Not a View: one representation can be *shown* many ways (04).

## 5. Cross-project placement (working hypothesis, not decision)

```text
GSC:  owns membership + relations + provenance of assemblies  (Context View as data)
Thylas: owns Artifact identity/authority; boards/spatial UI are *views over* representations
Lemma: owns learning-specific representation semantics (concept maps, knowledge gaps, trajectories)
```

[INFERENCE] If GSC's Context View = "named, explicitly assembled record", it is the closest thing we have to a persistent Work Representation. But note terminology risk: D's Work Representation is *evolving and editable in place*; GSC's Context View reads as a fixed membership record ("a named, explicitly assembled record", `INFORMATION_MODEL.md:93-103`). Whether Context View becomes malleable (mutable membership + local relations + arrangement) is a **core open question for the GSC agent** — it may be better to add a sibling concept than to mutate Context View's meaning.

## 6. Representation history

[D] developmental continuity is a *relation* concern (derivation links), not necessarily a full edit history. [OBS] GSC already forbids time travel. [HYPOTHESIS] Keep representation history as append-only *events on the representation* (who reorganized what, when) — same posture as GSC history: auditable, not replayable. This preserves the existing decision while satisfying [A]'s "provenance as part of the working experience" (localized display over events).

## 7. Open points → 09

1. Context View (fixed record) vs Work Representation (evolving organization) — extend or sibling? (founder/GSC)
2. Representation-local relations: new relation kind or representation-scoped table? (technical, deferred)
3. Save-on-demand default: confirm with real users (Lemma Focus sessions are the nearest testbed).
4. Multi-parent derivation vs GSC single `derived_from` (from 02 §4.4).
