# Research Methodology — Real-Time Learning Interaction

> Companion to `decisions/rnd-real-time-interaction.md`. This file says **how we work**, not what we decided.
> Kept deliberately short: a methodology that nobody follows is worse than none.

---

## 1 · How a research question enters

Every investigation starts with one **RQ**, written as a question that could come out either
way. It gets an ID and lives in the cycle file that owns it.

An RQ is only accepted if all five exist:

| | Required | Why |
|---|---|---|
| RQ | one sentence, answerable within one cycle | "How should agents be proactive" is not an RQ |
| **Signal** | what we will *observe* to answer it | no signal ⇒ the question is philosophy |
| **Competing options** | at least **two**, plus "do nothing" where meaningful | one option = implementation, not research |
| **Discriminator** | the observation that would separate the options | without it, every result confirms the favourite |
| **Stop condition** | when we stop and write it up | otherwise it runs until interest dies |

⚠️ If the signal does not exist in the repository, **that is the finding** — record it and
move the question to a later cycle (see `decisions/rnd-real-time-interaction.md` §4).

## 2 · Hypotheses

Written so they can fail:

> H-03: If the agent inserts a comprehension check after two re-reads, the learner will
> answer it **and** continue reading. If they answer but stop reading, the hypothesis is
> weakened — the check worked, the interruption did not.

Each hypothesis gets: **prediction** (what we expect to see) · **what weakens it** · **what
kills it**. A hypothesis with no kill condition is a hope.

## 3 · Choosing competing options

Options must differ in a way the discriminator can see. Useful axes we expect to use:

- reactive vs agent-initiated
- rule-triggered vs model-judged
- chat-mediated vs embedded-in-the-environment
- explicit question vs quiet activity
- act now vs act later vs **don't act**

The last one is not a control condition to be skipped — it is an option, and in several
cycles it will be the one that wins.

## 4 · Evidence — five layers that do **not** substitute for each other

| Layer | What it tells us | What it cannot tell us |
|---|---|---|
| **L1 Feasibility** | it runs, it doesn't crash, it fits the architecture | anything about learners |
| **L2 Decision quality** | the agent chose the action we would have chosen | whether the action helped |
| **L3 Usability** | the interaction is understandable and escapable | whether it was worth doing |
| **L4 Perceived helpfulness** | the learner says it helped | whether it did |
| **L5 Learning benefit** | evidence of changed capability | why, or whether it generalises |

**A working prototype is L1. A favourable reaction is L4. Neither is L5.**
Reporting one as another is the most common way this kind of project lies to itself.

## 5 · Uncertainty and negative findings

Every result is written with five fields — no exceptions, including boring results:

```
Observed:        what happened (no interpretation)
Justified:       the strongest claim the observation supports
Uncertain:       what we still don't know
Alternatives:    which other explanations remain possible
Next:            the cheapest experiment that would narrow it
```

Negative results stay in the file with their date. They are **not** rewritten as "learned a
lot" — a rejected hypothesis is a real output and gets the same word count as a confirmed one.

## 6 · How decisions get revised

`decisions/rnd-real-time-interaction.md` entries carry an **accepted → superseded** trail. A decision moves
only when a result in a cycle file is cited against it. Two rules:

1. **No silent revisions.** If code and the log disagree, the log gets a new entry saying so.
2. **No decision without a falsifier.** If we cannot say what would change our mind, we have a
   preference; label it as such instead of dressing it up.

---

## 7 · Assessment of the four-track structure

The activity-based split is **decided**; the exact four tracks are a **proposal**. My
assessment, with the reasoning:

### 7.1 Coverage

Covers the four things a research programme must do: know (01) · imagine (02) · build (03) ·
judge (04). Nothing obvious is missing.

### 7.2 The one real boundary problem: 01 vs 04

"Examine competing explanations" (01) and "failure analysis" (04) read as the same activity
in two tenses. Without a rule they will either duplicate work or leave a gap between them.

**Proposed rule — by direction of travel:**

- Producing **more possibilities** (a new explanation, an unexplored analogy, a competing
  theory) → **01**
- **Reducing** possibilities (this explanation is now less likely because of observation X)
  → **04**

Litmus: if the output could be written without running anything, it is 01. If it required an
observation, it is 04.

### 7.3 Second overlap: 02 vs 03

Both build things. Distinguish by **audience of the artifact**:

- Built so a **person can judge the experience** (walkthrough, clickable scenario) → **02**
- Built so we can learn **what it costs to run** (latency, failure modes, data needs) → **03**

A prototype can serve both, but then it has two write-ups, and the 03 write-up must not
inherit 02's optimism.

### 7.4 Should a fifth track exist?

**No** — but there is one homeless activity: **research infrastructure** (instrumenting a
session, replaying it, annotating it). It fits none of the four cleanly and will be needed by
all of them.

**Recommendation: do not make it a track.** Make it a *shared capability* listed in each
cycle as an explicit cost. A "platform" track would grow its own goals and stop serving the
questions — which is precisely the failure this whole programme is trying to avoid.

### 7.5 Should any be merged?

**No.** Their outputs have different shapes (notes / scenarios + prototypes / experimental
implementations / verdicts), which is the practical test of a useful distinction.

### 7.6 The risk nobody wrote down

Four tracks assume four kinds of work — not four teams. With a small team (possibly one
person), "parallel tracks" easily becomes one person wearing four hats and finishing none.

**Mitigation (recommendation, not a decision):** every cycle names **one lead track**. The
others get the minimum needed to not block it. The lead track rotates across cycles, so the
programme still exercises all four over time.

---

## 8 · Per-track notes

Not four copies of the same workflow — only what is *specific* to each.

### Track 01 — Research & Investigation

- **Primary responsibility**: turn a vague concern into an RQ with competing explanations.
- **Methods**: literature reading (primary sources, cited properly) · analysis of existing
  systems, including our own · worked reasoning from first principles · analogy, clearly
  labelled as analogy.
- **Artifacts**: research notes · RQ definitions · hypotheses · comparison tables.
- **Inputs**: the question from the product side; open questions from the decision log.
- **Outputs**: RQs + hypotheses with kill conditions (to 02/03), and candidate explanations (to 04).
- **Failure mode**: producing frameworks faster than questions. If a note has more taxonomy
  than claims, it is 01 failing.

### Track 02 — Interaction Design

- **Primary responsibility**: make the *experience* of agent initiative concrete enough to
  disagree with.
- **Methods**: scenario writing · walkthroughs of one continuous session (not feature lists) ·
  experience prototyping · explicit comparison of interaction models · analysis of where the
  learner's control sits.
- **Artifacts**: scenarios · interaction models · design alternatives · rationale for what was
  rejected.
- **Inputs**: RQ from 01; feasibility boundaries from 03.
- **Outputs**: the *shape* to build (to 03); what "should happen" looks like (to 04, as the
  criterion for decision quality).
- **Failure mode**: designing decoration. A design that cannot fail a test is not a design.

### Track 03 — Technical Experimentation

- **Primary responsibility**: find out what it costs to know something, before we commit.
- **Methods**: time-boxed spikes · letter-vs-B mechanism prototypes · instrumenting one signal
  at a time · deliberate failure tests · ablation where a component can be removed.
- **Artifacts**: experimental implementations (throwaway by default) · feasibility reports ·
  cost notes (latency, data, tokens, maintenance).
- **Inputs**: the interaction shape from 02; the signal definition from 01.
- **Outputs**: what is buildable at what cost (to 02/04); **instrumentation** that makes a
  signal observable.
- **Failure mode**: the spike becomes the product. Mark throwaway code as throwaway, and say
  what would have to change for it to be kept.

### Track 04 — Evaluation & Validation

- **Primary responsibility**: reduce the number of surviving explanations.
- **Methods**: small-N comparative sessions · scenario-based evaluation · qualitative
  interaction analysis · ablation · pre-registered discriminator before running.
- **Artifacts**: protocols · run records · verdicts per hypothesis (supported / weakened /
  killed).
- **Inputs**: hypotheses from 01; options from 02; running code from 03.
- **Outputs**: verdicts (to the decision log); new questions (back to 01).
- **Failure mode**: measuring what is easy. If the instrument measures clicks because clicks
  are available, say so and label the result L3/L4 — never L5.

---

## 9 · Methods we deliberately do not adopt wholesale

- **Not** a full Design Science Research cycle as a project template — useful vocabulary, too
  heavy a ritual for a team this size.
- **Not** a numeric scoring rubric for "interaction quality". §5 of the brief is right: a
  made-up score is worse than a described observation.
- **Not** A/B testing as the default. With small N, the honest instrument is a described
  session plus a decision, not a significance claim.

Methods we do borrow by name: *Research through Design* (02) · *comparative prototyping* (03) ·
*ablation* (03/04) · *scenario-based evaluation* (02/04). These are named as approaches; no
claim is made here about specific published results.
