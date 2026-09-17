# Vision Retrospective

> Turn hollow visions into executable paths — backward, not forward.

## What it is

Vision-Driven Development moves *forward*: the AI receives a vague vision, fills the gap between it and code with plausible content, and produces output that looks complete and is hollow. Vision Retrospective moves *backward*: it treats the vision as a **claim to be verified**, anchors every claim to observable evidence, then decomposes only the anchored claims into a verifiable implementation path.

The method's signature move is a **deterministic hollowness scorer** (pure Python standard library, 0–100). It runs in Phase 0 to gate a hollow input (≥60 → intent excavation before any plan) and re-runs in Phase 4 to prove the plan is solid (≤35). The input→output score delta is objective evidence the vision stopped being hollow.

## When to run

- The user shares a goal that is abstract, adjective-heavy, or missing metrics, actors, actions, or success criteria ("a beautiful, seamless app that helps people").
- The user asks to critique or refine a vision into executable steps.
- The user is dissatisfied with vague AI output and wants a scientific, verifiable path instead.
- Also triggers on "vision retrospective" / "愿景回溯" and requests to make a vision concrete.

## The protocol

Five phases, run in order:

- **Phase 0 — Intake & Hollow-Scan.** Capture the vision verbatim; run the scorer. Gate: hollow input (≥60) → Phase 1 before any plan. Never jump from a hollow input to a roadmap — that is the VDD trap.
- **Phase 1 — Intent Excavation.** Replace assumptions with grounded intent. 5 Whys, a Root Outcome statement, constraint surfacing, inversion. Ask few, targeted multiple-choice questions — never many open "tell me more" questions.
- **Phase 2 — Claim Decomposition & Verification Anchoring.** Split the vision into discrete claims; give each a Verification Anchor ("what observable evidence would prove this true?"). A claim with no anchor is not a requirement — send it back to Phase 1.
- **Phase 3 — Backward Path Synthesis.** For each anchor, ask what must exist for its evidence to be producible. Decompose Epic → Feature → Task → Atomic Step. Build a vertical MVP slice first (one end-to-end verifiable path), then broaden by value/risk order — not by layer.
- **Phase 4 — Anti-Hollow Verification.** Re-run the scorer; a healthy plan scores ≤35. Audit every Atomic Step has a Done-Definition. Emit the report and the score delta.

## Why it's different

| | Vision-Driven Development | Vision Retrospective |
|---|---|---|
| Direction | Forward (assume → build) | Backward (claim → verify → build) |
| Gap-filling | Model improvises plausibly | Evidence anchors force specificity |
| Success check | Subjective ("looks good") | Measurable (re-run hollowness score) |
| Typical result | Pretty but hollow | Executable and verifiable |

## The score is the proof

A healthy run shows a **falling hollowness score**. From the worked example:

> **Input (Hollow, 54):** "I want to build a beautiful, seamless, intuitive app that helps people be more productive."
> **Output (Solid, 18):** a claim→anchor table (freelance writers; publish 2× more drafts/week; admin time <15%) and a vertical MVP slice (write → autosave → publish to one platform). Delta **54 → 18**, reported.

## Files

- `SKILL.md` — the VR Loop protocol entry point.
- `scripts/hollowness_scorer.py` — deterministic 0–100 detector (`--text`, `--file`, stdin; `--json`; `--fail-above N` for CI gates).
- `references/methodology.md` — full method, techniques, anti-patterns, worked example.
- `references/foundations.md` — citation map proving each move is academically grounded (Backward Design, IEEE 830, GQM, BDD, means-ends, WBS) plus honest limitations of the heuristic score.
- `references/templates.md` — artifact shapes (Hollowness Report, Claim → Anchor table, Implementation Path, final report).
- `assets/vision_retrospective_report.md` — fill-in-the-blanks report scaffold.

## License

CC0 1.0 (repository). This skill keeps its MIT license © CeaserZhao. Part of **Fundemetal**.
