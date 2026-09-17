# Cognitive Position Detection & Routing

A decision procedure for identifying the user's cognitive position and adapting the protocol's output accordingly.

---

## The Four Positions

The Decomposer protocol recognizes four cognitive prototypes. A real user may occupy multiple positions; when this happens, use the **dominant position** — the one that determines the user's primary constraint.

| Position | Primary Constraint | Default Output Shape |
|----------|-------------------|---------------------|
| Technical Architect | Technical feasibility & system integrity | Dynamic node tree with uncertainty overlays |
| Non-technical Founder | No coding ability, limited research bandwidth | Human-equivalence plans & test chains |
| Decision-maker | Capital allocation, limited time | Three decision cards (fatal assumption, resource leverage, minimum sellable unit) |
| MIT Scholar | Intellectual rigor, falsifiability | Falsifiability stacks & error budgets |

---

## Detection Decision Tree

Ask these 4 questions in order. The first "yes" determines the position.

```
Q1: "Can you write code to build this yourself?"
  ├── Yes → Technical Architect
  └── No  → Q2

Q2: "Is your primary concern whether this idea is technically possible?"
  ├── Yes → MIT Scholar
  └── No  → Q3

Q3: "Are you allocating capital or making go/no-go decisions?"
  ├── Yes → Decision-maker
  └── No  → Q4

Q4: "Do you have a vision but no technical team or research bandwidth?"
  ├── Yes → Non-technical Founder
  └── No  → [Fallback: Non-technical Founder]
```

**Fallback rule**: If detection is ambiguous, default to Non-technical Founder. This is the safest default because it assumes the least resources and produces the most actionable output.

---

## 5-Step × 4-Position Mapping

Each protocol step produces different output depending on the user's cognitive position.

| Step | Technical Architect | Non-technical Founder | Decision-maker | MIT Scholar |
|------|-------------------|----------------------|----------------|-----------------|
| **1. Honesty Fuse** | "I can map technical dependencies but cannot validate market demand." | "I can help you test the idea without writing code, but cannot tell you if it scales." | "I can translate your vision into 3 questions for a CTO, but cannot decide for you." | "I can help write the theorem that kills this direction in 3 days, but cannot predict the outcome." |
| **2. Uncertainty Map** | System blueprint with uncertainty overlays | Survival chart: what you can do manually vs. what needs testing | Investment risk matrix with capital-at-stake estimates | Falsifiability stack: what's provable, what's testable, what's unformulable |
| **3. Decomposition** | Dynamic node tree with survival conditions | Human-equivalence plan: manual process = prototype | Three decision cards | Time-constant separated layers (fast/medium/slow variables) |
| **4. Error Budget** | Specification document with numerical tolerances | Time-leveraged test chain (7-day cycle) | Capital efficiency map ($ per uncertainty resolved) | Numerical error budget per subsystem |
| **5. Self-Check** | Checks for jargon, overconfidence in architecture | Checks for hidden code dependencies | Checks for hidden capital requirements | Checks for unfalsifiable claims |

---

## Handling Mixed Positions

When a user exhibits characteristics of multiple positions:

1. **Detect**: Identify which constraint is the bottleneck right now. If they have both vision and technical ability, they are a Technical Architect by default.
2. **Route**: Execute the protocol using the dominant position's output shape.
3. **Flag**: Note the secondary position and offer to re-execute from that perspective if the primary output does not address their needs.

Example: "You seem to be a Technical Architect who also needs to make capital allocation decisions. I'll produce the default output as a dynamic node tree, and then extract the three decision cards that matter most for capital allocation."