# Anti-Shell Self-Check Checklist

The executable reference for the protocol's Step 5. Each check has: the question, what constitutes failure, bad/good examples, and recovery instructions.

---

## The Five Checks

### Check 1: Survival Condition

**Question**: Does every node have a concrete, observable survival condition?

**Fail condition**: Any node lacks a "Alive if" / "Dead if" pair, or the condition is not observable (e.g., "the team works hard").

**Bad example**: "User authentication — alive if implemented correctly."
**Good example**: "User authentication — alive if: 50 users register and log in within the first week. Dead if: more than 10% of login attempts fail."

**Recovery**: For each node without a survival condition, either:
- Write the condition (Alive if / Dead if in concrete terms), or
- Delete the node. If you cannot write a condition, you do not understand the node well enough to include it.

---

### Check 2: Jargon

**Question**: Does the output contain phrases that consume space without creating knowledge?

**Fail condition**: Presence of any of these patterns without concrete translation:
- "Leverage best practices"
- "Implement robust architecture"
- "Ensure scalability"
- "Optimize user experience"
- "Synergize" / "streamline" / "holistic approach"
- Any phrase that sounds impressive but cannot be translated into a specific action

**Bad example**: "We need to leverage our core competencies to optimize the user experience."
**Good example**: "We need to reduce the onboarding flow from 5 steps to 2 steps."

**Recovery**: For each jargon phrase found:
- Translate it into a concrete action or measurable outcome
- If it cannot be translated, delete it
- If the node becomes empty after deletion, delete the node

---

### Check 3: Uncertainty Ratio

**Question**: Is Yellow + Red at least 30% of all nodes?

**Fail condition**: Yellow + Red < 30% of total mapped elements.

**Bad example**: 10 elements — 8 Green, 1 Yellow, 1 Red (Green = 80%, Yellow+Red = 20%).
**Good example**: 10 elements — 3 Green, 4 Yellow, 3 Red (Green = 30%, Yellow+Red = 70%).

**Note**: This is the complement of the 70% rule in Step 2. Green ≤ 70% is equivalent to Yellow+Red ≥ 30%. The threshold is an empirical heuristic, not a calibrated metric. If you have strong evidence that a different ratio is more honest for your specific context, use that instead.

**Recovery**:
- Return to Step 1 and check if the Honesty Fuse was executed properly
- Re-examine each Green node: is it genuinely unambiguous, or is it "Green because it should be"?
- If Green nodes are genuinely known, the project may be simpler than you thought — but this is rare for ambitious projects

---

### Check 4: Honesty

**Question**: Is there at least one explicit, unhidden "I don't know" in the output?

**Fail condition**: No visible "I don't know" statement. The output reads as if the executor is confident about everything.

**Bad example**: "The recommendation system will use collaborative filtering with fallback to content-based methods."
**Good example**: "I don't know whether collaborative filtering will work for this niche because we don't have user behavior data yet."

**Recovery**:
- Scan the entire output for every statement that implies certainty
- For each such statement, ask: "What would it take for this to be wrong?"
- If you can name a specific way it could be wrong, add an "I don't know" for that dimension
- If you cannot name a specific way it could be wrong, the statement may be true — but it may also be an assumption you haven't examined

---

### Check 5: Actionability

**Question**: Can the user name the very first concrete step to take, starting this afternoon?

**Fail condition**: The first step cannot be stated in one sentence. It requires research, exploration, or "let me think about it."

**Bad example**: "Begin researching the market landscape."
**Good example**: "Email 5 people in [specific community] and ask them [specific question]."

**Recovery**:
- If the first step requires research, reformulate it as a specific probe
- If the first step requires a decision, identify the smallest test that would inform that decision
- If the first step cannot be stated in one sentence, the decomposition is too abstract — return to Step 3

---

## Per-Position Adaptation

| Check | Technical Architect | Non-technical Founder | Decision-maker | Research Thinker |
|-------|-------------------|----------------------|----------------|-----------------|
| **1. Survival Condition** | Check for numerical thresholds (latency, throughput, error rate) | Check for human-observable behavior (sign-ups, retention, manual process completion) | Check for capital-observable milestones (revenue, cost, conversion) | Check for falsifiability criteria (p-value, error bound, proof of concept) |
| **2. Jargon** | Watch for: "scalable architecture", "best practices", "microservices", "cloud-native" | Watch for: "AI-powered", "blockchain", "synergy", "disruptive" | Watch for: "value proposition", "market fit", "economies of scale" | Watch for: "state-of-the-art", "novel approach", "significant improvement" |
| **3. Uncertainty Ratio** | Default: 30%. If the project is pure engineering, may be lower. | Default: 30%. If the project involves user behavior, should be higher (50%+). | Default: 30%. If the project involves market risk, should be higher (40%+). | Default: 40%. Research projects have inherently higher uncertainty. |
| **4. Honesty** | The "I don't know" should be about technical uncertainty | The "I don't know" should be about user behavior or market demand | The "I don't know" should be about return on investment | The "I don't know" should be about mathematical or empirical uncertainty |
| **5. Actionability** | First step: a concrete technical probe (build a prototype, run a benchmark) | First step: a human interaction (talk to 5 people, send 10 emails) | First step: a capital allocation (spend $X on Y, schedule one meeting) | First step: a calculation or experiment (run simulation, write proof) |

---

## Resolution Procedure

When a check fails, use this table to identify the corresponding protocol step for correction.

| Check Failure | Likely Root Cause | Return to Step | Correction |
|---------------|-------------------|----------------|------------|
| Survival Condition missing | Step 2 (elements too large or vague) or Step 3 (decomposition too shallow) | Step 2 | Break elements down until each can have a survival condition |
| Jargon found | Step 3 (translation to concrete terms skipped) | Step 3 | Re-express each node in plain language |
| Uncertainty ratio fails | Step 1 (Honesty Fuse was weak) | Step 1 | Re-execute the Honesty Fuse with stricter standards |
| Honesty check fails | Step 1 (commitment to honesty was not absolute) | Step 1 | Force an explicit "I don't know" before proceeding |
| Actionability fails | Step 3 (tree is too abstract) or Step 4 (budget is not specific enough) | Step 3 | Identify the root node of the tree and assign a concrete first probe |

After correction, re-run all five checks. Repeat until all pass.