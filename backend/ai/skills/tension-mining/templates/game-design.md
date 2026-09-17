# Tension Mining Template: Game Design

> Use this template when analyzing game system dynamics, evaluating game mechanics, or designing new game systems.
> This template references `_core-template.md` for the shared 7-Phase Workflow skeleton.

---

## When to Use This Template

- Designing a new game system or mechanic
- Analyzing the balance of an existing game
- Understanding player engagement and retention dynamics
- Evaluating tradeoffs between competing design goals
- Investigating emergent gameplay from interacting mechanics

---

## Pre-Filled Phenomenon Library

Select real-world phenomena that exhibit the game-like dynamics you are studying:

- [ ] **Board games (Chess, Go)** → perfect information strategy, skill progression, depth without randomness
- [ ] **Sports (Soccer, Basketball)** → real-time competition, teamwork vs individual skill, rule-bounded creativity
- [ ] **Card games (Poker, Magic: The Gathering)** → incomplete information, probability management, meta-game evolution
- [ ] **Competitive video games (StarCraft, DOTA)** → real-time strategy, skill ceilings, balance patches as homeostasis
- [ ] **Open-world RPGs (Skyrim, Zelda)** → emergent narrative, player agency, content consumption pacing
- [ ] **Roguelikes (Hades, Slay the Spire)** → permadeath risk-reward, run variety, short-term vs long-term progression
- [ ] **Puzzle games (Tetris, Portal)** → difficulty curves, skill mastery, learn-by-failing feedback
- [ ] **Social deduction games (Werewolf, Among Us)** → hidden information, persuasion, trust systems
- [ ] **Sandbox games (Minecraft, Dwarf Fortress)** → tool-based creativity, emergent storytelling, system-driven narrative
- [ ] **Other:** ___________________

### Domain Analysis Dimension

When selecting phenomena, consider both **real-world** and **game-world** sources. Real-world competition (sports, markets) reveals deep strategic tensions, while existing game systems provide tested examples of how those tensions are resolved into engaging experiences. The most innovative game designs often emerge from translating non-game dynamics into playable mechanics.

---

## Pre-Filled Tension Checklist

### Core Tensions (select all that apply)

- [ ] **Skill vs Chance** (`T-SKI-008`)
  - Is the outcome determined by player ability or randomness?
  - How do you balance deterministic skill expression with exciting uncertainty?
  - What happens when luck dominates (player frustration) or skill dominates (predictability)?

- [ ] **Story vs Mechanics** (`T-STO-012`)
  - Is the experience driven by narrative or by gameplay depth?
  - How do you balance authored storytelling with player-driven mechanical expression?
  - What happens when story overrides mechanics (on-rails) or mechanics override story (disconnected gameplay)?

- [ ] **Competition vs Cooperation** (`T-COP-015`)
  - Are players working against each other or with each other?
  - How do you handle free-riding in cooperative modes? Griefing in competitive modes?
  - What are the incentives that push players toward or away from each other?

- [ ] **Freedom vs Structure** (`T-FRE-006`)
  - How much open-world autonomy does the player have vs guided linear progression?
  - What guardrails prevent players from getting stuck or lost?
  - How do you balance sandbox creativity with authored content delivery?

- [ ] **Depth vs Accessibility** (`T-DEP-003`)
  - How complex is the strategic layer vs how easy is it to pick up?
  - What is the skill floor (entry barrier) and skill ceiling (mastery gap)?
  - How do you avoid the "tutorial fatigue" trap vs the "complexity wall" trap?

### Additional Tensions

- [ ] **Short-term vs Long-term** (`T-SHO-019`) — immediate gratification vs sustained progression
- [ ] **Exploration vs Exploitation** (`T-EXP-001`) — trying new strategies vs optimizing known ones
- [ ] **Individual vs Collective** (`T-IND-007`) — solo player needs vs multiplayer ecosystem health
- [ ] **Emergence vs Design** (`T-FRE-006`) — player-created systems vs developer-authored content
- [ ] **Variety vs Performance** (`T-SPR-016`) — content breadth vs technical/QA constraints

---

## Pre-Filled Invariant Checklist

- [ ] **Variation Enables Selection** (`I-VES-001`)
  - Without meaningful variation in player choices, no interesting selection dynamics emerge. Games must offer genuinely different paths for player skill expression.
- [ ] **Feedback Loops Stabilize** (`I-FLS-001`)
  - Positive feedback (snowballing) and negative feedback (catch-up mechanics) shape game pacing. Without proper feedback, games become either runaway or stagnant.
- [ ] **Boundaries Shape Behavior** (`I-BSB-001`)
  - Rules, physics constraints, level boundaries, and resource limits define the design space. Creativity flourishes within well-defined constraints.
- [ ] **Tradeoffs Are Inescapable** (`I-TAE-001`)
  - Every design choice sacrifices something. No game can maximize all five core tensions simultaneously; the art is in choosing which tradeoffs create the most engaging experience.

---

## Pre-Filled Mechanism Library

- [ ] **Progression Systems** (XP, levels, unlockables — time-based motivation structure)
- [ ] **Risk-Reward Pendulum** (high-risk/high-reward decisions, push-your-luck mechanics)
- [ ] **Resource Management** (currency, mana, stamina — scarcity drives meaningful choice)
- [ ] **Difficulty Curves** (ramping challenge matched to player skill growth)
- [ ] **Economy Loops** (earn-spend-invest cycles, inflation controls, gold sinks)
- [ ] **Matchmaking Systems** (ELO, Glicko, SBMM — fair competition through skill estimation)
- [ ] **Procedural Generation** (content creation algorithms for variety without manual authoring)
- [ ] **Player Choice Architecture** (branching paths, moral choices, consequence systems)
- [ ] **Multiplayer Synchronization** (netcode, lockstep, rollback — fairness across network conditions)

---

> **7-Phase Workflow:** Use `_core-template.md` for the full 7-Phase Workflow skeleton.
> **Output Template:** Use `_core-template.md` for the Final Deliverable structure.
> **Execution Protocol:** Load `references/execution-protocol.md` for detailed phase instructions.