# Decomposer Protocol: Empirical Validation Roadmap

> This document is a research plan, not a product commitment. It defines how the protocol's claims can be tested and, if validated, graduated from "heuristic" to "empirically supported method."

---

## 1. Epistemic Status (Repeated from MANIFEST.md)

The protocol is currently a heuristic method. It makes claims about its own effectiveness that have not been empirically validated. This document is the plan to change that.

---

## 2. Testable Hypotheses

The protocol makes the following claims, each of which can be formulated as a testable hypothesis:

| # | Claim | Null Hypothesis (H0) | Alternative Hypothesis (H1) |
|---|-------|----------------------|---------------------------|
| 1 | The protocol reduces "surprise rate" — the frequency of encountering unforeseen blockers during execution | Teams using the protocol have the same surprise rate as teams using standard AI planning | Teams using the protocol have a lower surprise rate |
| 2 | The protocol's Anti-Shell Self-Check (Step 5) catches plan weaknesses that standard peer review misses | Step 5 detects the same proportion of plan weaknesses as standard peer review | Step 5 detects a higher proportion of plan weaknesses |
| 3 | The protocol's uncertainty mapping (Step 2) produces more accurate risk identification than unstructured brainstorming | The zones assigned by the protocol are no more predictive of actual failures than unstructured risk lists | The protocol's zones are more predictive of actual failures |
| 4 | The protocol's survival conditions improve decision quality by forcing falsifiability | Plans with survival conditions produce the same outcomes as plans without them | Plans with survival conditions produce measurably better outcomes |

---

## 3. Experiment Protocols

### Experiment 1: Retrospective Stress Test

**Duration**: 2 hours per project.

**Participants**: 1 person (the executor) + 1-2 domain experts (informants).

**Procedure**:
1. Select a project from the past 6 months that had significant unexpected blockers.
2. Extract the original plan (AI-generated or human-written) that was used at the start.
3. Run the Decomposer protocol on the same project brief as if it were a new project.
4. Record all Red (Unknown-Unknown) nodes produced by the protocol.
5. Compare the Red nodes against the actual blockers encountered during execution.

**Data collection template**:

```
Project: [name]
Original plan type: [AI-generated / human-written]
Primary blocker encountered: [description]
Protocol Red nodes predicted:
  - Node 1: [description] → [hit / miss / partial]
  - Node 2: [description] → [hit / miss / partial]
Red node hit rate: [X%]
```

**Interpretation**:
- >= 70% hit rate: Strong evidence that the protocol surfaces real blind spots.
- 30-70% hit rate: Moderate evidence; protocol helps but misses some categories.
- < 30% hit rate: Weak evidence; protocol is not useful for this context.

### Experiment 2: Parallel Controlled Experiment

**Duration**: 1 week per pair of tasks.

**Participants**: 2+ teams or individuals with comparable skill levels.

**Procedure**:
1. Select two tasks of comparable difficulty and scope (A and B).
2. Assign each to a separate group or individual.
3. Group A uses a standard AI prompt to produce a plan. Group B uses the full Decomposer protocol.
4. Both groups execute their tasks.
5. Track:

**Metric 1 — Plan Change Rate**: Count the number of times the core architecture, approach, or major milestone is modified during execution due to newly discovered constraints.

**Metric 2 — Hallucination Detection Rate**: After execution, have a third party review both plans and mark every module that "seemed feasible but was not." Compare the proportion of hallucinated modules in each plan.

**Data collection template**:

```
Task A (standard): Plan change count: [N], Hallucinated modules: [N]/[Total]
Task B (Decomposer): Plan change count: [N], Hallucinated modules: [N]/[Total]
```

**Interpretation**:
- If the Decomposer group has a statistically significant lower plan change rate and hallucination detection rate, the protocol is producing more robust plans.
- If the difference is small or negative, the protocol's overhead is not justified by its output quality.

### Experiment 3: Blind Spot Hunting

**Duration**: 30 minutes per plan.

**Participants**: 1 person (the executor).

**Procedure**:
1. Take any existing plan (yours, your team's, or an AI-generated one).
2. Run only Step 5 (the Anti-Shell Self-Check) on the plan.
3. Count how many of the five checks fail.
4. For each failure, record whether the issue would have been caught by a standard peer review or code review.

**Data collection template**:

```
Plan: [name]
Check 1 (Survival Condition): [pass / fail] → Would peer review catch this? [yes / no]
Check 2 (Jargon): [pass / fail] → Would peer review catch this? [yes / no]
Check 3 (Uncertainty Ratio): [pass / fail] → Would peer review catch this? [yes / no]
Check 4 (Honesty): [pass / fail] → Would peer review catch this? [yes / no]
Check 5 (Actionability): [pass / fail] → Would peer review catch this? [yes / no]
Issues caught by Step 5 but missed by peer review: [N]
```

**Interpretation**:
- If Step 5 catches any issues that peer review missed, the protocol provides value as a red-teaming tool.
- The more issues caught by Step 5 that peer review missed, the stronger the evidence that the protocol fills a gap in existing review processes.

---

## 4. Qualitative Data Collection

In addition to quantitative metrics, the following qualitative observations should be recorded for every experiment:

1. **Time cost**: How long did the protocol take to execute? Was the time investment justified by the output quality?
2. **Emotional response**: Did the protocol cause discomfort, anxiety, or resistance? Did it produce clarity, confidence, or confusion?
3. **Domain dependence**: Did the protocol work better for certain domains (e.g., software, research, business) than others?
4. **Experience dependence**: Did the protocol work better for domain experts than for novices? (This is a critical test of the "filling the form is a black box" critique.)

---

## 5. Known Limitations

1. **Small sample sizes**: Individual experiments cannot prove causality. They can only provide evidence of an effect. Accumulation of evidence across multiple experiments is required.
2. **Confounding variables**: The quality of the output depends on the executor's domain knowledge, not just the protocol. Controlled experiments must control for this.
3. **Self-selection bias**: People who choose to test the protocol may be predisposed to find it useful. Third-party or blind evaluations are preferred.
4. **Publication bias**: Negative results (protocol does not work) are as valuable as positive results. Both should be recorded and shared.

---

## 6. Next Steps

1. **Phase 1**: Run Experiment 3 (Blind Spot Hunting) on 3-5 existing plans. This is the lowest-cost way to generate initial evidence.
2. **Phase 2**: Run Experiment 1 (Retrospective Stress Test) on 2-3 past projects. This provides context-specific evidence.
3. **Phase 3**: If Phase 1 and 2 yield positive results, plan a Phase 2 Parallel Controlled Experiment with a larger sample.
4. **Phase 4**: Publish results (positive or negative) to the repository. Update the protocol's Epistemic Status section accordingly.

---

## 7. Data Sharing

All experiment data (anonymized if necessary) should be shared via GitHub Issues or a dedicated discussion thread. This allows the community to:

- Reproduce results
- Identify patterns across experiments
- Suggest improvements to the protocol based on evidence
- Accumulate the sample size needed for statistical significance