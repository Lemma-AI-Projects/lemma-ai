# Real-Time Learning Interaction — Research Index

> Started 2026-10-21. This folder-in-one-file index points at the research programme for
> **how an agent decides and enacts the next learning activity during an ongoing session**.
>
> Not a plan for shipping features. Not a Learning Move spec. Not a redesign of Focus Mode.

## The material (4 files, mapped from the 6 requested deliverables)

| Requested | Where it lives | Why merged |
|---|---|---|
| R&D Decision Log | `decisions/rnd-real-time-interaction.md` | as-is |
| Research Track Taxonomy | `methodologies/rnd-methodology.md` §7 | a taxonomy without its criteria is just a list; the assessment belongs with it |
| Overall Research Methodology | `methodologies/rnd-methodology.md` §1–§6 | as-is |
| Track-Specific Methodology | `methodologies/rnd-methodology.md` §8 | four separate files would repeat the same workflow four times |
| First Research Cycle | `planning/research-cycle-01.md` | as-is |
| Research Index | this file | as-is |

Six documents were requested; four exist. The instruction was "a reliable research
foundation, not maximum document volume", and §8 of the methodology is arguably the weakest
kind of document (four near-identical sections). If a track ever needs its own file, split it
then — with content, not in advance.

---

## Repository audit — what actually exists

Facts below are from the code at `practice-system` HEAD (2026-10-21), not from intentions.
The distinction matters: several concepts in this programme are **already implemented**, and
research should not "discover" them.

| Concept | Status | Evidence |
|---|---|---|
| Evidence → Learner State (derived, not stored) | **Implemented** | `backend/ai/knowledge/state.py`, `architecture/learner-state.md` |
| Coordinator picks a Method per turn | **Implemented** | `backend/ai/coordinator/`, tests in `tests/ai/coordinator/` |
| Method system | **Implemented, but only 2 methods** | `ai/methods/direct_explanation/`, `ai/methods/socratic/` |
| Agent can act on the environment | **Implemented** (4 real tools) | `ai/tools/declarations.py:21-40`: `render_desmos_graph`, `save_note`, `read_page`, `record_evidence` |
| …but the prompt only started mentioning it | **2026-10-20** | `text_chat.system.txt` "Acting on the environment" section |
| Referencing material into a conversation (Mala) | **Implemented**, with snapshot semantics | `models/board_context.py` (`items` is a JSONB snapshot), `streamChat.ts` `contextBundleIds` |
| Insight (help-dependence observation) | **Experimental** — preview page + V0 rules only | `design/adaptive-insight.md`, `.plans/adaptive-insight/` |
| Agent initiative | **Prompt stance only** — no mechanism, no measurement | `text_chat.system.txt` "Initiative" |
| Learning Move | **Concept only** | `decisions/rnd-real-time-interaction.md` P1 |
| "Where the learner is / what they are doing" | ⚠️ **Does not exist** | `planning/vision-gaps.md` C2: `last_read|reading_position|scroll_position` → 0 hits |
| Episode open/close | **Code without production callers** | `planning/vision-gaps.md` A3 |

### What this audit changes about the programme

1. **D1 is half-done.** The agent already draws, writes, reads and records. The gap is not
   capability, it is (a) the prompt not telling it, and (b) no abstraction over the four.
   ⇒ A cycle that "proves the agent can act on the environment" would be re-proving 2025's work.
2. **Q1 has no signal.** Any question shaped like *"when the learner is doing X, should the
   agent…"* is unanswerable today. Either instrument one narrow signal (Track 03) or use a
   signal that already exists — the conversation itself. `planning/research-cycle-01.md` takes the
   second route on purpose.
3. **Coordinator already exists.** D6 therefore reads "do not extend it speculatively", not
   "do not use it". A cycle that proposes a Coordinator would be proposing something present.

### Existing documents this programme must not duplicate

| Document | Role | Relationship |
|---|---|---|
| `decisions/agent-principles.md` | the six principles (A–F) | **owns** them; the decision log references, never restates |
| `planning/vision-gaps.md` | what the vision promised vs what runs | authoritative gap list; cycles cite items (A3, C2, …) |
| `architecture/learner-state.md` | state contract (no scores, derived) | constraint on any cycle |
| `architecture/method-system.md` | Method system design | constraint: methods are swappable, not default |
| `architecture/evidence-flow.md` | how evidence moves | constraint: evidence has one write surface |
| `design/adaptive-insight.md` | insight V0 boundaries | sibling research; do not merge |
| `design/focus-mode-plan.md` | Focus Mode improvement plan | product plan, not research; cycles may feed it |
| `docs/research/learn-space-behavior-map.md` | user-behaviour map | empirical material for Track 01 |

---

## How to read this programme

1. Want to know **what we decided** → `decisions/rnd-real-time-interaction.md` (statuses: accepted / provisional / open)
2. Want to know **how we work** → `methodologies/rnd-methodology.md` §1–§6
3. Want to know **whether four tracks make sense** → `methodologies/rnd-methodology.md` §7
4. Want to know **what the next concrete piece of work is** → `planning/research-cycle-01.md`

Nothing here has been experimentally validated. The methodology is proposed; the cycle has
not been run. Any document that implies otherwise is wrong, including this one.
