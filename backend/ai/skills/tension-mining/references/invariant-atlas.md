# Invariant Atlas

> Cross-domain principles that remain valid regardless of context.

---

## How to Use This Atlas

- Each invariant contains: Statement, Supporting phenomena, Mechanism explanation, Mathematical intuition, Boundary conditions, Related tensions, Related cases
- Invariants marked **[CORE]** have been validated in 3+ case studies
- Invariants marked **[EXPERIMENTAL]** have theoretical grounding but limited empirical validation
- Unmarked invariants are well-defined but not yet validated in case studies
- Cross-reference tensions via ID (e.g., `T-AUT-005`)

---

## I. Information

### I-LCG-001: Local Rules Create Global Order [CORE]

- **Statement:** Local interactions between simple agents produce emergent global structure without centralized control.
- **Supporting phenomena:**
  - **Physics:** Flocking birds (Boids algorithm)
  - **Biology:** Ant trail formation via pheromones
  - **Society:** Traffic flow patterns from individual driver decisions
  - **Computation:** Distributed consensus protocols
- **Mechanism explanation:** Repeated local interactions create feedback loops that amplify certain patterns while suppressing others. The global structure is a statistical regularity of local behavior, not a designed outcome.
- **Mathematical intuition:** Cellular automata (Rule 110), Ising model phase transitions, percolation theory
- **Boundary conditions:** Fails when local interactions are too sparse (no amplification) or when external forcing dominates (no emergence)
- **Related tensions:** `T-LOC-004`, `T-CEN-011`, `T-SYN-010`, `T-EXP-001`
- **Related cases:** [`examples/page-rank.md`](./examples/page-rank.md), [`examples/npc-society.md`](./examples/npc-society.md), [`examples/git.md`](./examples/git.md), [`examples/consensus-protocols.md`](./examples/consensus-protocols.md), [`examples/ant-colony.md`](./examples/ant-colony.md)

### I-CRS-001: Compression Reveals Structure [CORE]

- **Statement:** The most efficient compression of a dataset exposes its underlying generative structure.
- **Supporting phenomena:**
  - **ML:** Autoencoders learn latent representations
  - **Neuroscience:** Sparse coding in visual cortex
  - **Physics:** Laws of motion as compression of trajectories
  - **Language:** Zipf's law revealing power-law distributions
- **Mechanism explanation:** Compression requires identifying regularities and redundancies. The compression algorithm implicitly builds a model of the data's structure. Maximum compression corresponds to maximum understanding of the generative process.
- **Mathematical intuition:** Minimum description length (MDL), Kolmogorov complexity, information bottleneck
- **Boundary conditions:** Fails with random data (no structure to reveal) or when the compression method is mismatched to the data's structure
- **Related tensions:** `T-COM-003`, `T-SPE-002`, `T-CMP-013`, `T-SIM-017`
- **Related cases:** [`examples/transformer.md`](./examples/transformer.md), [`examples/wikipedia.md`](./examples/wikipedia.md)

### I-GDM-001: Gradients Drive Movement [CORE]

- **Statement:** Differences in potential create flows that reshape systems over time.
- **Supporting phenomena:**
  - **Physics:** Heat flows from hot to cold (thermodynamics)
  - **Biology:** Nutrient gradients guide cell migration
  - **Economics:** Price differences drive trade and arbitrage
  - **ML:** Gradient descent follows loss landscape slopes
- **Mechanism explanation:** Any system with conserved quantities and local interactions will evolve to reduce gradients. The direction of flow is determined by the gradient; the rate is determined by resistance/conductance.
- **Mathematical intuition:** Fick's law of diffusion, Ohm's law, gradient descent update rule
- **Boundary conditions:** Fails in systems with active transport (energy input against gradient) or when gradients are too small to overcome activation barriers
- **Related tensions:** `T-EXP-001`, `T-SUR-014`, `T-COM-003`, `T-CMP-013`
- **Related cases:** [`examples/page-rank.md`](./examples/page-rank.md), [`examples/transformer.md`](./examples/transformer.md)

---

## II. Identity & Boundaries

### I-IDC-001: Identity Drives Cooperation [CORE]

- **Statement:** Shared identity markers enable cooperation beyond kin selection and reciprocal altruism.
- **Supporting phenomena:**
  - **Biology:** Green-beard effect in gene-level selection
  - **Society:** National identity enabling large-scale coordination
  - **Technology:** Cryptographic keys as machine identity
  - **Organizations:** Corporate culture as shared identity
- **Mechanism explanation:** Identity solves the recognition problem in cooperation -- who is "us" vs "them". Once recognized, in-group favoritism triggers cooperative behavior without requiring repeated interaction or genetic relatedness.
- **Mathematical intuition:** Evolutionary game theory (tag-based models), network homophily
- **Boundary conditions:** Fails when identity is too inclusive (free-riding) or too exclusive (missed cooperation opportunities). Also fails when identity signals are forgeable.
- **Related tensions:** `T-AUT-005`, `T-IND-007`, `T-COP-015`, `T-CEN-011`, `T-TRA-008`
- **Related cases:** [`examples/bitcoin.md`](./examples/bitcoin.md), [`examples/wikipedia.md`](./examples/wikipedia.md), [`examples/git.md`](./examples/git.md), [`examples/agent-organization.md`](./examples/agent-organization.md)

### I-BSB-001: Boundaries Shape Behavior [EXPERIMENTAL]

- **Statement:** The structure of boundaries determines the patterns of behavior within and between systems.
- **Supporting phenomena:**
  - **Biology:** Cell membranes enabling metabolic specialization
  - **Society:** Borders defining jurisdiction and law
  - **Software:** APIs as boundaries between modules
  - **Organizations:** Team boundaries determining communication patterns
- **Mechanism explanation:** Boundaries create distinct environments with different selection pressures. They enable specialization by protecting internal processes from external interference. The permeability of boundaries determines information and resource flow.
- **Mathematical intuition:** Graph partitioning, modularity optimization, compartmental models in epidemiology
- **Boundary conditions:** Fails when boundaries are too rigid (no adaptation) or too porous (no specialization). Also fails in fully mixed systems where boundaries cannot form.
- **Related tensions:** `T-TRA-008`, `T-SIM-017`, `T-CON-012`
- **Related cases:** [`examples/git.md`](./examples/git.md), [`examples/bitcoin.md`](./examples/bitcoin.md)

### I-FLS-001: Feedback Loops Stabilize [CORE]

- **Statement:** Negative feedback loops maintain dynamic equilibrium; positive feedback loops drive phase transitions.
- **Supporting phenomena:**
  - **Biology:** Homeostasis (temperature regulation, blood sugar)
  - **Economics:** Price mechanisms correcting supply-demand imbalances
  - **Engineering:** Thermostats and control systems
  - **Society:** Social norms correcting deviant behavior
- **Mechanism explanation:** Negative feedback compares current state to setpoint and applies corrective force. The loop gain determines response speed and stability margin. Positive feedback amplifies deviations until saturation or system restructuring.
- **Mathematical intuition:** Control theory (PID controllers), dynamical systems (attractors and bifurcations), eigenvalue analysis
- **Boundary conditions:** Negative feedback fails with too much delay (oscillation) or too much gain (instability). Positive feedback requires energy input or it self-terminates.
- **Related tensions:** `T-AUT-005`, `T-STA-009`, `T-SYN-010`, `T-CON-012`, `T-CON-018`, `T-SHO-019`
- **Related cases:** [`examples/wikipedia.md`](./examples/wikipedia.md), [`examples/agent-organization.md`](./examples/agent-organization.md)

---

## III. Networks & Flows

### I-PAF-001: Preferential Attachment [EXPERIMENTAL]

- **Statement:** Systems with cumulative advantage produce power-law distributions.
- **Supporting phenomena:**
  - **Web:** PageRank and link accumulation
  - **Social:** Wealth concentration (Pareto distribution)
  - **Biology:** Protein interaction networks
  - **Language:** Word frequency distributions (Zipf's law)
- **Mechanism explanation:** "The rich get richer" -- nodes with more connections attract new connections at higher rates. This creates hubs and long-tail distributions that are robust to random failure but fragile to targeted attack.
- **Mathematical intuition:** Barabasi-Albert model, Yule process, Polya's urn
- **Boundary conditions:** Fails when new nodes have no preference (random attachment produces exponential distributions) or when preferential attachment is counteracted by aging or fitness effects
- **Related tensions:** `T-COP-015`, `T-IND-007`, `T-CEN-011`
- **Related cases:** [`examples/page-rank.md`](./examples/page-rank.md), [`examples/market-efficiency.md`](./examples/market-efficiency.md)

### I-SWE-001: Small Worlds Emerge [EXPERIMENTAL]

- **Statement:** Local clustering combined with occasional long-range connections produces short path lengths.
- **Supporting phenomena:**
  - **Social:** Six degrees of separation
  - **Brain:** Local cortical clusters with long-range white matter tracts
  - **Power grids:** Regional grids with intertie connections
  - **Internet:** Autonomous systems with peering agreements
- **Mechanism explanation:** Clustering creates dense local neighborhoods; a small fraction of random long-range edges collapses the diameter. This structure balances local efficiency with global reach.
- **Mathematical intuition:** Watts-Strogatz model, graph diameter scaling, navigable small worlds (Kleinberg)
- **Boundary conditions:** Fails in purely regular lattices (no shortcuts) or purely random graphs (no local structure). Also fails when long-range connections are too expensive to maintain.
- **Related tensions:** `T-LOC-004`, `T-CEN-011`, `T-SYN-010`
- **Related cases:** [`examples/page-rank.md`](./examples/page-rank.md)

### I-FFG-001: Flow Finds Gradient [EXPERIMENTAL]

- **Statement:** In connected systems, flows naturally align with gradients, creating self-organizing transport networks.
- **Supporting phenomena:**
  - **Biology:** Slime mold solving maze problems
  - **Urban:** Road networks evolving from traffic patterns
  - **Internet:** Packet routing following latency gradients
  - **Neuroscience:** Neural pathways strengthening with use
- **Mechanism explanation:** Flow leaves traces (pheromones, wear, reinforcement) that attract future flow. High-flow paths become highways; low-flow paths atrophy. The network topology becomes a map of the gradient landscape.
- **Mathematical intuition:** Dijkstra's algorithm as biological process, reinforcement learning as network formation, optimal transport theory
- **Boundary conditions:** Fails when flow traces decay too fast (no accumulation) or when the gradient landscape changes faster than the network can adapt
- **Related tensions:** `T-EXP-001`, `T-LOC-004`, `T-SUR-014`
- **Related cases:** [`examples/page-rank.md`](./examples/page-rank.md)

---

## IV. Evolution & Adaptation

### I-VES-001: Variation Enables Selection [CORE]

- **Statement:** Without variation, selection has nothing to act upon; systems stagnate.
- **Supporting phenomena:**
  - **Biology:** Genetic mutation as substrate for natural selection
  - **Markets:** Entrepreneurial diversity enabling market discovery
  - **ML:** Ensemble methods requiring diverse base learners
  - **Immune systems:** Antibody diversity enabling pathogen recognition
- **Mechanism explanation:** Selection is a filter; variation is the input. The rate of adaptation depends on the product of variation generation rate and selection pressure. Too little variation: no adaptation. Too much: no accumulation of useful traits.
- **Mathematical intuition:** Fisher's fundamental theorem, genetic algorithm convergence, exploration-exploitation tradeoff
- **Boundary conditions:** Fails when variation is completely random with no heritability, or when selection pressure is zero (neutral drift)
- **Related tensions:** `T-EXP-001`, `T-SUR-014`, `T-SPR-016`, `T-CON-018`, `T-FRE-006`, `T-STA-009`
- **Related cases:** [`examples/npc-society.md`](./examples/npc-society.md), [`examples/wikipedia.md`](./examples/wikipedia.md), [`examples/ant-colony.md`](./examples/ant-colony.md)

### I-TAE-001: Tradeoffs Are Inescapable [CORE]

- **Statement:** Every optimization has a cost; the best systems are those that manage tradeoffs, not those that eliminate them.
- **Supporting phenomena:**
  - **Physics:** Uncertainty principle (position vs momentum)
  - **Computation:** CAP theorem (consistency vs availability)
  - **Biology:** Life history theory (reproduction vs survival)
  - **Economics:** Production possibility frontier
- **Mechanism explanation:** Resources are finite and multifunctional. Optimizing one function reallocates resources from others. The "no free lunch" theorem generalizes this: no single solution dominates all problems.
- **Mathematical intuition:** Pareto optimality, convex optimization duality, no-free-lunch theorems
- **Boundary conditions:** Fails when resources are truly infinite (no scarcity) or when functions are perfectly aligned (no conflict)
- **Related tensions:** `T-LOC-004`, `T-IND-007`, `T-COP-015`, `T-SHO-019`, `T-SPR-016`, `T-FRE-006`, `T-CON-012`
- **Related cases:** [`examples/agent-organization.md`](./examples/agent-organization.md), [`examples/bitcoin.md`](./examples/bitcoin.md), [`examples/market-efficiency.md`](./examples/market-efficiency.md)

### I-RRR-001: Robustness Requires Redundancy [EXPERIMENTAL]

- **Statement:** Systems that survive perturbation maintain functional overlap among components.
- **Supporting phenomena:**
  - **Biology:** Gene duplication providing backup function
  - **Engineering:** RAID storage, redundant power supplies
  - **Organizations:** Cross-training employees
  - **Ecology:** Biodiversity as ecosystem insurance
- **Mechanism explanation:** Redundancy enables graceful degradation. When one component fails, another can assume its function. The cost is inefficiency in normal operation; the benefit is survival under stress.
- **Mathematical intuition:** Reliability engineering (series vs parallel systems), fault tolerance, degeneracy in biological networks
- **Boundary conditions:** Fails when redundancy is perfect correlation (not true backup) or when the cost of redundancy exceeds the value of robustness
- **Related tensions:** `T-SPR-016`, `T-STA-009`, `T-CMP-013`
- **Related cases:** [`examples/git.md`](./examples/git.md), [`examples/bitcoin.md`](./examples/bitcoin.md)

---

## Extension Guide

### Adding a New Invariant

1. Assign a unique ID: `I-[3-letter-domain]-[3-digit-number]`
2. Include all fields: Statement, Supporting phenomena, Mechanism explanation, Mathematical intuition, Boundary conditions, Related tensions, Related cases
3. Mark [CORE] only after validation in 3+ case studies
4. Update related tension entries with back-references
5. Ensure the invariant is truly cross-domain (at least 3 distinct domains)