# Scale Adaptation Guide

> How to calibrate the Decomposer protocol's depth to match your project's size, complexity, and context.

---

## Decision Matrix

| Project Complexity | Recommended Usage | Granularity | Time Budget |
|-------------------|-------------------|-------------|-------------|
| Simple (1 person, 1 week) | Step 5 only (Anti-Shell Self-Check) | 3-5 nodes | 5 minutes |
| Moderate (3-5 people, 1 month) | Full five steps, lightweight | 10-20 nodes | 30-60 minutes |
| Complex (team, quarterly) | Full five steps + hierarchical decomposition | 20-50 nodes | 2-4 hours |
| Ultra-complex (organization, annual) | Full five steps, decomposed by subdomain | Each subdomain mapped independently | 4-8 hours per subdomain |

---

## Simple Projects (1 person, ~1 week)

### When to Use This Scale

- Personal task with clear execution path
- Small feature or bug fix
- Well-understood problem with few unknowns

### What to Do

Skip Steps 1-4. Run only Step 5 (Anti-Shell Self-Check) on your existing plan or mental model. This takes 5 minutes and catches the most common failure modes: missing survival conditions, jargon, overconfidence, lack of honesty, and lack of actionability.

### Example

You want to write a blog post. Instead of running the full protocol, run the five checks:
1. Does the post have a testable claim? (Survival Condition)
2. Is the language concrete, not buzzwordy? (Jargon)
3. Are you acknowledging uncertainty, or writing with false confidence? (Uncertainty Ratio)
4. Is there at least one "I don't know" or honest limitation? (Honesty)
5. Can the reader do something specific after reading? (Actionability)

---

## Moderate Projects (3-5 people, ~1 month)

### When to Use This Scale

- New feature with moderate uncertainty
- Small team project with cross-functional dependencies
- Project with a few key unknowns that need to be surfaced

### What to Do

Run all five steps, but keep it lightweight. Aim for 10-20 nodes total. Do not over-decompose — if a node is clearly Green with no dependencies, do not spend more than 30 seconds on it. Focus your energy on the Yellow and Red nodes.

### Lightweight Template

| Step | Time Budget | Key Output |
|------|-------------|------------|
| 1. Honesty Fuse | 5 minutes | Three declarations |
| 2. Uncertainty Mapping | 10 minutes | 10-20 elements in a table |
| 3. Hierarchical Decomposition | 10 minutes | Dependency tree (2-3 levels) |
| 4. Error Budget Assignment | 10 minutes | Confidence + survival conditions for key nodes |
| 5. Anti-Shell Self-Check | 5 minutes | Five checks, pass/fail |

---

## Complex Projects (team, quarterly)

### When to Use This Scale

- Multi-team project with significant uncertainty
- Product launch with market and technical risk
- Project with multiple interdependent subsystems

### What to Do

Run the full protocol with full hierarchical decomposition. Aim for 20-50 nodes. Each node should have a complete survival condition. Use the Probe Toolkit (from PROTOCOL.md) to surface blind spots before the mapping.

### Team Coordination

- Assign a single "decomposer" role per session. This person runs the protocol while others contribute domain knowledge.
- Do not attempt to run the protocol as a group consensus exercise. It produces better output with a single decision-maker and multiple informants.
- After the first pass, share the output with the team. Run a second pass incorporating their feedback.

### Output Artifacts

- Uncertainty map (Markdown table or shared document)
- Dependency tree (diagram, Mermaid, or text)
- Error budget table (spreadsheet or document)
- Action items derived from Red and Yellow nodes

---

## Ultra-Complex Projects (organization, annual)

### When to Use This Scale

- Organization-wide initiative with high uncertainty
- Research program with multiple interdependent workstreams
- Project where failure of one subsystem could cascade across the entire organization

### What to Do

Decompose the project by subdomain, not by trying to map everything at once. Each subdomain gets its own independent protocol execution. The outputs are then integrated into a master uncertainty map.

### Subdomain Breakdown

1. Identify the major subdomains (e.g., technical, market, regulatory, operational).
2. Assign a lead decomposer for each subdomain.
3. Each subdomain runs the full protocol independently (20-50 nodes each).
4. The leads meet to integrate: identify cross-subdomain dependencies and Red nodes.
5. The integrated map becomes the master uncertainty map for the organization.

### Common Pitfalls at This Scale

| Pitfall | Prevention |
|---------|------------|
| Mapping becomes a "zombie document" — created but never consulted | Assign explicit action items to each Red node. Review the map at every major decision point. |
| Subdomain leads produce incompatible maps | Use a shared template for all subdomain executions. |
| The map grows too large to be useful | Enforce a hard limit of 50 nodes per subdomain. If a subdomain needs more, split it further. |
| The protocol is treated as a one-time exercise | Schedule a protocol re-execution on a regular cadence (e.g., monthly for complex projects, quarterly for ultra-complex ones). |

---

## When to Skip the Protocol Entirely

1. **The task is already well-understood and executable.** You do not need to decompose what you already know how to do.
2. **The team is in active execution sprint with no new information.** The protocol is for *before* execution, not during.
3. **The user explicitly wants a fast answer, not a deep analysis.** In this case, provide the answer directly.
4. **The emotional cost of honest uncertainty mapping would paralyze rather than enable.** The protocol is honest about its own limits: it is not suitable for every situation.
5. **The project is purely social or relational** (e.g., "how do I have a difficult conversation with my colleague?"). The protocol is designed for cognitive uncertainty, not interpersonal dynamics.