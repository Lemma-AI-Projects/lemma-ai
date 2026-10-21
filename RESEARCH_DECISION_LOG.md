# R&D Decision Log — Real-Time Learning Interaction

> Status: living document · started 2026-10-21
> Owner of principles: `AGENT_PRINCIPLES_V0.md` (the six principles live there; this file
> records **decisions about the research programme**, not a second copy of the principles).

## How to read this file

Three statuses, and they mean different things:

| Status | Means | What can change it |
|---|---|---|
| **Accepted** | Decided by the product/research lead. Do not re-litigate in passing. | An explicit new decision, recorded here with a date |
| **Provisional** | A working concept we act on, but nobody should build a contract on it | Evidence, or an explicit decision |
| **Open** | Genuinely undecided. **Do not resolve it silently in code or docs.** | A recorded finding (see `RESEARCH_METHODOLOGY.md` §4) |

Every accepted decision gets a **falsifier**: the observation that would make us reopen it.
A decision with no falsifier is a preference, not a decision.

---

## 1 · Accepted decisions

### D1 · Chat is not the only surface

Learn Space supports agent participation through more than one surface: material, notes,
annotations, chat, and — in principle — anything the agent can act on.

- **Rationale**: a chat-only agent can only *talk about* learning; the environment cannot
  participate.
- **What already exists** (repository fact): `render_desmos_graph` draws on the canvas,
  `save_note` writes notes, `read_page` reads material, `record_evidence` records evidence
  (`backend/ai/tools/declarations.py:21-40`). So D1 is **partly implemented**, not a wish.
- **What does not exist**: inserting an exercise, changing how material is presented.
- **Falsifier**: if experiments show that learners never attend to non-chat surfaces, D1
  loses its justification (the surfaces would be decoration).
- See: `AGENT_PRINCIPLES_V0.md` Principle D.

### D2 · Agent initiative

The agent may judge and initiate the next learning activity without being asked.

- **Rationale**: learners cannot reliably supervise their own knowledge boundaries; making
  every decision a menu hands that supervision back to them.
- **Implementation status**: **no mechanism**. It is currently a prompt-level stance
  (`text_chat.system.txt`, "Initiative" section, added 2026-10-20). The prompt asks for a
  concrete next step instead of a question; nothing enforces or measures it.
- **Falsifier**: if learners consistently override or ignore agent-initiated steps, the
  problem is not "the agent is too passive" and D2's premise should be re-examined.
- See: Principle A, B.

### D3 · User agency is not in conflict with D2

The learner can redirect, decline, or leave at any point. This is not a concession to D2 —
it is what makes D2 tolerable.

- **Rationale**: an agent that cannot be redirected is not a guide, it is an autorun.
- **Implementation status**: the *ability* exists (user can always type something else or
  close the panel). Whether the agent **honours** redirection is prompt-level only.
- **Falsifier**: a finding that redirection attempts are routinely ignored would turn D3
  from "accepted" into "not achieved".
- See: Principle A (the explicit warning not to model this as user-led vs agent-led).

### D4 · Initiative ≠ interruption

Three things separated: proactive **judgment**, proactive **action**, proactive
**interruption**. The first two are core; the third is a separate decision and defaults to off.

- **Rationale**: an agent that speaks whenever it judges becomes noise; the value of a
  judgment is partly in deciding not to surface it.
- **Implementation status**: nothing distinguishes the three in code. There is no notion of
  "the learner is currently doing something" to interrupt.
- **Falsifier**: if it turns out that silent judgment cannot be made useful (because nothing
  ever surfaces), the separation collapses into "action requires interruption".
- See: Principle B.

### D5 · Evidence-grounded judgment

Four levels must stay separate: observed behaviour · contextual interpretation · hypothesis
about understanding · conclusion supported by evidence.

- **Rationale**: "re-read the paragraph twice" is a fact; "doesn't understand" is a guess.
  Conflating them produces confident wrong teaching.
- **What the system can actually store** (repository fact): `knowledge_evidence` holds
  verdict + reliability + basis (`LEARNER_STATE_V0.md` §1). It records **judgments already
  made**, and it has **no place to store a hypothesis**. So D5 is currently a *prompt
  constraint* ("lower your confidence, don't assert"), not a modelled concept.
- **Falsifier**: if experiments show that acting on unflagged guesses produces no worse
  outcomes than acting on evidence, the distinction is not worth the constraint.
- See: Principle E; `LEARNER_STATE_V0.md`.

### D6 · Low coupling

Do not assume this programme needs a new Coordinator, a Scheduler, a new Memory System, a
replacement Learner State, or a multi-agent framework. Add architecture only when an
experiment establishes the need.

- **Rationale**: every one of those is a large bet placed before the question is even clear.
- **Repository note**: Coordinator, Method system, Learner State and Space Memory **already
  exist**. D6 therefore means *do not extend them speculatively*, not *do not use them*.
- **Falsifier**: a research cycle whose result cannot be interpreted without one of those
  layers. That would be evidence, and it should be recorded here before building.
- See: Principle F.

### D7 · Scope is real-time interaction

In scope: what happens *during* a learning session. Out of scope: spaced repetition,
calendar scheduling, long-horizon curriculum planning, revision administration.

- **Rationale**: scheduling is a different research problem with different evidence; mixing
  them makes both untestable.
- **Falsifier**: a finding that real-time decisions cannot be evaluated without a longer
  horizon. Handle by *widening one experiment*, not by widening the programme.
- See: `ai/coordinator/` (exists, decides Method per turn) — it is in scope only as an
  existing constraint, not as something to grow.

---

## 2 · Provisional concepts

### P1 · Learning Move

Working definition: *the minimal operation performed by an agent on the Learn Space.*

- Candidates: pose a contextual question · present an example · insert an exercise ·
  annotate content · bring related material in · change how material is presented.
- **Explicitly not**: an ontology, an API, a runtime primitive, a DSL, or a closed enum.
- **Why provisional**: we have no data on which moves are worth distinguishing. The four
  things that exist today (draw a graph, save a note, read a page, record evidence) are
  **tool calls**, and it is an open question whether "Learning Move" is a useful abstraction
  over them or just a rename.
- **Decision needed by**: the first cycle that tries to compare two moves.

### P2 · Focus Mode interaction layout

The current layout (materials rail · body · annotation rail · chat panel) is a **candidate
design**, not a constraint on the research. It is also a shipped implementation, so
experiments should not assume it can be ignored.

- **Why provisional**: D1 says chat is not the only surface; the layout is the main place
  that claim would have to become real. Whether it survives is exactly what Track 02 is for.

---

## 3 · Open questions

These are preserved as open. **A doc or a commit that resolves one of these without a
recorded finding is a defect.**

| # | Question | Why it is not answerable yet |
|---|---|---|
| Q1 | How does the agent identify an opportunity to intervene? | No signal source exists for "what the learner is doing right now" (see §4) |
| Q2 | How are candidate learning actions compared? | No move taxonomy, no cost model for a move |
| Q3 | When is acting better than staying silent? | Silence has never been measured as an outcome |
| Q4 | How does uncertainty change the decision? | Uncertainty has no representation (D5) |
| Q5 | How are Learning Moves represented and enacted? | P1 is a definition, not a mechanism |
| Q6 | How is user control expressed in the interaction? | Redirection works by typing; whether that is enough is untested |
| Q7 | Does the Focus Mode paradigm need to change? | Depends on Q1–Q3 |
| Q8 | How do we assess decision quality, interaction quality, and learning outcome? | Only the third has a candidate instrument (evidence); the first two do not |

---

## 4 · One repository fact that constrains everything above

⚠️ **There is currently no record of "where the learner is" or "what they are doing".**

Checked 2026-10-20 (`VISION_GAPS.md` C2): `grep -rniE "last_read|reading_position|lastRead|resume_position|scroll_position" backend frontend/src`
→ **0 hits**. Frontend and backend both.

Consequence: **Q1 cannot be investigated as stated** until *something* observes the session.
Any first experiment must either (a) instrument one narrow signal, or (b) use a signal that
already exists — e.g. what the learner types into the chat. This is a prerequisite, not a
detail, and it belongs to Track 03.

---

## 5 · How this log changes

- New **accepted** decision: add a dated entry with rationale + falsifier, and say which
  existing document it supersedes.
- Moving **provisional → accepted**: requires a result recorded under
  `RESEARCH_METHODOLOGY.md` §4, cited inline.
- Moving **open → accepted**: same requirement. "It seems reasonable" is not evidence.
- Deleting anything: don't. Supersede it and keep the old entry, so the reasoning trail
  survives.
