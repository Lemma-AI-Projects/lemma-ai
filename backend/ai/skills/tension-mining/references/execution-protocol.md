# Tension Mining — Execution Protocol

> Load the relevant section when entering each phase of the pipeline.
> Each section contains the goal, interview questions (Inversion pattern), output requirements, and gate conditions for that phase.
> **Do not read ahead.** Load only the section corresponding to the current phase.

---

## Phase 1: Phenomenon Mining

### Goal
Build a library of real-world systems that exhibit the behavior you are trying to understand. Before any abstraction, before any theory, observe what already exists. The quality of your entire analysis depends on the breadth and depth of your phenomena.

### Interview Questions (Inversion Pattern)

Ask the user these questions **one at a time**. Wait for an answer before proceeding to the next question.

1. "What real-world systems (natural, social, or technological) exhibit the behavior or problem you are interested in?"
2. "Can you identify at least one system outside your target domain that shows a similar pattern?"
3. "What surprised you most when observing these systems?"
4. "Which of these systems would you consider the 'extreme case' — the one where the phenomenon is most visible?"

If the user struggles, suggest looking at: biological systems, markets, organizations, physical processes, or historical precedents.

### Output Requirements

Document each phenomenon with:
- **Name** — Short label (e.g., "Ant Colony Foraging")
- **Domain** — Where it occurs (e.g., Biology, Economics, Software)
- **Observed behavior** — What actually happens, not what you think should happen
- **Why it matters** — How this phenomenon relates to the target system

**Required:** 5-10 phenomena from at least 3 distinct domains.

### Gate Condition

Confirm with the user: "You have collected [N] phenomena from [M] domains. The next phase (Tension Mining) requires identifying forces that shape these phenomena. Shall we proceed?"

Do not proceed until 5+ phenomena from 3+ domains are collected.

---

## Phase 2: Tension Mining

### Goal
Identify the forces that shape the phenomena you collected. A tension is a tradeoff that cannot be permanently eliminated — it can only be managed. Tensions are not "problems to solve"; they are the productive forces that drive system behavior.

### Interview Questions (Inversion Pattern)

Ask **one at a time**, wait for an answer.

1. "For each phenomenon you collected, what force seems to push the system in one direction?"
2. "What opposes that force — what fights back?"
3. "Why can't you simply eliminate one of these forces?"
4. "What happens when a system over-optimizes Force A? What happens when it over-optimizes Force B?"
5. "Which tension do you think is the most fundamental — the one that, if resolved, would change everything?"

If the user lists "pros vs cons" instead of tensions, re-orient: "Pros and cons describe choices. Tensions describe forces that persist regardless of choice. What force is always present regardless of how you decide?"

### Output Requirements

Document each tension with:
- **Force A** — One direction of pull
- **Force B** — The opposing direction
- **Why ineliminable** — Why neither force can be permanently eliminated
- **Cross-domain examples** — Where this tension appears outside your target domain
- **Over-optimization consequences** — What happens with too much A or too much B
- **Related invariants** — Cross-reference via ID (will be filled in Phase 3)

**Required:** At least 5 tensions. Force A and Force B must be clearly distinguished as opposing directions, not merely "good vs bad."

### Gate Condition

Confirm: "You have identified [N] tensions with clear Force A/B and over-optimization consequences. The next phase (Invariant Mining) looks for patterns that hold across all these tensions. Proceed?"

Do not proceed if tensions are merely "pros vs cons" rather than ineliminable tradeoffs.

---

## Phase 3: Invariant Mining

### Goal
Extract principles that appear across multiple tensions and multiple domains. Invariants are the "laws" of complex systems — they explain why the same tension patterns appear in biology, society, and technology.

### Interview Questions (Inversion Pattern)

Ask **one at a time**, wait for an answer.

1. "Looking across all the tensions you identified, what pattern appears in multiple domains?"
2. "Is there a principle that holds true regardless of context?"
3. "When would this principle NOT apply — what are its boundary conditions?"
4. "Does this invariant help explain any of the other tensions you identified?"
5. "Can you think of a counterexample — a system where this invariant does NOT hold?"

If invariants are domain-specific, push back: "That sounds like it only applies in [domain]. Can you find a version of this principle that works across biology, economics, and technology?"

### Output Requirements

Document each invariant with:
- **Statement** — One sentence that captures the invariant
- **Supporting phenomena** — At least 3 distinct domains where this holds
- **Mechanism explanation** — Why it happens (brief, 2-3 sentences)
- **Mathematical intuition** — Optional formal intuition
- **Boundary conditions** — When this invariant does NOT apply
- **Related tensions** — Cross-reference via ID (from Phase 2)
- **Related cases** — References to concrete examples

**Required:** At least 3 invariants, each with supporting phenomena from distinct domains.

### Gate Condition

Confirm: "You have extracted [N] cross-domain invariants with boundary conditions. The next phase (Mechanism Mining) studies how reality resolves these tensions. Proceed?"

Do not proceed if invariants are domain-specific (only from the target domain).

---

## Phase 4: Mechanism Mining

### Goal
Study how reality resolves the tensions you identified. Mechanisms are processes or structures that manage tradeoffs. Nature, society, and technology have already developed solutions — your job is to find and understand them.

### Interview Questions (Inversion Pattern)

Ask **one at a time**, wait for an answer.

1. "For each tension, how does the real world handle it? What mechanism or process exists that keeps the system from collapsing into either extreme?"
2. "Is there a mechanism that addresses more than one tension?"
3. "What is the function of this mechanism — what does it actually achieve?"
4. "When does this mechanism break down?"
5. "Are there known failure modes where this mechanism causes more harm than good?"

### Output Requirements

Document each mechanism with:
- **Name** — Short label
- **Function** — What it achieves
- **Related tensions** — Cross-reference to Phase 2 IDs
- **Related invariants** — Cross-reference to Phase 3 IDs
- **Explanation** — How it works (3-5 sentences)
- **Failure modes** — When it breaks

**Required:** At least 3 mechanisms. Each must map to at least one tension from Phase 2.

### Gate Condition

Confirm: "You have identified [N] mechanisms mapped to your tensions and invariants. The next phase (System Synthesis) combines everything into a coherent model. Proceed?"

Do not proceed unless each mechanism is mapped to at least one tension.

---

## Phase 5: System Synthesis

### Goal
Combine tensions, invariants, and mechanisms into a coherent system model. This is where separate discoveries become a unified understanding. Identify which tensions are primary, which mechanisms are essential, and what failure modes exist.

### Interview Questions (Inversion Pattern)

Ask **one at a time**, wait for an answer.

1. "Of all the tensions you identified, which is the most fundamental — the one that drives the others?"
2. "How do the mechanisms interact? Do they reinforce each other or compete?"
3. "What is the minimal set of components that explains the system's behavior?"
4. "What behaviors would you expect from this model?"
5. "What failure modes does this model predict?"

### Output Requirements

Document the system model with:
- **Core tensions** — The primary tensions driving the system
- **Core invariants** — Principles that govern system behavior
- **Core mechanisms** — The essential mechanisms
- **Expected behaviors** — What the model predicts
- **Failure modes** — What breaks and under what conditions

### Gate Condition

Confirm: "You have a coherent system model with core tensions, invariants, mechanisms, and failure modes. The next phase (Algorithm Synthesis) derives computational representations from the mechanisms. Proceed?"

---

## Phase 6: Algorithm Synthesis

### Goal
Derive algorithm candidates from the mechanisms, not from first principles. Algorithms are computational representations of how reality resolves tensions. If your mechanisms are well understood, the algorithm should emerge naturally.

### Interview Questions (Inversion Pattern)

Ask **one at a time**, wait for an answer.

1. "If the mechanism from Phase 4 were a computational process, how would it work?"
2. "What data structures would represent the forces and tensions?"
3. "What would the input and output look like?"
4. "How would we measure success or failure?"
5. "What would a minimal viable implementation look like?"

**Critical constraint:** If the user proposes algorithms before Phase 5 is complete, remind: "Algorithms are downstream of understanding. Let's complete the system model first, then derive algorithms from it."

### Output Requirements

Document each algorithm candidate with:
- **Core idea** — One-paragraph description
- **Mathematical representation** — Formal description
- **Advantages** — What makes it better than alternatives
- **Limitations** — Known constraints and edge cases
- **Relationship to mechanisms** — Which mechanism(s) the algorithm represents

### Gate Condition

Confirm: "You have [N] algorithm candidates derived from the mechanisms. The final phase (Destruction Phase) attacks your model to find its weaknesses. Proceed?"

Do not proceed if algorithms are proposed without clear mapping to Phase 4 mechanisms.

---

## Phase 7: Destruction Phase

### Goal
Attack the entire model. Assume it is wrong. Your job is to find:
1. Weak assumptions — what did you assume that might be false?
2. Missing tensions — what forces did you overlook?
3. Missing invariants — what principles did you miss?
4. Missing mechanisms — what processes did you ignore?
5. Possible redesigns — based on failure analysis, how would the system change?

### Interview Questions (Inversion Pattern)

Ask **one at a time**, wait for an answer.

1. "What is the single most questionable assumption in your model?"
2. "If this model is wrong, what would prove it?"
3. "What tension might you have missed entirely?"
4. "What edge case would break the system?"
5. "If you had to redesign the system based on this failure analysis, what would you change?"

### Output Requirements

Document the failure analysis:
- **Weak assumptions** — At least 3
- **Missing tensions** — At least 2
- **Missing invariants** — At least 1
- **Missing mechanisms** — At least 2
- **Possible redesigns** — At least 2 concrete proposals based on the failure analysis

### Gate Condition

Confirm: "You have completed the destruction phase with [N] weakness identified. Let me apply the quality rubric to evaluate the overall analysis. Shall I proceed to self-evaluation?"

After confirmation, load `references/quality-rubric.md` and evaluate the analysis across D1-D5 dimensions. Append the rubric scores to the output.

---

## Pipeline Governance

### Execution Rules

1. **Strict ordering**: Execute phases 1-7 in order. Do not skip.
2. **No reading ahead**: Load only the section for the current phase.
3. **Inversion discipline**: For each phase, ask the interview questions one at a time. Wait for the user's response before proceeding.
4. **Gate enforcement**: Do not proceed to the next phase until the gate condition for the current phase is met.
5. **Error handling**: If a gate condition cannot be met after two attempts, document the partial output and ask the user whether to proceed or abort.

### Permitted Deviations

- **3-Phase Lightweight**: If the user explicitly confirms time constraints, a lighter analysis covering Phases 1-3 is acceptable. This must be explicitly acknowledged, not silently assumed.
- **Deep Dive**: Any single phase can be extended with additional interview questions if the user shows particular interest.

### Prohibited Behaviors

- Do not read multiple sections of this file at once.
- Do not skip a gate condition because "it's obvious."
- Do not propose algorithms before Phase 6.
- Do not omit the Destruction Phase under any circumstances.