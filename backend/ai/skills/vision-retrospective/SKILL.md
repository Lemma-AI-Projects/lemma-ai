---
name: vision-retrospective
description: This skill should be used when a user provides a vague, abstract, or "hollow" vision, goal, or idea and wants it turned into a concrete, actionable implementation path with verifiable acceptance criteria. It also triggers on mentions of "愿景回溯" (the Chinese term for vision retrospective), "vision retrospective", or requests to critique/refine a vision into executable steps. It contrasts with vision-driven development by tracing claims backward to evidence anchors rather than forwarding from assumptions.
agent_created: true
---

# Vision Retrospective

## Overview

Transform hollow visions into executable paths. Vision-Driven Development fails
because it moves *forward* — the AI fills the gap between a vague vision and the
code with plausible but ungrounded content, producing output that looks complete
and is hollow. This skill moves *backward*: it treats the vision as a claim to be
verified, anchors every claim to observable evidence, then decomposes only the
anchored claims into an actionable path.

## When to use

- The user shares a goal/idea that is abstract, adjective-heavy, or missing
  metrics, actors, actions, or success criteria (e.g. "a beautiful, seamless app
  that helps people").
- The user mentions "愿景回溯", "vision retrospective", or asks to refine/critique
  a vision into steps.
- The user is dissatisfied with vague AI output and wants a scientific, verifiable
  path instead.

## The VR Loop (5 phases)

Run the phases in order. A healthy run shows a falling hollowness score
(input → output); always report that delta.

### Phase 0 — Intake & Hollow-Scan
Capture the raw vision **verbatim** (do not polish it yet). Run the deterministic
scorer and produce a Hollowness Report:
```bash
python scripts/hollowness_scorer.py --text "<vision>"
```
**Gate:** if the score is Hollow or Fully Hollow (≥ 60), complete Phase 1 before
any plan. Never jump from a hollow input to a roadmap — that is the VDD trap.

### Phase 1 — Intent Excavation
Replace assumptions with grounded intent. Use 5 Whys, a Root Outcome statement
("When [this] succeeds, [actor] will be able to [observable capability] without
[current pain]"), constraint surfacing, and inversion. Ask **few, targeted,
multiple-choice** questions derived from the scorer's `missing_dimensions` and
`retrospect_prompts` — never many open "tell me more" questions.

### Phase 2 — Claim Decomposition & Verification Anchoring
Split the grounded vision into discrete **claims** (one testable sentence each).
For every claim define a **Verification Anchor**: "What observable, reproducible
evidence would prove this claim is true?" Translate residual hollow adjectives
into measurable proxies using the scorer's suggestions. Apply SMART; time-bound is
mandatory for anything to be built. Emit a Claim → Anchor table. A claim with no
anchor is not a requirement yet — send it back to Phase 1.

### Phase 3 — Backward Path Synthesis
For each anchor, ask what must exist for its evidence to be producible (the
backward trace). Decompose into Epic → Feature → Task → Atomic Step. Every node
carries acceptance criteria, dependencies, effort (S/M/L), and risk. Build a
**vertical MVP slice first** (one end-to-end path, independently verifiable), then
broaden by value/risk order — not by layer.

### Phase 4 — Anti-Hollow Verification
Re-run the scorer on the final plan; a healthy plan scores Solid/Specific (≤ 35).
Audit that every Atomic Step has a Done-Definition and no step contains an
un-anchored hollow adjective. Emit the final Vision Retrospective Report and
report the score delta.

## Resources

### scripts/hollowness_scorer.py
Deterministic (pure-stdlib) detector. Inputs: `--text`, `--file`, or stdin;
flags `--json` and `--fail-above N` (exit non-zero if score > N, for CI gates).
Returns a score (0–100), label, flagged vague terms with proxy suggestions, and
missing verifiability dimensions. Use it in Phase 0 and Phase 4.

### references/methodology.md
Full explanation of the VR Loop: the forward-vs-backward thesis, each phase's
techniques, questioning discipline, anti-patterns, and a worked example.

### references/foundations.md
Citation map proving each technique is academically grounded (Backward Design,
IEEE 830 verifiability, GQM, BDD/Specification by Example, means-ends analysis,
WBS) plus honest limitations of the heuristic score. Consult when the user asks
whether the method is scientifically backed.

### trae/ (cross-tool adapters)
Trae-native versions of the method so it can be invoked in any Trae conversation:
- `trae/rules/vision-retrospective.mdc` — Trae rule (Agent-Requested).
- `trae/commands/vision-retrospective.md` — `/vision-retrospective` slash command.
Copy these into your Trae project's `.trae/` or into Trae Global Rules to use the
method outside WorkBuddy.

### references/templates.md
Shapes for every artifact: Hollowness Report, Grounded Vision, Claim → Anchor
table, Implementation Path, and the final Vision Retrospective Report.

### assets/vision_retrospective_report.md
Fill-in-the-blanks scaffold for the final report; copy it into the user's
workspace as the deliverable.

## Anti-patterns
- Do not polish a hollow vision into prettier hollow words.
- Do not generate a plan before resolving intent.
- Do not accept "user-friendly" as a requirement — anchor it.
- Do not build by layer before a vertical MVP slice exists.
