# Error Budget Specification Template

*(Fill-in-the-blank template for the MIT Scholar cognitive position, Layer 3: Error Budget. Use this template to translate theoretical tolerances into outsourcable engineering specifications.)*

---

## 1. Subsystem Error Budget Table

*(For each major subsystem in your project, define the theoretical tolerance, translate it to an engineering requirement, and decide whether it can be outsourced.)*

| Subsystem | Theoretical Tolerance | Engineering Requirement | Outsourcable? |
|-----------|---------------------|------------------------|---------------|
| *(Name of subsystem, e.g., "Video encoding pipeline")* | *(The fundamental limit of what the theory demands, e.g., "Latency < 200ms P99 from upload to playback start")* | *(The spec that can be given to an engineer or vendor, e.g., "Transcode to H.264 at 1080p30, max 150ms processing time on a t3.medium instance, buffer ≤ 50ms network jitter")* | *(Yes/No — and if No, why not)* |
| *(fill in)* | *(fill in)* | *(fill in)* | *(fill in)* |
| *(fill in)* | *(fill in)* | *(fill in)* | *(fill in)* |
| *(fill in)* | *(fill in)* | *(fill in)* | *(fill in)* |
| *(fill in)* | *(fill in)* | *(fill in)* | *(fill in)* |

**Column-by-column instructions:**

| Column | What to Enter | Common Mistake |
|--------|--------------|----------------|
| **Subsystem** | A bounded, independently testable component of your system. | Making it too broad (e.g., "the backend") or too narrow (e.g., "line 47 of auth.js"). |
| **Theoretical Tolerance** | The value that the underlying theory or model requires. This is your "physics" limit. | Writing an engineering spec here instead of a theoretical bound. The theoretical tolerance answers: "What does the math say is necessary?" |
| **Engineering Requirement** | The concrete, measurable spec an engineer can implement or buy. This must be tighter (more conservative) than the theoretical tolerance. | Matching the theoretical tolerance exactly — real engineering has noise, so you need margin. |
| **Outsourcable?** | Can this requirement be handed to a contractor, vendor, or open-source library without your team's deep domain expertise? | Confusing "outsourcable" with "easy." Some subsystems are hard but still outsourcable; others are easy but require proprietary knowledge. |

**Decision rule for outsourcing:** If the subsystem's theoretical tolerance depends on proprietary data or a novel algorithm your team owns, mark it as **Not outsourcable**. If the tolerance maps to a well-defined engineering problem with existing solutions, mark it as **Outsourcable**.

---

## 2. Theory-to-Engineering Mapping

*(Rules for translating theoretical precision into engineering specifications. These rules ensure that the error budget is not violated by implementation noise.)*

### Rule 1: The Safety Margin

> **Engineering Requirement = Theoretical Tolerance x (1 - Safety Factor)**

Where the Safety Factor depends on the measurement noise level:

| Measurement Noise Level | Safety Factor | Rationale |
|------------------------|---------------|-----------|
| Low (lab conditions, simulated data) | 0.10 (10% margin) | Controlled environment means less unexpected variance |
| Medium (real-world but bounded) | 0.25 (25% margin) | Real users introduce noise that theory cannot predict |
| High (production with unknown confounds) | 0.40 (40% margin) | Unknown unknowns require substantial headroom |

**Example:** If theoretical tolerance is 200ms and noise is Medium, then Engineering Requirement = 200ms x (1 - 0.25) = **150ms**.

### Rule 2: The Stacking Penalty

> Each additional layer between theory and implementation adds a **5% penalty** to the engineering requirement.

| Layer Count | Example Architecture | Stacking Penalty |
|-------------|---------------------|------------------|
| 1 | Direct implementation (theory directly coded) | 0% |
| 2 | Theory -> Library -> Implementation | 5% |
| 3 | Theory -> API -> Library -> Implementation | 10% |
| 4+ | Theory -> Contracted Vendor -> API -> Library -> Implementation | 15%+ |

**Example:** If theoretical tolerance is 200ms, noise is Medium (25% margin), and there are 2 layers (5% stacking penalty), then Engineering Requirement = 200ms x (1 - 0.25 - 0.05) = **140ms**.

### Rule 3: The Composability Constraint

> If subsystem A and subsystem B are composed **in series**, their error budgets **add**. If composed **in parallel**, the error budget is the **maximum** of the two.

| Composition Type | Error Budget Rule | Example |
|-----------------|-------------------|---------|
| Series (A -> B) | Budget_A + Budget_B | Video upload (100ms) + Transcode (50ms) = 150ms total |
| Parallel (A \|\| B) | max(Budget_A, Budget_B) | Audio encoding (30ms) \|\| Video encoding (80ms) = 80ms total (they run simultaneously) |

---

## 3. Decision Flow: Theory vs. Engineering

*(When engineering cannot meet the theoretical tolerance, the correct response is to modify the theory — not to force the engineering team to meet an impossible spec.)*

```
START: Engineering Requirement defined
  │
  ├── Can engineering meet the requirement?
  │     ├── Yes → Proceed. Monitor actual performance against budget.
  │     └── No  → Go to TRIAGE.
  │
  TRIAGE:
  ├── Is the gap small (<10% of theoretical tolerance)?
  │     ├── Yes → Add resources (more engineers, better hardware, longer timeline).
  │     └── No  → Go to THEORY_REVISION.
  │
  THEORY_REVISION:
  ├── Can the theory be relaxed without breaking the core thesis?
  │     ├── Yes → Relax the theoretical tolerance. Recalculate Engineering Requirement.
  │     └── No  → Go to THESIS_EVALUATION.
  │
  THESIS_EVALUATION:
  ├── Is the core thesis still viable with the relaxed tolerance?
  │     ├── Yes → Update the Falsifiability Whitepaper (Master Theorem).
  │     └── No  → Trigger the Destruction Condition from the Falsifiability Whitepaper.
  │
  END
```

**Decision flow rule:** Do not force engineering to meet a theoretical tolerance that the theory cannot justify. The theory serves the thesis, not the other way around. If the theory demands impossible precision, the theory is wrong.

---

## 4. Error Budget Allocation

*(Distribute the total error budget across subsystems in text/table form. This creates a visual representation of where precision is most critical.)*

### Allocation Table

| Priority Tier | Subsystem | Budget Share | Cumulative | Rationale |
|---------------|-----------|-------------|------------|-----------|
| **Tier 1 (Critical)** | *(Subsystem that must meet tolerance for the system to function)* | *(e.g., 35%)* | *(e.g., 35%)* | *(e.g., Directly determines core proposition; no workaround exists)* |
| **Tier 2 (Important)** | *(Subsystem that significantly impacts quality but can degrade gracefully)* | *(e.g., 25%)* | *(e.g., 60%)* | *(e.g., Degradation reduces retention but does not invalidate the thesis)* |
| **Tier 3 (Supporting)** | *(Subsystem that enhances experience but is not central to the thesis)* | *(e.g., 20%)* | *(e.g., 80%)* | *(e.g., Can be deferred or replaced with simpler alternatives)* |
| **Tier 4 (Reserve)** | *(Unallocated reserve for unexpected overhead)* | *(e.g., 20%)* | *(e.g., 100%)* | *(e.g., Covers integration friction, measurement error, edge cases)* |

### Allocation Rules

1. **Tier 1 subsystems must never be outsourced.** If the core proposition depends on it, own it.
2. **Tier 2 subsystems are the best candidates for outsourcing.** They matter but are well-defined.
3. **Tier 3 subsystems should be replaced with off-the-shelf solutions whenever possible.** Do not burn error budget on non-differentiating components.
4. **The Reserve must never drop below 10%.** If it does, redistribute from Tier 3 before taking from Tier 2.

---

## 5. Complete Worked Example

**Scenario:** Build a short-form video platform for niche hobby communities (HobbyVid).

### Subsystem Error Budget Table

| Subsystem | Theoretical Tolerance | Engineering Requirement | Outsourcable? |
|-----------|---------------------|------------------------|---------------|
| Video upload & encoding pipeline | Latency < 200ms P99 from upload to playback start | 150ms P99 (Medium noise: 25% margin + 1 layer: 0% stacking penalty = 200ms x 0.75) | Yes — use Mux, Cloudflare Stream, or similar |
| Recommendation feed | < 500ms P99 from request to rendered feed | 350ms P99 (High noise: 40% margin + 2 layers: 5% stacking penalty = 500ms x 0.55) | Partially — ranking logic is core IP, but infrastructure can be outsourced |
| Content moderation (auto-flag) | False positive rate < 1% for niche hobby content | False positive rate < 0.7% (Medium noise: 25% margin + 1 layer: 0% stacking penalty = 1% x 0.75) | No — niche hobby content requires domain-specific moderation rules; generic models are too inaccurate |
| Push notification delivery | < 30s from event to delivery for 95% of users | < 20s from event to delivery for 95% of users (Medium noise: 25% margin + 1 layer: 0% stacking penalty = 30s x 0.75) | Yes — use Firebase Cloud Messaging or OneSignal |
| User authentication | Login flow < 1s P99 | < 700ms P99 (Medium noise: 25% margin + 1 layer: 0% stacking penalty = 1000ms x 0.75) | Yes — use Auth0, Clerk, or Firebase Auth |

### Theory-to-Engineering Mapping Applied

| Subsystem | Theoretical Tolerance | Noise Level | Safety Factor | Stacking Layers | Stacking Penalty | Engineering Requirement |
|-----------|---------------------|-------------|---------------|-----------------|------------------|------------------------|
| Video encoding | 200ms | Medium | 25% | 1 | 0% | 150ms |
| Recommendation feed | 500ms | High | 40% | 2 | 5% | 275ms (500 x 0.55) |
| Content moderation | 1% FP | Medium | 25% | 1 | 0% | 0.75% FP |
| Push notifications | 30s | Medium | 25% | 1 | 0% | 22.5s |
| User auth | 1s | Medium | 25% | 1 | 0% | 750ms |

**Note on recommendation feed recalculation:** The theoretical tolerance of 500ms with High noise (40%) and 2 stacking layers (5%) gives 500ms x (1 - 0.40 - 0.05) = 500ms x 0.55 = **275ms**. The engineering requirement is tightened from 350ms to 275ms to account for the additional layers.

### Decision Flow Applied

**Scenario:** Engineering team reports that the content moderation subsystem cannot meet the 0.7% false positive rate requirement with off-the-shelf ML models. The best they can achieve is 2.5% false positive rate.

```
START: Engineering Requirement = 0.7% FP
  │
  ├── Can engineering meet 0.7% FP?
  │     └── No (best is 2.5% FP). Go to TRIAGE.
  │
  TRIAGE:
  ├── Is the gap small (<10% of theoretical tolerance = <0.1% FP)?
  │     └── No (gap is 1.8% FP). Go to THEORY_REVISION.
  │
  THEORY_REVISION:
  ├── Can the theory be relaxed?
  │     ├── The core thesis requires that hobby-specific content is not drowned out by general content.
  │     ├── A 2.5% FP rate means 2.5% of flagged content is actually valid hobby content.
  │     ├── If the moderation system is a soft-flag (content is demoted, not removed), then 2.5% FP is acceptable.
  │     └── Yes → Relax theoretical tolerance to 2.5% FP. Recalculate: 2.5% x 0.75 = 1.875% FP engineering requirement.
  │
  THESIS_EVALUATION:
  ├── Is the core thesis still viable?
  │     ├── Yes, because the moderation system is a soft-flag, not a hard block.
  │     └── Update the Falsifiability Whitepaper to reflect the relaxed moderation tolerance.
  │
  END: Proceed with 1.875% FP engineering requirement. Moderation is a soft-flag; content is demoted, not removed.
```

### Error Budget Allocation

| Priority Tier | Subsystem | Budget Share | Cumulative | Rationale |
|---------------|-----------|-------------|------------|-----------|
| **Tier 1 (Critical)** | Recommendation feed (ranking logic) | 35% | 35% | Core thesis depends on surfacing relevant hobby content; cannot outsource |
| **Tier 2 (Important)** | Video upload & encoding pipeline | 25% | 60% | Directly affects user experience; well-defined and outsourcable |
| **Tier 2 (Important)** | Content moderation (auto-flag) | 15% | 75% | Important for community quality; domain-specific rules prevent full outsourcing |
| **Tier 3 (Supporting)** | Push notification delivery | 5% | 80% | Nice-to-have; can use off-the-shelf solution |
| **Tier 3 (Supporting)** | User authentication | 5% | 85% | Commodity; fully outsourcable |
| **Tier 4 (Reserve)** | Unallocated reserve | 15% | 100% | Covers integration friction, measurement error, edge cases |

---

## Usage Notes

1. **Complete the Falsifiability Whitepaper (Layer 0) before this template.** The Error Budget Specification derives from the theoretical tolerances defined in the Master Theorem and Time Scale Separation.
2. **The Theory-to-Engineering Mapping rules are defaults, not laws.** Adjust the Safety Factor, Stacking Penalty, and Composability Constraint based on your specific domain. The key is to document the rationale.
3. **The Decision Flow is the most important part of this template.** Most projects fail not because engineering was bad, but because the theory was not adjusted when engineering hit its limits. The decision flow prevents this.
4. **Use the Error Budget Allocation to guide hiring and outsourcing decisions.** Tier 1 subsystems should be built in-house; Tier 2 subsystems are the best candidates for contractors; Tier 3 subsystems should be bought, not built.
5. **Revisit this template after each major milestone.** Theoretical tolerances become tighter as you learn more, and engineering requirements should be adjusted accordingly.