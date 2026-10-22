# Research Cycle 01 — Proposal (not started)

> The first cycle has one job beyond its own question: **prove the four tracks can actually
> work together** without turning into four documents that never meet.
> Deliberately cheap: no new product surface, no new signal, no runtime.

---

## RQ-01

> **At the end of a learning turn, does an agent that proposes one concrete next step get the
> learner into the next learning action faster than an agent that asks what to do next —
> and does it know when to stop?**

Why this one first:

- It is the *narrowest* question that still tests D2 (initiative) and D4 (initiative ≠
  interruption) **together**. Testing them separately would let us "win" on one and never
  notice we broke the other.
- It needs **no new instrumentation**: everything happens in text, and turns are already
  persisted (`ai_conversations`).
- It is falsifiable within a handful of sessions.

⚠️ **What it deliberately does not measure**: whether the learner learned more. One turn
cannot show that, and pretending otherwise is the L1→L5 substitution the methodology forbids.

---

## Competing options

| | Option | Description |
|---|---|---|
| **A** | Agent proposes | one concrete next step, chosen from Goal + known state + material, and starts it |
| **B** | Agent asks | "下一步你想做什么？" — the pre-2026-10-20 behaviour |
| **C** | Agent stops | says what happened, and nothing else |

C is not a control to be skipped. Under D4 it may be the right answer in two of the three
scenarios below, and if C wins overall that is a **finding about D2**, not a failed experiment.

---

## Learning scenarios (3)

Written as sessions, not features.

### S1 · Has a goal, has material, has state

Learner has a goal ("两周内把特征值这一章过一遍"), one material open, and state says
"特征值: 正在形成". He writes: *"看完了，感觉还行。"*

- **Expected under A**: names one specific thing to do next (a question, a concrete example,
  or a short attempt) and starts it — not a menu.
- **Expected under B**: asks what he wants to do.
- **The discriminator**: does his next message contain a **learning act** (an attempt, a
  question about content, a request for an example) or only a meta-decision ("嗯…做题吧")?

### S2 · Tired, explicitly not ready  ← **must be no-action**

Same space, late, he writes: *"今天有点累，先看看。"*

- **Correct**: support the reading, do not insert a next step, do not offer a plan.
- **Incorrect**: any of "要不要先做一道？" / "建议你今天至少过一遍…" / a numbered plan.
- **Why this scenario matters most**: it is the one a helpful-sounding model fails.

### S3 · He takes the wheel  ← **must be no-action**

He writes: *"我自己先翻翻这章，有问题再问你。"*

- **Correct**: acknowledge in one line, stay out of the way.
- **Incorrect**: adding a suggestion, a check-in schedule, or a follow-up question.

---

## Observable evidence

| Layer | What we record | How |
|---|---|---|
| **L1 Feasibility** | the three scenarios can be run against the real agent | manual session, existing chat |
| **L2 Decision quality** | for each scenario: did the reply fall in the "correct"/"incorrect" set above | two independent reads of the transcript |
| **L3 Usability** | does the learner's next message contain a learning act; does he leave | transcript only |
| **L4/L5** | **not attempted** | — |

⚠️ No rubric score. For each scenario the verdict is one of three words: **as expected** /
**over-stepped** / **under-stepped**, plus one sentence of what was seen. Scores invented at
this stage would hide exactly the disagreement we need to see.

---

## How to interpret the result

| Outcome | Reading |
|---|---|
| S1 as expected, S2/S3 as expected | D2 + D4 both hold at prompt level. Move on to a harder signal (Q1). |
| S1 as expected, **S2 or S3 over-stepped** | ⭐ the most likely result: the model reads "be proactive" as "always push". Finding: **initiative and restraint need separate instructions**, and prompt alone may not separate them. This is the most valuable possible outcome of the cycle. |
| S1 under-stepped | The prompt is too weak, or the space context is not reaching the model. Check `$space_context` rendering before changing the prompt again. |
| All three under-stepped | The model ignores the prompt entirely. Before concluding anything, verify the prompt is actually in the request (L1), then re-run. |

**Negative results are kept.** If S2/S3 fail, the cycle file keeps the transcripts and the
verdict; the decision log gets a note against D4, not a rewritten "learned a lot".

---

## What each track does in this cycle

| Track | Contribution | Time-box |
|---|---|---|
| **01** | Sharpen the "learning act" definition used as the L3 discriminator; check whether "asking a meta question" vs "acting" is a distinction we can actually read from text | ½ day |
| **02** | Write S1–S3 as full sessions (exact wording, what is on screen), including where the learner's exit is | ½ day |
| **03** | **Lead track.** Verify the prompt is actually in the request (`tests/ai/test_prompts.py` exists for the text; confirm it reaches the model); build the smallest thing that lets us replay a transcript against the three scenarios | 1 day |
| **04** | Pre-register the verdict table above **before** running; do the two independent reads; write the five-field record (§5 of the methodology) | ½ day |

**Lead track: 03.** Nothing else can start until we can see what the model actually receives.

---

## Known uncertainties before we start

1. **Sample size.** Three scenarios × a few runs is not a population. The result is a
   **direction**, and must be written as one.
2. **Model variance.** The same prompt can over-step in one run and stay quiet in the next.
   If the three scenarios disagree with themselves across runs, that is itself the finding
   (the behaviour is not prompt-controlled).
3. **Scenario wording leaks the answer.** "今天有点累" is a strong hint. A model that passes
   S2 may still fail a subtler version. Note this as a limitation rather than adding scenarios
   until it passes.
4. **The discriminator depends on our reading.** Two readers can disagree about whether
   "嗯…做题吧" is a learning act. Disagreement is recorded, not averaged.

---

## Explicitly out of scope for this cycle

- Any new UI surface
- Any instrumentation of reading position (Q1's prerequisite — a later cycle, see
  `decisions/rnd-real-time-interaction.md` §4)
- Any change to Learner State, Evidence, Coordinator or Method
- Any scoring, ranking, or "interaction quality index"
