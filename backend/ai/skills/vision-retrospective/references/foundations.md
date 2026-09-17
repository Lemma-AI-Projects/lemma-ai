# Theoretical Foundations (学术方法论支撑)

This skill is a **practical synthesis**. Its individual moves are each grounded
in established methodology; the "VR Loop" framing and the hollowness score are
the author's synthesis and a *heuristic index*, not a single published
instrument. This file exists so the "scientific" claim is substantiated rather
than asserted.

## Technique → Theory mapping

| VR Loop move | Established foundation | Key source |
|---|---|---|
| Phase 0 hollowness scan; flag vague adjectives | Automated requirements-quality / vagueness detection | Femmer et al., RE 2017 (NLP-pattern requirement quality); IEEE Std 830-1998 quality attributes |
| "Verifiable / unambiguous" as the core quality bar | A requirement shall be verifiable & unambiguous | IEEE Std 830-1998 (Recommended Practice for SRS) |
| Every claim needs a measurable proxy | Goal-Question-Metric (GQM) | Basili & Weiss, 1984 |
| Phase 2 verification anchors | Design by Contract (pre/post conditions); Specification by Example / ATDD | Meyer, 1986; Adzic, 2011; North, 2003 (BDD) |
| Phase 1 root-out intent (5 Whys) | Root-cause analysis / lean | Ohno, Toyota Production System |
| Phase 1 inversion ("what would make this fail?") | Pre-mortem | Klein, *Harvard Business Review*, 2007 |
| Phase 2 SMART on every claim | SMART objectives | Doran, *Management Review*, 1981 |
| Phase 3 trace anchor → what must exist | Means-ends analysis / goal-driven planning | Newell & Simon, 1972 |
| Phase 3 hierarchy Epic → Task → Step | Work Breakdown Structure (WBS) | PMI PMBOK |
| Phase 3 vertical MVP slice first | Tracer bullet / vertical slice; MVP | Hunt & Thomas, *The Pragmatic Programmer*; Ries, 2011 |

## The deepest anchors

**Backward Design (Wiggins & McTighe, 1998).** The single strongest academic
parent. *Understanding by Design* argues: start from the *desired result* and its
*evidence of understanding*, then design activities backward. Vision Retrospective
does the same with a vision — anchor the evidence that proves a claim, then
synthesize the path that produces that evidence. The skill is, in effect,
"UbD for AI-generated specs."

**Verifiability as a requirement quality (IEEE Std 830-1998).** IEEE 830 lists
*verifiable* and *unambiguous* among the required qualities of a good SRS. Vague
adjectives ("beautiful", "intuitive", "流畅") are the canonical violators. The
scorer's "missing verifiability dimensions" is a direct operationalization of
IEEE 830's verifiability criterion.

**Goal-Question-Metric (Basili & Weiss, 1984).** "You cannot control what you
cannot measure." Every claim → a metric that proves it. This is exactly GQM's
goal → question → metric chain, applied at the sentence level.

**Means-ends analysis (Newell & Simon, 1972).** Phase 3's backward trace
("what must exist for this evidence to be producible?") is classic goal-driven
problem solving.

**Emerging LLM-grounding literature (2023–2025).** The "hollow output" problem
the skill attacks — fluent, plausible, but ungrounded and unverifiable text — is
exactly the failure mode studied under LLM hallucination, calibration, and
verifiability. The skill's "verify, don't assume" stance aligns with the broader
shift toward evaluated / verifiable generation. (This is a *motivation*, not a
settled theory.)

## Honest limitations

- **The hollowness score is a heuristic index**, not a validated measurement
  instrument. Weights (`hollow_terms*10 + missing_dims*12`) are tunable and were
  chosen for sensible behavior, not derived from a psychometric study.
- **The "forward causality" claim** ("VDD fails because it moves forward") is a
  conceptual argument supported by backward-design and grounding literature, not
  a controlled empirical study of AI workflows.
- **The 4 missing-dimension tuple** (metric / beneficiary / action / success) is
  the author's operationalization of IEEE-830 verifiability + GQM + BDD; other
  taxonomies exist.

## How to harden it (optional)

- Externalize the scoring weights into `scripts/config.json` so they can be
  tuned or validated against a labelled requirements dataset.
- Swap the built-in vague-term list for a peer-reviewed vagueness lexicon (e.g.
  Femmer et al.'s requirement-smell patterns) and cite it.
- Add a small evaluation: score a corpus of known-good vs known-hollow specs and
  report the scorer's precision / recall.
