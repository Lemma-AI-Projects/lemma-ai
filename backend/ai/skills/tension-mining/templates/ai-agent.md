# Tension Mining Template: AI Agent Design

> Use this template when designing AI agent systems, agent frameworks, or multi-agent architectures.
> This template references `_core-template.md` for the shared 7-Phase Workflow skeleton.

---

## When to Use This Template

- Designing a new AI agent from scratch
- Evaluating an existing agent architecture
- Building a multi-agent system
- Choosing between agent design patterns
- Investigating agent failure modes

---

## Pre-Filled Phenomenon Library

- [ ] **Human assistants** (executive assistants, personal assistants)
- [ ] **Expert systems** (medical diagnosis, legal reasoning)
- [ ] **Autonomous vehicles** (self-driving cars, drones)
- [ ] **Game AI** (NPCs, strategy game opponents)
- [ ] **Robotics** (manipulation, navigation, human-robot interaction)
- [ ] **Customer service** (chatbots, call center agents)
- [ ] **Scientific research** (automated hypothesis generation, experiment design)
- [ ] **Trading systems** (algorithmic trading, market making)
- [ ] **Creative tools** (AI writing, art generation, music composition)
- [ ] **Other:** ___________________

### Domain Analysis Dimension

Agent design is uniquely shaped by the **observer effect**: the agent's behavior changes how users interact with it. Unlike physical systems, agents adapt to their observers. When analyzing phenomena, consider how the presence of an observing human changes the agent's behavior.

---

## Pre-Filled Tension Checklist

### Core Tensions (select all that apply)

- [ ] **Autonomy vs Control** (`T-AUT-005`)
  - How much freedom should the agent have?
  - What human oversight is required?

- [ ] **Capability vs Alignment** (`T-SPE-002`)
  - What can the agent do vs what should it do?
  - How do you prevent capability misalignment?

- [ ] **Latency vs Quality** (`T-COM-003`)
  - How fast must the agent respond?
  - What quality tradeoffs are acceptable for speed?

- [ ] **General vs Specialized** (`T-SPR-016`)
  - Should the agent be a generalist or specialist?
  - Can the agent adapt to out-of-distribution tasks?

- [ ] **Exploration vs Exploitation** (`T-EXP-001`)
  - How should the agent balance trying new strategies vs using known ones?
  - When should the agent be conservative vs adventurous?

- [ ] **Transparency vs Performance** (`T-TRA-008`)
  - How explainable must the agent's decisions be?
  - What performance is sacrificed for explainability?

### Additional Tensions

- [ ] **Memory vs Computation** (`T-CMP-013`)
- [ ] **Short-term vs Long-term** (`T-SHO-019`)
- [ ] **Simplicity vs Capability** (`T-SIM-017`)

---

## Pre-Filled Invariant Checklist

- [ ] **Relevant Information is Sparse** (`I-CRS-001`)
- [ ] **Feedback Loops Stabilize** (`I-FLS-001`)
- [ ] **Boundaries Shape Behavior** (`I-BSB-001`)
- [ ] **Gradients Drive Movement** (`I-GDM-001`)
- [ ] **Tradeoffs Are Inescapable** (`I-TAE-001`)

---

## Pre-Filled Mechanism Library

- [ ] **ReAct** (Reasoning + Acting loops)
- [ ] **Chain-of-Thought** (step-by-step reasoning)
- [ ] **Tool Use / Function Calling** (external capability extension)
- [ ] **Retrieval-Augmented Generation (RAG)** (external memory)
- [ ] **Multi-Agent Debate** (consensus through disagreement)
- [ ] **Reinforcement Learning** (reward-driven behavior optimization)
- [ ] **Hierarchical Planning** (task decomposition)
- [ ] **Memory Systems** (short-term, long-term, episodic)
- [ ] **Reflection / Self-Correction** (meta-cognitive monitoring)

---

> **7-Phase Workflow:** Use `_core-template.md` for the full 7-Phase Workflow skeleton.
> **Output Template:** Use `_core-template.md` for the Final Deliverable structure.
> **Execution Protocol:** Load `references/execution-protocol.md` for detailed phase instructions.