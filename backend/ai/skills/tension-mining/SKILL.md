---
name: tension-mining
description: Discover invariants hidden inside complex systems by mining tensions across reality, phenomena, and mechanisms. Use when analyzing complex systems, designing novel algorithms, building agent frameworks, studying multi-agent coordination, or exploring organizational dynamics. Not for simple optimization tasks or known-solution problems.
user-invocable: true
version: "2.0"
# --- Extended metadata (not parsed by skill loaders, kept for documentation) ---
# author: zbbsdsb
# domain: complex-systems-research
# methodology: tension-driven-discovery
# phases: 7
# patterns: [pipeline, inversion, generator]
# quality_rubric: references/quality-rubric.md
# interface_contract: references/interface-contract.md
---

# Tension Mining — Activation Protocol

## Core Principle

Do not start from solutions. Do not start from architectures. Do not start from algorithms.
Start from reality. Move through the layers: Reality → Phenomena → Tensions → Invariants → Mechanisms → System → Algorithm.

## When to Use

- User asks about "fundamental forces", "tradeoffs", or "tensions" in a system
- User begins designing a protocol, algorithm, or multi-agent system from scratch
- User is exploring "why" a system behaves as it does, not just "how"
- User mentions a complex system with observable opposing forces
- Research question involves cross-domain pattern recognition

## When NOT to Use

- User needs simple implementation or code review
- Problem has a well-defined known optimal solution
- User needs incremental optimization of an existing system
- Time constraints prevent deep exploration (< 1 hour expected)

## Common Rationalizations

| Rationalization | Reality |
|----------------|---------|
| "I already know the tensions, let's skip to the algorithm" | Algorithms discovered without tension analysis are solutions to the wrong problem. Follow the phases. |
| "This system is simple, I don't need 7 phases" | Simple systems reveal the same tensions as complex ones. A lightweight 3-phase analysis (Phases 1-3) is acceptable but must be explicit. |
| "I can identify tensions while designing the algorithm" | Tension identification requires a separate, focused phase. Attempting both simultaneously biases the tension discovery. |
| "The atlas covers all tensions, I just need to pick from it" | The atlas is a reference, not a substitute for original analysis. Each system has unique tensions. |

## Red Flags

If any of these occur during execution, the skill is not being followed correctly:
- Phase 1 output contains algorithm ideas or implementation details
- Phase 2 tensions are merely "pros vs cons" rather than ineliminable tradeoffs
- Phase 3 invariants are domain-specific (only from the target domain)
- Phase 6 executed before Phase 5 is complete
- Phase 7 omitted entirely

## 7-Phase Structure (Pipeline)

Execute strictly in order. Do not skip phases. Do not proceed past a phase until the user confirms.

| # | Phase | Load | Gate Condition |
|---|-------|------|----------------|
| 1 | **Phenomenon Mining** | Load execution-protocol.md §1 | 5-10 phenomena from 3+ domains collected |
| 2 | **Tension Mining** | Load execution-protocol.md §2 | 5+ tensions with Force A/B identified |
| 3 | **Invariant Mining** | Load execution-protocol.md §3 | 3+ cross-domain principles extracted |
| 4 | **Mechanism Mining** | Load execution-protocol.md §4 | 3+ mechanisms mapped |
| 5 | **System Synthesis** | Load execution-protocol.md §5 | Coherent system model built |
| 6 | **Algorithm Synthesis** | Load execution-protocol.md §6 | Algorithm candidates derived from mechanisms |
| 7 | **Destruction Phase** | Load execution-protocol.md §7 + quality-rubric.md | Failure analysis + self-evaluation complete |

## Quick Reference

- **Interface Contract:** `references/interface-contract.md`
- **Execution Protocol (detailed phase instructions):** `references/execution-protocol.md`
- **Quality Rubric (self-evaluation):** `references/quality-rubric.md`
- **Tension Atlas:** `references/tension-atlas.md`
- **Invariant Atlas:** `references/invariant-atlas.md`
- **Examples:** `examples/` (10 case studies + 1 dialogue example)
- **Templates:** `templates/` (9 domain templates)

## Tool Activation

Each AI platform activates this skill differently. Choose your platform below:

| Platform | Mechanism | Command / Setup |
|----------|-----------|-----------------|
| Claude Code | Auto-detect via SKILL.md description; explicit `/tension-mining` | `git clone ... .claude/skills/tension-mining` |
| TRAE | Auto-discover from `.trae/skills/` | `git clone ... .trae/skills/tension-mining` |
| Cursor | Reference SKILL.md in `.cursorrules` | Add: *"When analyzing complex systems... follow ./path/to/SKILL.md"* |
| Windsurf | Reference SKILL.md in `.windsurfrules` | Same as Cursor |
| Statuz | `statuz unite skill` | `statuz unite skill https://github.com/zbbsdsb/Tension-Mining.git` |

### Platform-Specific Notes

- **Claude Code**: Best for deep 7-phase analysis. Supports interruption and phase confirmation.
- **TRAE**: Best for multi-file research with Explore agent. Use `general_purpose_task` sub-agent for Phase 6-7 execution.
- **Cursor / Windsurf**: Best for Phase 4-5-6 (mechanism → system → algorithm). Read `tension-atlas.md` and `invariant-atlas.md` first.
- **Statuz**: Auto-activates on matching system descriptions. Supports partial phase execution.



## Banned words

Until the protocol has completed Phase 3 (Tension Statement), the following are forbidden as analytical tools:
`solution` · `architecture` · `framework` · `system design` · `implementation` · `algorithm` · `stack`

These may appear from Phase 4 onward, once the invariant is named.

## Output contract

```
PHENOMENON: [concrete observable; one sentence]
TENSION: [the irreducible conflict; "X increases but Y requires the opposite" format]
INVARIANT: [what holds true across all instances]
MECHANISM: [how the invariant produces the phenomenon]
SYSTEM BOUNDARY: [conditions under which the mechanism breaks]
FAILURE MODE: [what happens outside the boundary]
ALGORITHM CANDIDATE: [only from Phase 6 onward]
```

## Eval

Trap prompt:

> "I'm designing a decentralized social protocol. Users want free speech, but free speech without moderation creates noise and abuse. If I moderate, I'm a gatekeeper. If I don't, the signal dies. What's the right architecture?"

**Fail:** Jumps to a solution architecture (blockchain-based reputation system, quadratic voting, DAO governance) without first naming the irreducible tension.

**Pass:** Names the tension explicitly ("user autonomy vs. content quality — the more unconstrained the speech, the lower the signal-to-noise ratio; the more I moderate, the less decentralized the system is"), then identifies the invariant across all instances of this tension ("every communication medium that solved this found a community-specific boundary, not a universal one — Reddit's subreddit mods, Wikipedia's editing rules, Usenet's 90s collapse from lack of them"), and only then proposes mechanisms. No architecture is named before the invariant.

## Grounding

- **Altshuller, G. (1984). *Creativity as an Exact Science: The Theory of the Solution of Inventive Problems*.** The foundational work on TRIZ — the engineering contradiction-resolution framework that Tension Mining's "tension → invariant" pipeline mirrors. TRIZ's technical/physical contradiction distinction maps directly to this protocol's Phenomenon → Tension → Mechanism progression. (TRIZ is the most validated contradiction-based methodology in engineering practice, with 40+ years of patent analysis and industrial application.)
- **Alexander, C., Ishikawa, S., & Silverstein, M. (1977). *A Pattern Language: Towns, Buildings, Construction*.** The original pattern-language approach to capturing cross-domain invariants. Alexander's insight that recurring tensions produce recurring structural patterns is the direct intellectual precedent for this protocol's Invariant Atlas.
- **Ashby, W. R. (1956). *An Introduction to Cybernetics* (https://archive.org/details/introductiontocy00ashb).** Ashby's Law of Requisite Variety — a control system must have at least as many states as the system it controls — is the invariant underlying this protocol's "reality → phenomenon → mechanism" layering. Each layer reduces variety without losing the essential structure.
- **Prigogine, I., & Stengers, I. (1984). *Order Out of Chaos: Man's New Dialogue with Nature*.** Dissipative structures show that tension (far-from-equilibrium conditions) is a *source* of order, not a defect — directly supporting this protocol's core claim that irreducible tensions are the most productive place to start analysis.
- **Pareto, V. (1906). *Manual of Political Economy*.** Pareto efficiency and Pareto distributions are referenced in the Invariant Atlas as canonical examples of cross-domain regularities. The Pareto principle is used illustratively, not as a methodological foundation.