# Tension Mining — Interface Contract

> Load this file when entering the Tension Mining execution protocol.
> This file defines the input/output expectations, error handling, and constraints.

---

## Input Specification

| Field | Description |
|-------|-------------|
| **Type** | Research question or system analysis request |
| **Format** | Natural language describing the system/problem to analyze |
| **Examples** | `"How should we design a decentralized social network?"` |
| | `"What are the fundamental tradeoffs in multi-agent coordination?"` |
| | `"Analyze the forces shaping blockchain governance."` |
| **Constraints** | Must involve a complex system or design problem |
| | Must have at least one observable tradeoff between opposing forces |
| | Should have existing real-world phenomena to study |

## Output Specification

| Section | Required | Description |
|---------|----------|-------------|
| Phenomenon Library | Yes | 5-10 phenomena with cross-domain coverage (3+ domains) |
| Tension Map | Yes | At least 5 tensions, each with Force A/B, cross-domain examples, over-optimization consequences |
| Invariant Library | Yes | 3+ principles, each with supporting phenomena from distinct domains |
| Mechanism Library | Yes | 3+ mechanisms mapped to tensions and invariants |
| System Model | Yes | Core tensions, invariants, mechanisms, expected behaviors, failure modes |
| Algorithm Candidates | If applicable | Computational representations derived from mechanisms |
| Failure Analysis | Yes | Weak assumptions, missing tensions/invariants/mechanisms, possible redesigns |
| Quality Self-Evaluation | Yes | Rubric scores (D1-D5) + total with rating |

## Error Handling

| Condition | Action |
|-----------|--------|
| User provides fewer than 3 phenomena | Prompt user to research additional real-world phenomena from at least 3 distinct domains |
| Analysis yields fewer than 3 tensions | Return partial results; guide user to examine from alternative angles (historical, biological, economic, social) |
| User asks for algorithm design before Phase 1-5 | Remind: algorithms are downstream of understanding; offer complete tension analysis first, or explicitly acknowledge the skip as a tradeoff |
| User requests incremental optimization | Recommend against Tension Mining; suggest standard optimization techniques instead |