---
name: "decomposer"
description: "Cognitive protocol that converts unknown unknowns into known unknowns. Invoke for large/ambiguous goals, or when user asks for honest breakdown, decomposition, or avoiding empty plans."
---

# Decomposer — TRAE Adapter

This is the TRAE-specific adapter for the Decomposer protocol. The universal skill definition is at `../../SKILL.md`. The full protocol is at `../../PROTOCOL.md`.

---

## Activation

Before executing the five steps, establish two things:

### 1. Identify Cognitive Position

Use the detection tree in `../../references/COGNITIVE_POSITIONS.md` to determine the user's dominant position. Ask the questions if the answer is not obvious from context.

### 2. Identify Output Context

Use the trigger phrase detection in `../../references/OUTPUT_CONTEXTS.md`. For TRAE conversations, the default context is "TRAE Conversation" — Markdown dialogue within the conversation flow.

---

## Execution

The five-step protocol is defined in `../../PROTOCOL.md`. Execute it faithfully. The TRAE-specific considerations are:

1. **Output is conversation-native** — render the uncertainty map as Markdown tables and trees within the dialogue. Do not generate files unless the user explicitly requests it.
2. **Hard-gate enforcement** — TRAE's instruction-following capability prevents skipping the Honesty Fuse or producing module lists before the mapping is complete.
3. **Self-check** — run the five checks from `../../references/ANTI_SHELL_CHECKLIST.md`. If any fails, return to the corresponding step.

## Reference Files

| File | Purpose |
|------|---------|
| `../../PROTOCOL.md` | Full five-step protocol definition |
| `../../SKILL.md` | Universal skill definition |
| `../../references/COGNITIVE_POSITIONS.md` | Position detection (includes MIT Scholar) |
| `../../references/OUTPUT_CONTEXTS.md` | Context rendering rules |
| `../../references/ANTI_SHELL_CHECKLIST.md` | Self-check checklist |
| `../../references/SCALE_GUIDE.md` | Scale adaptation guide |
| `../../references/COMMON_PITFALLS.md` | Common execution errors |
| `../../VALIDATION.md` | Empirical validation roadmap |
| `../../TUTORIAL.md` | Beginner tutorial |
| `../../references/PROBE_TOOLKIT.md` | Probe toolkit for finding unknown unknowns |
| `../../references/FALSIFIABILITY_WHITEPAPER_TEMPLATE.md` | Falsifiability Whitepaper fill-in template |
| `../../references/ERROR_BUDGET_SPEC_TEMPLATE.md` | Error Budget Specification fill-in template |
| `../../references/ZERO_CODE_VALIDATION_TEMPLATE.md` | Zero-code validation template |
| `../../references/SEVEN_DAY_TEST_CHAIN_TEMPLATE.md` | 7-day lethal test chain template |
| `../../references/DECISION_CARDS_WORKSHEET.md` | Three decision cards worksheet |
| `../../references/QUICK_REFERENCE_CARD.md` | Single-page protocol cheat sheet |