# Vision Retrospective — Output Templates

Use these shapes for every artifact the VR Loop produces. A copy of the final
report scaffold also lives in `assets/vision_retrospective_report.md` for direct
use as an output file.

---

## A. Hollowness Report (Phase 0 & Phase 4)

```markdown
# Hollowness Report — score **<N>/100** (<Label>)

- Words analyzed: <n>
- Hollow terms found: <n>
- Missing verifiability dimensions: <n>

## Vague terms to anchor
- **<term>** → <proxy suggestion>

## Missing dimensions
- *<dimension>*: <prompt>

## Retrospect prompts (feed Phase 1)
1. <prompt>
```

---

## B. Grounded Vision (Phase 1 output)

```markdown
# Grounded Vision

**Root Outcome:** When <this> succeeds, <actor> will be able to
<observable capability> without <current pain>.

## Resolved assumptions
- <assumption> → <decision> (source: <user / inferred>)

## Still-open assumptions
- <assumption> (blocks: <what>)

## Constraints
- Deadline: <when>
- Budget / stack / audience / compliance: <...>
```

---

## C. Claim → Anchor Table (Phase 2 output)

```markdown
# Claims & Verification Anchors

| # | Claim (testable sentence) | Verification Anchor (observable proof) | SMART? | Time-bound |
|---|---------------------------|----------------------------------------|--------|------------|
| 1 | <claim>                   | <what proves it true>                  | Y/N    | <date>     |
| 2 | <claim>                   | <what proves it true>                  | Y/N    | <date>     |
```

Rule: a claim with no anchor is not a requirement yet — send it back to Phase 1.

---

## D. Implementation Path (Phase 3 output)

```markdown
# Implementation Path

## MVP slice (vertical, verifiable first)
- Epic: <name>  → delivers anchor(s): <#>
  - Feature: <name>
    - Task: <name>  (effort: S/M/L, risk: low/med/high)
      - Atomic Step: <action>
        - Done when: <single testable criterion>
        - Depends on: <...>

## Iteration 2+ (by value/risk order)
- ...
```

Each Atomic Step MUST have a Done-Definition. No hollow adjectives without proxy.

---

## E. Vision Retrospective Report (final, Phase 4)

```markdown
# Vision Retrospective Report

**Score delta:** <input score> → <output score>  (<input label> → <output label>)

## 1. Original vision (verbatim)
<raw input>

## 2. Hollowness Report (input)
<Phase 0 output>

## 3. Grounded vision
<Phase 1 output>

## 4. Claims & verification anchors
<Phase 2 table>

## 5. Implementation path
<Phase 3 path>

## 6. Anti-hollow check (output)
<Phase 4 re-score + audit notes>

## 7. Open risks & assumptions
- <risk / open item>
```
