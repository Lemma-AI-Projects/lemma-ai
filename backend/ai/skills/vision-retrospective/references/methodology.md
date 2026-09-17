# Vision Retrospective Methodology (愿景回溯)

This document is the full reference for the **VR Loop** used by the
`vision-retrospective` skill. SKILL.md is the short operational version; this
file explains *why* each step exists and *how* to do it well. Read it before
you improvise on the workflow.

---

## 1. The core thesis

**Vision-Driven Development (VDD) fails because it moves forward.**

In VDD the AI writes a vision, then implements it. The gap between the vague
vision and the code is filled by the model with *plausible-sounding but
ungrounded content*. The result looks complete and is hollow: pretty sentences,
no verifiable path, no way to tell success from failure.

**Vision Retrospective (愿景回溯) moves backward.**

It treats the vision not as a *spec to execute* but as a *claim to verify*.
Every value statement is traced back to its **evidence anchor** — the
observable, reproducible proof that the claim is real. Only once a claim is
anchored does it get decomposed into an actionable path.

> Forward = assume, then build (hollow).
> Backward = verify the claim, then build the smallest thing that proves it.

---

## 2. The VR Loop (five phases)

```
Phase 0  Intake & Hollow-Scan      ── measure hollowness (script)
   │
Phase 1  Intent Excavation         ── replace assumptions with grounded intent
   │
Phase 2  Claim Decomposition        ── split into claims + verification anchors
          & Verification Anchoring
   │
Phase 3  Backward Path Synthesis   ── trace anchors → epics → tasks → steps
   │
Phase 4  Anti-Hollow Verification  ── re-measure, prove the plan is solid
```

A good run shows a falling hollowness score:
**input score (high) → output score (low).** Always report that delta.

---

## 3. Phase 0 — Intake & Hollow-Scan

**Goal:** quantify how hollow the incoming vision is, without "improving" it.

Steps:
1. Capture the raw vision **verbatim**. Do not rewrite or polish it yet —
   polishing early reintroduces hollowness.
2. Run the deterministic scorer:
   ```bash
   python scripts/hollowness_scorer.py --text "<vision>"
   ```
   It returns a score (0–100) and labels: Solid / Specific / Vague / Hollow /
   Fully Hollow, plus the vague terms and missing verifiability dimensions.
3. Produce a **Hollowness Report** (see `references/templates.md`).

**Gate rule:** if the score is **Hollow or Fully Hollow (≥ 60)**, you MUST
complete Phase 1 before producing any plan. Never jump from a hollow input to a
roadmap — that is exactly the VDD trap.

---

## 4. Phase 1 — Intent Excavation (回溯意图)

**Goal:** convert assumptions into grounded intent. Output a refined, grounded
vision statement plus an explicit list of resolved vs. still-open assumptions.

Techniques (pick by context, do not use all blindly):

- **5 Whys** — repeatedly ask "why does this matter?" to reach the root outcome.
  Stop when the answer is an observable user capability, not another adjective.
- **Root Outcome statement** — force this shape:
  > "When [this] succeeds, **[actor]** will be able to **[observable
  > capability]** without **[current pain]**."
  If you cannot fill all three brackets, the vision is still hollow.
- **Constraint surfacing** — budget, deadline, tech stack, audience, compliance,
  things that must not break. Constraints turn "someday" into "by when / with what".
- **Inversion / negative framing** — "What would make this a failure?" then design
  to avoid those failure modes. Cheap way to surface hidden requirements.
- **Stakeholder mapping** — who benefits, who pays, who can block.

**Questioning discipline (critical):**
- Do **not** ask 20 open "tell me more" questions. It wastes turns and still
  leaves holes.
- Derive questions from the scorer's `missing_dimensions` and `retrospect_prompts`.
- Prefer **targeted, multiple-choice** questions (AskUserQuestion) — e.g.
  "Which metric proves success: (a) time saved, (b) error rate, (c) revenue?"
- Resolve the *highest-leverage* ambiguities first (the ones that change the
  whole shape of the path).

---

## 5. Phase 2 — Claim Decomposition & Verification Anchoring (拆解 + 锚定)

**Goal:** turn the grounded vision into claims, each with a verification anchor.

Steps:
1. Split the vision into discrete **claims** — one per capability / value
   proposition. A claim is a single testable sentence.
2. For every claim, define a **Verification Anchor**:
   > "What observable, reproducible evidence would prove this claim is true?"
   It must be measurable — a number, a test, a demonstration.
3. Translate every residual hollow adjective into a measurable proxy using the
   scorer's `proxy` suggestions.
   - "intuitive" → "new user completes core task in ≤3 steps at ≥90% success
     in a 5-person test"
   - "fast" → "p95 latency < 200ms under 1k concurrent users"
4. Apply **SMART** to each claim. **Time-bound is mandatory** for anything that
   will be built (a date or a relative deadline).
5. Emit a **Claim → Anchor table** (template in `references/templates.md`).

If a claim cannot be anchored, it is not a requirement yet — send it back to
Phase 1.

---

## 6. Phase 3 — Backward Path Synthesis (回溯路径)

**Goal:** derive an ordered, independently verifiable implementation path.

Steps:
1. For each verification anchor, ask: *"What must exist (features, data, infra,
   people) for this evidence to be producible?"* This is the backward trace.
2. Decompose into a **4-level hierarchy**:
   - **Epic** — a theme that delivers one or more anchors.
   - **Feature** — a shippable capability.
   - **Task** — a unit of work, ideally ≤ a day or two.
   - **Atomic Step** — the smallest unit with a single, testable acceptance
     criterion. "Done when X is verifiably true."
3. Every node carries: **acceptance criteria** (testable), **dependencies**,
   estimated **effort** (S/M/L), and **risk**.
4. **Sequence the path:**
   - Build a **vertical MVP slice** first — one end-to-end path touching every
     layer, independently verifiable. It proves the riskiest assumption early
     and gives a working skeleton.
   - Then broaden by **value/risk ordering** (highest risk or highest value
     next), not by layer.

---

## 7. Phase 4 — Anti-Hollow Verification (反空洞校验)

**Goal:** prove the produced plan is itself solid, not hollow.

Steps:
1. Re-run the scorer on the final report / plan:
   ```bash
   python scripts/hollowness_scorer.py --text "<the plan text>"
   ```
   A healthy plan scores **Solid or Specific (≤ 35)**.
2. Audit every Atomic Step for a **Done-Definition** (testable). No step may
   contain a hollow adjective without its proxy.
3. Confirm the path is **independently verifiable end-to-end** (you could hand
   it to another agent and they could execute + verify it).
4. Emit the final **Vision Retrospective Report** (combine all phase artifacts
   + open risks). Use `assets/vision_retrospective_report.md` as the scaffold.

Report the **score delta** (input → output) prominently. That delta *is* the
proof the method worked.

---

## 8. Anti-patterns (what NOT to do)

- ❌ "Polish" a hollow vision into prettier hollow words.
- ❌ Generate a plan before resolving intent (the VDD trap).
- ❌ Ask many open questions; ask few, targeted, multiple-choice ones.
- ❌ Accept "it should be user-friendly" as a requirement. Anchor it.
- ❌ Build by layer (DB → API → UI) before a vertical slice exists.
- ❌ Ship a roadmap with steps that have no Done-Definition.

---

## 9. Worked example

**Input (Hollow, score 54):**
> "I want to build a beautiful, seamless, intuitive app that helps people be
> more productive."

**Phase 0:** scorer flags `beautiful`, `seamless`, `intuitive`; missing
`measurable_metric` and `success_language`.

**Phase 1 (targeted questions):** who is "people"? what is "productive"?
Resolved to: *freelance writers*; productivity = *publish 2× more drafts per
week with less admin time*.

**Phase 2 (claims + anchors):**
| Claim | Verification Anchor |
|-------|--------------------|
| Writers draft faster | ≥80% of test writers publish ≥2 drafts/week vs. 1 before |
| Low admin overhead | Time spent on non-writing tasks drops from 40% to <15% |

**Phase 3 (path):** vertical slice = "write → autosave → publish to one
platform" with a measurable timer; then broaden to multi-platform, analytics.

**Phase 4:** re-score the plan → 18 (Solid). Delta 54 → 18 reported.

See `references/templates.md` for the exact artifact shapes.
