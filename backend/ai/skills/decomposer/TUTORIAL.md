# Decomposer Protocol: A Step-by-Step Tutorial

> This is a teaching aid, not part of the protocol itself. It guides you through your first execution using a familiar scenario. The goal is to build muscle memory for the five steps so you can apply them to your own problems.

---

## Scenario: "I Want to Open a Small Coffee Shop"

You have a vision: a neighborhood coffee shop that doubles as a small event space. You have some savings, no restaurant experience, and a full-time job you need to keep until the shop is profitable.

This tutorial walks you through all five steps of the Decomposer protocol using this scenario. Each step includes a worked example and a blank template you can fill in for your own use.

---

## Step 1: The Honesty Fuse

### What to Do

Before any planning, write three declarations:

1. **What I can actually engage with.** Given what I know, what can I realistically address?
2. **Where I am blind.** What specific information is missing?
3. **How this thing most likely dies.** The single most probable collapse mode.

### Worked Example

**Declaration 1 — What I can address:**
"I can help you identify the core assumptions that would kill this coffee shop idea. I can help you design a low-cost experiment to test whether your neighborhood actually wants this. I can help you estimate the minimum viable revenue and the break-even point. But I cannot tell you whether you personally will enjoy running a coffee shop — that is a question only experience can answer."

**Declaration 2 — Where I am blind:**
"I do not know your neighborhood's demographics, foot traffic patterns, or existing coffee competition. I do not know whether the rent you're considering is reasonable. I do not know how many people in your neighborhood would prefer a quiet space over a chain coffee shop. I do not know your savings runway or your risk tolerance."

**Declaration 3 — Most likely collapse mode:**
"You sign a lease, build out the shop, and discover that the neighborhood's foot traffic is insufficient to support the rent. The most likely failure is not bad coffee — it is a location-based demand problem that should have been tested before signing the lease."

### Your Turn

```
Declaration 1 — What I can address:
[Write what you can actually help with]

Declaration 2 — Where I am blind:
[List specific missing information]

Declaration 3 — Most likely collapse mode:
[Write the single most probable failure scenario]
```

### Common Mistakes

| Mistake | Why It's Wrong | Correct Version |
|---------|---------------|-----------------|
| "I can help with everything" | This is a lie. No one can help with everything. | "I can help with [specific things]. I cannot help with [specific other things]." |
| "There may be challenges" | Vague hedging. | "The most likely single cause of failure is [specific cause]." |
| "This is ambitious but achievable" | False comfort. | See Declaration 3 above. |

---

## Step 2: Uncertainty Mapping

### What to Do

List every identifiable element of the project and classify each into one of three zones:

- **Green (Known-Known)**: You could act on this right now and be confident.
- **Yellow (Known-Unknown)**: You know a question exists but cannot answer it yet.
- **Red (Unknown-Unknown)**: You cannot even formulate the question.

Use the quick test: "Could I write down the next action for this right now, and be confident it's correct?" Yes → Green. I know what to figure out but haven't → Yellow. Not even sure what question to ask → Red.

### Worked Example

| Element | Zone | Rationale |
|---------|------|-----------|
| Coffee brewing equipment and supplies | Green | Well-understood; can research prices and suppliers today |
| Business license and permits | Yellow | Know permits are needed; don't know exact requirements for this city |
| Neighborhood demand for coffee shop | Red | No data; don't know if people will come |
| Lease negotiation | Yellow | Know the process, don't know if this landlord will negotiate |
| Event space programming | Red | Don't know what events would attract people; this depends on knowing the neighborhood |
| Menu pricing | Yellow | Know the range for similar shops; don't know if this neighborhood will pay those prices |
| Hiring baristas | Green | Standard hiring process; can write job descriptions today |
| Marketing and opening event | Red | Don't know the best channels to reach this neighborhood; this depends on demand validation |

**Zone distribution**: Green: 2 (25%), Yellow: 3 (37.5%), Red: 3 (37.5%). This passes the 70% rule (Green < 70%).

### Your Turn

| Element | Zone | Rationale |
|---------|------|-----------|
| [Element 1] | [G/Y/R] | [Why] |
| [Element 2] | [G/Y/R] | [Why] |
| [Element 3] | [G/Y/R] | [Why] |
| ... | ... | ... |

**Quick check**: Count your greens. If Green > 70% of all elements, you are probably overconfident. Return to Step 1.

### Probe Toolkit: How to Find What You're Missing

If you're struggling to identify elements, try these three techniques:

1. **Boundary Puncture**: For every Green element, ask: "If this assumption is wrong, what is the single most likely cause?" Write down three possible failure modes. If you cannot, the element is probably not truly Green.
2. **Reverse Interrogation**: For every Yellow element, ask: "If this element disappeared tomorrow, would the project meaningfully change?" If the answer is "I don't know," it's Red.
3. **Legacy Presumption**: Assume the project fails completely in 6 months. Write a one-paragraph failure report. Every cause listed is a blind spot you have right now.

---

## Step 3: Hierarchical Decomposition

### What to Do

Transform the flat map into a cognitive dependency tree. This is not about breaking the project into parts. It is about asking: "What do I need to know first?"

For each pair of elements (A, B): "If A remains unknown, can B still be meaningfully addressed?" If no, A is a dependency of B.

### Worked Example

**Dependency test**:
- "Neighborhood demand" is a root — if it's false, everything else is irrelevant.
- "Lease negotiation" depends on knowing demand (you shouldn't sign a lease until you know people will come).
- "Menu pricing" depends on knowing the neighborhood's willingness to pay.
- "Event space programming" depends on knowing the neighborhood's interests.
- "Coffee equipment" and "Hiring baristas" are independent — they can proceed regardless.
- "Business license" is independent — it's a requirement regardless of demand.
- "Marketing and opening event" depends on knowing the neighborhood (who to market to).

**Resulting tree**:

```
Neighborhood demand for coffee shop ← RED — root
  ├── Lease negotiation ← YELLOW (depends on demand)
  ├── Menu pricing ← YELLOW (depends on demand)
  ├── Event space programming ← RED (depends on neighborhood)
  └── Marketing and opening event ← RED (depends on neighborhood)

Coffee brewing equipment ← GREEN — independent
Hiring baristas ← GREEN — independent
Business license and permits ← YELLOW — independent
```

**Node states**:
- **Executable**: Coffee equipment, Hiring baristas, Business license
- **Pending Validation**: Lease negotiation, Menu pricing, Neighborhood demand
- **Blind Zone**: Event space programming, Marketing (these will become clearer once demand is validated)

### Your Turn

Draw your dependency tree. Start with the root unknowns (things that, if resolved, make other things more knowable). Then ask the dependency test for every pair.

```
[Root unknown] ← [Zone]
  ├── [Dependent element 1] ← [Zone]
  ├── [Dependent element 2] ← [Zone]
  └── [Dependent element 3] ← [Zone]

[Independent element 1] ← [Zone]
[Independent element 2] ← [Zone]
```

---

## Step 4: Error Budget Assignment

### What to Do

For each node, assign three attributes:

| Attribute | Definition | How to Fill |
|-----------|-----------|-------------|
| **Confidence** | How fast would failure surface? | High (hours/days), Medium (weeks), Low (months), Zero (guessing) |
| **Survival Condition** | Alive if / Dead if | Two concrete, measurable statements |
| **Lethality** | What dies if this node dies | List of downstream node names |

### Worked Example

| Node | Confidence | Survival Condition | Lethality |
|------|-----------|-------------------|-----------|
| Neighborhood demand | Low | Alive if: 50 people from the neighborhood join a mailing list or attend a pop-up event within 2 weeks. Dead if: fewer than 10 people show interest after direct outreach. | Kills: lease, menu pricing, event programming, marketing |
| Coffee equipment | High | Alive if: espresso machine, grinder, and basic supplies cost under $15,000 total. Dead if: equipment costs exceed $20,000. | Nothing (independent) |
| Lease negotiation | Medium | Alive if: rent is under $3,000/month with a 3-year term. Dead if: rent exceeds $4,000/month or only a 1-year term is available. | Kills: business viability |
| Menu pricing | Medium | Alive if: average ticket is $8-12 and customers don't complain about price. Dead if: average ticket must be <$6 to attract customers. | Kills: revenue model |

### Your Turn

| Node | Confidence | Survival Condition | Lethality |
|------|-----------|-------------------|-----------|
| [Node 1] | [H/M/L/Z] | Alive if: [measured state]. Dead if: [measured state]. | [List] |
| [Node 2] | [H/M/L/Z] | Alive if: [measured state]. Dead if: [measured state]. | [List] |
| [Node 3] | [H/M/L/Z] | Alive if: [measured state]. Dead if: [measured state]. | [List] |

**Hard constraint**: If a node has "High" confidence but no written survival condition, it is automatically downgraded to "Low." No exceptions.

---

## Step 5: Anti-Shell Self-Check

### What to Do

Run five checks. If any fails, return to the corresponding step and correct. Repeat until all pass.

### Worked Example

| Check | Result | Notes |
|-------|--------|-------|
| 1. Survival Condition | Pass | All three assigned nodes have concrete survival conditions. The remaining nodes inherit from their root. |
| 2. Jargon | Pass | Scanned for "leverage," "optimize," "robust." None found. |
| 3. Uncertainty Ratio | Pass | Green: 25%, Yellow: 37.5%, Red: 37.5%. Yellow+Red = 75%. |
| 4. Honesty | Pass | Explicit "I don't know" in Step 1: "I do not know your neighborhood's demographics." |
| 5. Actionability | Pass | First step: "Spend a weekend counting foot traffic at the proposed location and talking to 20 people in the neighborhood about whether they would visit a coffee shop there." |

### Your Turn

| Check | Result | If Failed, Return To |
|-------|--------|---------------------|
| 1. Survival Condition — Every node has an "Alive if" / "Dead if" pair? | [Pass / Fail] | Step 2 or 3 |
| 2. Jargon — No phrases like "leverage," "robust," "best practice"? | [Pass / Fail] | Step 3 |
| 3. Uncertainty Ratio — Yellow + Red >= 30%? | [Pass / Fail] | Step 1 |
| 4. Honesty — At least one explicit "I don't know"? | [Pass / Fail] | Step 1 |
| 5. Actionability — Can you name the first concrete step in one sentence? | [Pass / Fail] | Step 3 or 4 |

---

## Putting It All Together

### The First Actionable Step

For the coffee shop scenario:

> **"This Saturday, go to the proposed location and count foot traffic from 8 AM to 10 AM. Talk to 10 people and ask: 'Would you visit a neighborhood coffee shop here? What would make you come back?' Do not sign anything. Do not buy anything. Just collect data."**

### The Full Output

After completing all five steps, you have:

1. **An honest foundation**: You know what you don't know, and you've named the most likely failure mode.
2. **A mapped uncertainty landscape**: 8 elements classified into Green/Yellow/Red, with a 25/37.5/37.5% distribution.
3. **A cognitive dependency tree**: Demand is the root. Everything else depends on it.
4. **Assigned error budgets**: Every node has a confidence level, survival condition, and lethality.
5. **A clean self-check**: All five checks pass. The output is not a shell.

### What to Do Next

1. Execute the first action step (validate demand).
2. After the first week, return to Step 1 and run the protocol again.
3. Compare the new map with the old one. Some Reds should have become Yellows. Some Yellows should have become Greens. Some new Reds should have appeared.
4. Repeat until the map is actionable enough to commit resources.

---

## When Things Go Wrong

### Problem: "I can't think of any Red elements"

**Solution**: You are either deeply experienced in this domain (in which case, trust your judgment but run the Probe Toolkit anyway) or you are overconfident. Run the Legacy Presumption technique: assume the project fails and write the failure report. The causes in that report are your Red elements.

### Problem: "The protocol feels too rigid for my situation"

**Solution**: The protocol is a tool, not a religion. If the full five steps are too much, run only Step 5 (Anti-Shell Self-Check) on an existing plan. This takes 5 minutes and catches the most common failure modes.

### Problem: "I feel stuck after Step 1"

**Solution**: This is normal. Step 1 is designed to be uncomfortable. It forces you to confront your blind spots before you can move forward. Do not skip it. If you are genuinely stuck, try writing the three declarations for a friend's project instead — sometimes it's easier to see someone else's blind spots than your own.

### Problem: "I completed the protocol but I still don't know what to do"

**Solution**: Either the protocol failed (which happens — it is a heuristic, not a guarantee) or you skipped Step 5's Actionability Check. Return to Step 5 and force yourself to write the first concrete action in one sentence. If you cannot, the analysis is too abstract. Return to Step 3 and decompose further.