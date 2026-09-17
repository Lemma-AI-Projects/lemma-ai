# Tension Mining Template: Algorithm Discovery

> Use this template when discovering novel algorithms, optimizing existing ones, or understanding algorithmic tradeoffs.
> This template references `_core-template.md` for the shared 7-Phase Workflow skeleton.

---

## When to Use This Template

- Designing a new algorithm for an unsolved problem
- Understanding why an algorithm works (or fails)
- Choosing between algorithmic approaches
- Analyzing algorithmic complexity tradeoffs

---

## Pre-Filled Phenomenon Library

Select real-world phenomena that exhibit the algorithmic behavior you are studying:

- [ ] **Ant colony foraging paths** → graph path optimization, emergent shortest-path discovery
- [ ] **Water flowing through soil** → least-resistance path selection, adaptive routing
- [ ] **Market price discovery** → distributed optimization through competition and negotiation
- [ ] **Evolution selecting traits** → genetic algorithms, fitness landscape navigation
- [ ] **Neural synapse strengthening** → Hebbian learning, weight adaptation
- [ ] **Birds flocking** → decentralized coordination, local rule-based global behavior
- [ ] **Immune system recognition** → pattern matching, anomaly detection
- [ ] **Human memory retrieval** → associative search, relevance ranking
- [ ] **Weather pattern formation** → complex systems modeling, prediction under uncertainty
- [ ] **Other:** ___________________

### Domain Analysis Dimension

When selecting phenomena, prioritize cross-domain transfer. An algorithm inspired by economics (market pricing) may translate to distributed computing (resource allocation). The most novel algorithms often emerge from the most distant analogies.

---

## Pre-Filled Tension Checklist

### Core Tensions (select all that apply)

- [ ] **Exact vs Approximate** (`T-SPE-002`)
  - Does the problem require exact solutions?
  - What approximation guarantees are acceptable?

- [ ] **Time vs Space** (`T-CMP-013`)
  - What is the time complexity requirement?
  - What is the space complexity constraint?

- [ ] **General vs Specialized** (`T-SPR-016`)
  - Does the algorithm work for all inputs or specific cases?
  - What optimizations are possible for special cases?

- [ ] **Deterministic vs Randomized** (`T-EXP-001`)
  - Does the algorithm need deterministic guarantees?
  - What benefits does randomization provide?

- [ ] **Offline vs Online** (`T-STA-009`)
  - Is all input available upfront?
  - What decisions must be made without complete information?

- [ ] **Simplicity vs Optimality** (`T-SIM-017`)
  - Is a simple, good-enough algorithm preferable?
  - What is the cost of the optimal algorithm?

### Additional Tensions

- [ ] **Local vs Global** (`T-LOC-004`)
- [ ] **Exploration vs Exploitation** (`T-EXP-001`)
- [ ] **Short-term vs Long-term** (`T-SHO-019`)

---

## Pre-Filled Invariant Checklist

- [ ] **Compression Reveals Structure** (`I-CRS-001`)
- [ ] **Gradients Drive Movement** (`I-GDM-001`)
- [ ] **Local Rules Create Global Order** (`I-LCG-001`)
- [ ] **Tradeoffs Are Inescapable** (`I-TAE-001`)
- [ ] **Variation Enables Selection** (`I-VES-001`)

---

## Pre-Filled Mechanism Library

- [ ] **Divide and Conquer** (problem decomposition)
- [ ] **Dynamic Programming** (memoization, tabulation)
- [ ] **Greedy Selection** (local optimal choice)
- [ ] **Local Search** (neighborhood exploration)
- [ ] **Random Sampling** (Monte Carlo estimation)
- [ ] **Pruning** (branch and bound, alpha-beta)
- [ ] **Relaxation** (Lagrangian, linear programming)
- [ ] **Rounding** (integer programming, discretization)
- [ ] **Amortization** (aggregate analysis, potential method)

---

> **7-Phase Workflow:** Use `_core-template.md` for the full 7-Phase Workflow skeleton.
> **Output Template:** Use `_core-template.md` for the Final Deliverable structure.
> **Execution Protocol:** Load `references/execution-protocol.md` for detailed phase instructions.