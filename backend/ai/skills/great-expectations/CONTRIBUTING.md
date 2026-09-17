# Contributing to Great Expectations

Thank you for helping make this skill sharper. Great Expectations is a
disruptive **and** complete planning engine — contributions that accidentally
turn it back into a polite, average planner will be rejected. Read this first.

## 1. Philosophy you must align with

- **Anti-consensus + completeness are both non-negotiable.** A plan that is
  radical but leaky is a fantasy; one that is complete but average is noise.
- **Completeness serves disruption**, not the other way around. Never water a
  disruptive path back into a safe path to satisfy a completeness check.
- **Evidence over assertion.** Changes to the prompt should be backed by a
  real run (an example in `docs/examples/` or your own).

## 2. How to change the skill prompt

1. Fork and branch (`feat/...` or `fix/...`).
2. Edit `SKILL.md`.
3. **Run at least one back-test** with your changed prompt against an existing
   `docs/examples/*.md` case (or a new one). Capture before/after.
4. In your PR, paste the before/after output and the delta in the acceptance
   metrics (disruption rate, completeness pass rate, falsifiable count).
5. Open a PR against `main` using the template.

## 3. Adding / updating examples

- Place under `docs/examples/`, named `topic.md` (kebab-case).
- Must include the **standard three-field input** (Goal / Biggest consensus /
  Scarcest resource) and the **eight output sections** from `SKILL.md`.
- Keep it honest — these are demonstration runs, not fictional marketing.
- Update `docs/demo.html`'s sample-run section if you want it featured.

## 4. Style red lines for `SKILL.md` (do not relax)

- Frontmatter (`name`, `description`, `color`, `author`) must stay valid YAML.
- The **banned vocabulary** list may be extended, never shrunk.
- The **eight-section output format** is mandatory; do not merge or drop sections.
- The **quantitative acceptance targets** (disruption ≥50%, completeness >80%,
  falsifiable ≥3, PESTEL zero gaps) may only be raised, never lowered.
- Step **3.5 Completeness Mapping** with its four penetration tests is the core
  gate — never removable.

## 5. Site (`docs/`)

- Swiss / International Typographic style: black/white, single accent
  (`#E30613` <5%), 12-column grid, 8px baseline. No gradients, glass, or large
  radii.
- Positive/Negative theme must both remain WCAG AA (contrast ≥ 4.5:1).
- Zero external runtime requests. Self-host or system fonts only.

## 6. Definition of Done

A contribution is mergeable when:

- [ ] `SKILL.md` still passes every style red line above
- [ ] At least one example run shows no regression in the metrics
- [ ] Site (if touched) builds and CI is green
- [ ] PR description includes the metric delta

Questions? Open an issue with the `question` label.
