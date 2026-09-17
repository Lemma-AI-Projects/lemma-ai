# Tension Mining: NPC Society

> How a tension between survival and exploration creates emergent social worlds.

---

## System Overview

NPC (Non-Player Character) societies in games like The Sims, Dwarf Fortress, and RimWorld demonstrate how simple rules can produce complex social behavior. But NPC societies did not begin as AI research. They began with a tension: how can synthetic characters exhibit believable social behavior without scripting every interaction? The breakthrough was not better AI or more realistic graphics -- it was recognizing that social behavior emerges from the tension between individual needs and collective constraints, and that this emergence can be harnessed to create living worlds.

---

## Phase 1: Phenomenon Mining

**Goal:** Build a library of relevant real-world phenomena.

### Phenomenon 1: Ant Colonies
- **Domain:** Biology / Entomology
- **Behavior:** Ant colonies exhibit complex collective behavior (foraging, nest building, defense) through simple individual rules. No ant has a global plan.
- **Why it matters:** Complex social behavior does not require complex individual cognition. Simple rules + local interactions = global complexity.

### Phenomenon 2: Human Cities
- **Domain:** Sociology / Urban Planning
- **Behavior:** Cities self-organize into neighborhoods, commercial districts, and transportation networks. No central planner designs these patterns.
- **Why it matters:** Urban structure emerges from individual decisions (where to live, where to shop, how to commute). NPC cities should similarly emerge from NPC behavior.

### Phenomenon 3: MMO Economies
- **Domain:** Economics / Game Design
- **Behavior:** Player-driven economies in games like EVE Online develop complex market structures, inflation, and financial instruments without designer intervention.
- **Why it matters:** Economic behavior emerges from supply, demand, and player ingenuity. NPC economies should similarly emerge from NPC needs and resource constraints.

### Phenomenon 4: The Sims
- **Domain:** Game Design / Psychology
- **Behavior:** The Sims uses need-based AI where characters have basic needs (hunger, social, bladder) that drive behavior. Complex stories emerge from need satisfaction and conflict.
- **Why it matters:** Need-based AI creates believable behavior without scripting. The tension between competing needs produces naturalistic decision-making.

### Phenomenon 5: Dwarf Fortress
- **Domain:** Game Design / Simulation
- **Behavior:** Dwarf Fortress generates complex narratives from simple rules. Dwarves have preferences, relationships, and moods. Fortresses rise and fall through emergent dynamics.
- **Why it matters:** The most memorable game stories are emergent, not scripted. Simple rules with deep interaction produce richer narratives than complex scripts.

---

## Phase 2: Tension Mining

**Goal:** Identify forces that continuously shape the system.

### Tension 1: Survival vs Exploration (`T-SUR-014`)
- **Force A:** Survival (meeting basic needs, avoiding danger)
- **Force B:** Exploration (seeking new opportunities, taking risks)
- **Why both matter:** Survival ensures persistence; exploration enables growth and discovery. NPCs that only survive are boring; NPCs that only explore die.
- **Over-optimizing Survival:** Static behavior, no story progression, predictable NPCs
- **Over-optimizing Exploration:** Reckless behavior, early death, chaotic worlds

### Tension 2: Individual vs Collective (`T-IND-007`)
- **Force A:** Individual needs (personal survival, goals, preferences)
- **Force B:** Collective welfare (group survival, social harmony, shared resources)
- **Why both matter:** Individual needs drive believable behavior; collective welfare creates social structure. The tension between them produces drama.
- **Over-optimizing Individual:** Selfish NPCs, tragedy of the commons, social collapse
- **Over-optimizing Collective:** Homogenized behavior, loss of individuality, cult-like NPCs

### Tension 3: Emergence vs Design (`T-FRE-006`)
- **Force A:** Emergence (behavior arises from rules, not scripts)
- **Force B:** Design (designer controls narrative and experience)
- **Why both matter:** Emergence creates surprising, unique experiences. Design ensures coherence and quality. Pure emergence can produce incoherent or undesirable outcomes.
- **Over-optimizing Emergence:** Incoherent narratives, player exploitation, emergent racism/sexism
- **Over-optimizing Design:** Scripted, predictable experiences, high development cost

### Tension 4: Variety vs Performance (`T-SPR-016`)
- **Force A:** Behavioral variety (diverse NPC personalities and behaviors)
- **Force B:** Computational performance (simulating many NPCs efficiently)
- **Why both matter:** Variety creates believable worlds; performance enables scale. Each unique behavior requires computation.
- **Over-optimizing Variety:** Unplayable frame rates, memory exhaustion, development bloat
- **Over-optimizing Performance:** Clone armies, identical behaviors, sterile worlds

---

## Phase 3: Invariant Mining

**Goal:** Discover patterns that appear across multiple phenomena.

### Invariant 1: Local Rules Create Global Order (`I-LCG-001`)
- **Statement:** Local interactions between simple agents produce emergent global structure without centralized control.
- **Supporting phenomena:** Flocking birds, ant trail formation, traffic flow, distributed consensus
- **Explanation:** NPC societies emerge from local interactions between individual NPCs. A trader NPC deciding where to sell goods, a guard NPC deciding whom to arrest, a citizen NPC deciding where to live -- each follows local rules. The global society (market prices, crime rates, neighborhood demographics) emerges without any NPC having a global model.

### Invariant 2: Gradients Drive Movement (`I-GDM-001`)
- **Statement:** Differences in potential create flows that reshape systems over time.
- **Supporting phenomena:** Heat flow, economic arbitrage, gradient descent, nutrient gradients
- **Explanation:** NPCs move along gradients of need satisfaction. A hungry NPC moves toward food. A poor NPC moves toward opportunity. A threatened NPC moves toward safety. These gradient-following behaviors create flows (migration, trade, conflict) that reshape the society.

### Invariant 3: Variation Enables Selection (`I-VES-001`)
- **Statement:** Without variation, selection has nothing to act upon; systems stagnate.
- **Supporting phenomena:** Genetic mutation, entrepreneurial diversity, ensemble methods, antibody diversity
- **Explanation:** NPC variety (different personalities, skills, preferences) creates the raw material for social selection. Some NPCs thrive; others fail. The society evolves as successful strategies spread and unsuccessful ones die out.

---

## Phase 4: Mechanism Mining

**Goal:** Understand how reality resolves tensions.

### Mechanism 1: Need-Based AI
- **Function:** Drives NPC behavior through competing internal needs
- **Related tensions:** `T-SUR-014` (Survival vs Exploration)
- **Related invariants:** `I-GDM-001` (Gradients Drive Movement)
- **Explanation:** NPCs have needs (hunger, social, safety, wealth) that generate gradients. The NPC follows the steepest gradient (most urgent need). This creates naturalistic behavior without scripting.

### Mechanism 2: Utility Systems
- **Function:** Enables NPCs to evaluate and choose among multiple actions
- **Related tensions:** `T-IND-007` (Individual vs Collective)
- **Related invariants:** `I-GDM-001` (Gradients Drive Movement)
- **Explanation:** Each possible action has a utility score based on how well it satisfies current needs. NPCs choose the action with highest utility. This creates rational (but not omniscient) decision-making.

### Mechanism 3: Social Networks
- **Function:** Creates persistent relationships between NPCs
- **Related tensions:** `T-IND-007` (Individual vs Collective)
- **Related invariants:** `I-LCG-001` (Local Rules Create Global Order)
- **Explanation:** NPCs form relationships (friendship, rivalry, family) based on interaction history. These relationships shape future behavior (helping friends, competing with rivals). The social network is an emergent structure.

### Mechanism 4: Economic Simulation
- **Function:** Creates emergent market dynamics from individual transactions
- **Related tensions:** `T-SUR-014` (Survival vs Exploration)
- **Related invariants:** `I-GDM-001` (Gradients Drive Movement)
- **Explanation:** NPCs trade goods based on supply and demand. Prices emerge from transaction history. Economic gradients (profit opportunities) drive NPC behavior. Markets self-organize without central planning.

### Mechanism 5: Event Propagation
- **Function:** Distributes information through the society
- **Related tensions:** `T-FRE-006` (Emergence vs Design)
- **Related invariants:** `I-LCG-001` (Local Rules Create Global Order)
- **Explanation:** Events (crimes, discoveries, deaths) propagate through social networks. NPCs react to events based on their relationships and needs. This creates ripple effects where local events have global consequences.

---

## Phase 5: System Synthesis

**Goal:** Combine tensions, invariants, and mechanisms into a coherent system model.

### Core Tensions
- NPCs must survive but also take risks for the world to be interesting
- Individual needs drive behavior but collective structure emerges from interaction
- Emergence creates surprise but design ensures coherence

### Core Invariants
- Local rules (individual NPC behavior) create global order (society structure)
- Gradients (need differences) drive movement and change
- Variation (diverse NPCs) enables selection and evolution

### Core Mechanisms
- Need-based AI for naturalistic behavior
- Utility systems for rational choice
- Social networks for persistent relationships
- Economic simulation for emergent markets
- Event propagation for information flow

### Expected Behaviors
- NPCs exhibit believable daily routines
- Social structures emerge organically
- Economies self-organize and evolve
- Stories emerge from NPC interactions without scripting
- Societies can rise and fall through internal dynamics

### Failure Modes
- Player exploitation (killing all NPCs, breaking economy)
- Emergent racism/sexism (biased training data or rules)
- Economy collapse (inflation, deflation, market manipulation)
- Narrative incoherence (emergent stories that contradict designed lore)
- Performance degradation (too many NPCs, too complex interactions)

---

## Phase 6: Algorithm Synthesis

**Goal:** Generate implementation candidates.

### Algorithm: Emergent NPC Society

**Core idea:** Create a society of NPCs with needs, utilities, relationships, and economic agency. Let social structure emerge from local interactions. Use events to drive narrative without scripting.

**Key components:**

```
1. Need system (hunger, social, safety, wealth, status)
2. Utility evaluation (score actions by need satisfaction)
3. Social network (relationships affect behavior)
4. Economic simulation (supply, demand, price emergence)
5. Event system (information propagation)
6. World state (environment affects NPC behavior)
```

**Advantages:**
- Emergent narratives are unique to each playthrough
- NPC behavior is believable without scripting
- Society evolves organically
- High replayability
- Scales with content (more NPC types = more variety)

**Limitations:**
- Difficult to ensure narrative coherence
- Emergent behavior can be undesirable (bias, exploitation)
- Hard to debug (bugs manifest as social dysfunction)
- Performance costs for large populations
- Requires careful tuning (small parameter changes can produce wildly different outcomes)

---

## Phase 7: Destruction Phase

**Goal:** Attack the model. Assume it is wrong.

### Weak Assumptions
- **NPCs are rational:** In reality, human behavior is often irrational, emotional, and contradictory.
- **Needs are universal:** Different cultures and individuals have different need hierarchies.
- **Utility is computable:** Many human decisions are based on values that cannot be reduced to utility scores.
- **Social networks are stable:** Real relationships are fluid and context-dependent.
- **Economies reach equilibrium:** Real economies are perpetually disequilibrated.

### Missing Tensions
- **Scripting vs Emergence:** Some narrative moments require scripted beats. Pure emergence cannot deliver authored experiences.
- **Agency vs Control:** Players want agency, but designers need control over the experience.
- **Realism vs Fun:** Realistic NPC behavior may not be fun (e.g., NPCs going to work 8 hours a day).

### Missing Invariants
- **Memory is selective:** NPCs remember everything. Humans forget, distort, and reconstruct memories.
- **Emotion drives decision:** Utility systems are coldly rational. Human decisions are heavily influenced by emotion.

### Missing Mechanisms
- **Cultural transmission:** NPCs do not learn from each other or develop culture.
- **Generational change:** NPCs do not age, die, or reproduce (in most games).
- **Language and communication:** NPCs communicate through simple state changes, not rich language.

### Possible Redesigns
- **LLM-based NPCs:** Use language models for rich dialogue and reasoning
- **Cultural evolution:** NPCs develop traditions, languages, and norms over time
- **Emotion systems:** Add emotional states that override utility calculations
- **Generational simulation:** NPCs age, reproduce, and die; societies evolve over generations
- **Narrative scaffolding:** Designer-authored narrative frameworks that guide emergent behavior

---

## Key Insight

NPC society is not a simulation of human society. It is a mechanism for converting need gradients into social structure. The insight was not "give NPCs needs" or "simulate an economy" -- it was recognizing that social behavior emerges from the tension between individual survival and collective interaction. By creating NPCs with competing needs and letting them interact, the society self-organizes. The algorithm emerged from the tension: if you cannot script every interaction, design NPCs whose local needs produce global social dynamics.
