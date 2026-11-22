# 04 · View Model Exploration

> How can the same information and representation be presented differently?
> Tags: [OBS] · [RESEARCH] · [INFERENCE] · [HYPOTHESIS] · [UNKNOWN]

## 1. View ≠ Representation (the load-bearing distinction)

- **Representation** = the working organization itself (units + relations + arrangement) — data-ish, persists per Question E.
- **View** = a *projection* of (persistent information + a representation + derived signals) for a particular intent.

[RESEARCH, C §5] supports this directly: the Interaction Layer "decouples user interface from process logic"; "the same underlying process may be projected as a conversational exchange, a workflow diagram, a timeline, or a spatial workspace". [RESEARCH, D §6.1.2] same for representation: the model is interface-form-agnostic.

⚠️ **Terminology collision (conflict C2)**: GSC's "Context View" is *not* a presentation view — it is a named membership assembly (i.e. closer to a Representation). The word "view" is already taken. See 10-glossary; proposal: call presentation things **Presentation Views** in cross-project docs until renamed.

[INFERENCE] A View needs **no independent storage** by default: it is defined by (source selector, arrangement projection, signal overlays, interaction mode). Only *user-customized/saved* view configurations might persist — and those are small preference objects, not data models (brief §11.7).

## 2. Candidate modes (exploration only — real user needs decide)

| Mode | User intent | Density | Objects | Ops | RO/RW | Operates on | Saveable? |
|---|---|---|---|---|---|---|---|
| Overview | orient, decide next | low | aggregates, signals | navigate, delegate | RO | both | layout prefs |
| Object list | scan/filter/manage | medium | any items | sort, tag, batch act | RW | info | filters saveable |
| Source view | verify evidence | high (raw) | raw.* + anchors | quote, annotate | RW-annotate | info | annotations persist (provenance) |
| Relations / graph | understand structure | medium | units + edges | connect, cluster | RW | representation | as saved representation |
| Timeline | development over time | medium | events/versions | scrub, compare | RO(+actions) | derived from events | no |
| Activity / awareness | who did what (A) | low→drill | signals over artifacts | inspect, steer | RO + steer actions | derived | no |
| Spatial workspace | think-with-materials (E) | variable | heterogeneous units | arrange, ink, delegate | RW | representation | yes (Question C) |
| Process / workflow | track/adapt work (C) | medium | process modules | reframe/reorganize/reorient | RW | process | yes (Question D) |
| Comparison | judge alternatives | high | 2+ units/versions | align, merge, pick | RW-commit | both | transient |
| Learning-specific (Lemma) | concept map / gap map / trajectory | variable | concepts, evidence, episodes | reorganize understanding | RW | representation + learning model | yes |

Sources for the table's evidence: [A] file-tree bars, per-file history, PDF read wear, reference chips = the Activity/Source modes merged *into* working views (localized, not a dashboard); [D] forms in the 61-case corpus (Node-link/Spatial/Table/Document/Notebook/Mixed); [E] canvas + write-back structure ("results should use a content-appropriate visual structure rather than default to a detached block of long-form text", DG4); [C] projections list; [OBS] Thylas Eden-benchmark traits T1–T6 (`Thylas/docs/research/eden-benchmark.md:51-77`) — "three regions same screen", "single card anatomy", "work trace compressed to one line".

## 3. Per-view design questions (applies to each candidate)

1. Read-only or editable? Edit here must route through the same attribution/commit rules as any mutation (B, 02 §2.1).
2. Does it show *persistent info*, a *representation*, or *derived signals*? (Most interesting views mix all three — e.g. Ream's report view shows representation membership + engagement bars + source links.)
3. Is interaction *inside* the view meaningful (semantic interaction [D §2.2]) or merely navigation?
4. Can it be saved? [HYPOTHESIS] save *configurations*, never duplicate data.

## 4. Views that change the underlying work (the interesting cases)

[RESEARCH, D F4]: some systems let representation edits *drive* changes beyond the representation (VISAR outline→prototype; Semantic Prompting spatial edits→report; IntentTagger tags→slides). This is R3. [INFERENCE] Such views are "control surfaces over the Work Environment" and must respect Thylas' ingestion boundary (B2: WAM/agents never write product tables directly; they go through one ingestion surface with `produced_by`, `Thylas/docs/product/definition.md:201-223`).

## 5. Dynamic vs static (Question A preview; alternatives in 08-B)

Observations to weigh:
- [RESEARCH, A] users adapted the *same* visualizations to different strategies (P9 follows agent emphasis; P1 explores low-attention papers) — one view, many readings. Suggests views need not multiply; interpretation does.
- [RESEARCH, D] agents can serve as "an interpretive layer across heterogeneous sources" generating candidate units — agent-generated *representations* are plausible; agent-generated *views* less necessary.
- [RESEARCH, E] output form matters for continued work (structured elements > flat text; "a flowchart made with pen strokes and arrows, rather than an image") — write-back should choose forms, which is arguably transient view selection at authoring time.

[UNKNOWN] whether users want to compose custom views (e.g. "columns I care about") — no evidence in the five papers; Eden traits suggest decision-focused, low-config interfaces ("shows the decision, not the database", `Thylas/docs/home-interaction/05-intelligent-ui.md:66-68` [OBS]).

## 6. Open points → 09

1. Fixed system views vs configurable vs agent-generated (Question A).
2. Rename GSC "Context View" or adopt "Presentation View" term? (cross-project; glossary)
3. Which views are load-bearing for v1 of any shared foundation? [HYPOTHESIS] Object list + Source/awareness merged view + Spatial/working view cover the paper-evidenced behaviors; process view waits for 05's decision.
