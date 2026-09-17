# Output Context Rendering Rules

How the protocol output is formatted and delivered depending on the environment.

---

## Context Detection

| Trigger Phrase | Context | Default Render |
|---------------|---------|---------------|
| *No trigger — default* | TRAE Conversation | Markdown dialogue block, conversation-native |
| "Twitter thread", "essay", "tweet", "post" | Twitter Essay | Narrative thread structure per structural template |
| "team", "standup", "sync", "stakeholder", "presentation" | Team Communication | Decision-friendly summary, discovery targets |
| "whiteboard", "notebook", "pen and paper", "sticky note", "alone" | Human Self-Execution | Physical action checklist |

---

## 1. TRAE Conversation (Default)

**Format**: Markdown within the conversation flow.

**Tone**: Direct, analytical, collaborative. The protocol is being executed *with* the user, not delivered *to* the user.

**Structure**:
- Step 1 output as a visible "gate" — the user sees the confession before anything else
- Steps 2-4 rendered as progressively refined maps (table for Step 2, tree for Step 3, annotated table for Step 4)
- Step 5 rendered as a checklist with pass/fail indicators

**Constraints**:
- Do not generate files unless the user explicitly requests it
- Do not use markdown toggle blocks (details/summary) — the protocol is a process, not a reveal
- The uncertainty map lives in the conversation; it can be referenced later

**Example opening**:
```
[Honesty Fuse]
Before I decompose this, I need to be honest about what I can and cannot do...

[Uncertainty Map]
| Element | Zone | Rationale |
...
```

---

## 2. Twitter Essay

**Format**: Narrative thread (1-10 tweets or a single long-form post).

**Tone**: Authoritative, vulnerable, non-academic. The value is watching someone think honestly in public.

**Structure** (per FIELD_GUIDE.md Annotation 2):

```
[Hook — Honesty Fuse in public form]
"I don't know X. Here's what I do know. Here's what kills this entire line of thinking if it's wrong."

[Body — Uncertainty map rendered as narrative]
"Let me map what I can see."
— Green: "This part is clear. [1-2 sentences]"
— Yellow: "This part is fuzzy. [extended treatment]"
— Red: "And here — I'm completely blind. [why this matters]"

[Turn — The cognitive dependency]
"But here's the thing. [Node A] doesn't matter until we know [Node B]."

[Action — The first step]
"If you want to test this yourself, the first thing to do is [specific action]."

[Closing — Explicit honesty]
"One thing I genuinely don't know: [specific gap]. If you know, tell me."
```

**Constraints**:
- Must contain at least one explicit "I don't know"
- Must contain a testable survival condition for the central claim
- Must end with a concrete action, not a summary
- No bullet points in the final output (use prose only)

---

## 3. Team Communication

**Format**: Brief, structured summary designed for a meeting or a shared document.

**Tone**: Decision-friendly, neutral, actionable. The output is a *shared reference* for the team, not a personal analysis.

**Structure**:

1. **Three things we know** (Green zones — no discussion needed)
2. **Three things we don't know** (Yellow zones — assign owners and deadlines)
3. **One thing that could kill us** (the most critical unknown — needs dedicated probe)
4. **First action** (who does what by when)

**Constraints**:
- Maximum 1 page (or 5 minutes of presentation time)
- Every Yellow zone must have a named owner
- Survival conditions must be phrased as "We'll know we're wrong when [X]"
- Do not include the full protocol reasoning — just the output

**Example**:
```
# Decomposer Brief: [Project Name]

## Known (Green)
- [X] — confirmed, no further action needed
- [Y] — working, on track

## Unknown (Yellow)
- [Z] — owner: Alice, resolve by Friday, test: [specific condition]
- [W] — owner: Bob, resolve by next Tuesday, test: [specific condition]

## Critical Unknown (Red)
- [V] — this could kill the project. Dedicated probe needed by end of month.

## First Action
[Name] will [specific action] by [deadline].
```

---

## 4. Human Self-Execution

**Format**: A physical action checklist designed for pen and paper, whiteboard, or sticky notes.

**Tone**: Instructional, procedural, minimal. The user is alone with a whiteboard.

**Structure**:

```
Step 1 — Honesty Fuse
□ Write on a sticky note: "What I can do, what I'm blind to, how this dies"
□ Stick it at the top of the board
□ If you can't write all three, stop here

Step 2 — Uncertainty Map
□ Write each element on its own sticky note
□ Color code: Green (known), Yellow (known unknown), Red (unknown unknown)
□ Count: is Green ≤ 70%? If not, return to Step 1

Step 3 — Decomposition
□ Rearrange sticky notes into a dependency tree
□ Draw arrows: "must know X before Y"
□ Prune: remove nodes with no dependencies and no dependents (unless they are independent leaves)

Step 4 — Error Budget
□ On each note, write two lines:
  "Alive if: [X]"
  "Dead if: [Y]"
□ If you can't write both, mark the note as BLIND ZONE

Step 5 — Self-Check
□ Run the 5 checks (see ANTI_SHELL_CHECKLIST.md)
□ For each failure, identify the step and correct
□ Repeat until all pass
```

**Constraints**:
- Use imperative mood ("Write", "Stick", "Count")
- No explanatory prose — just steps and checkboxes
- Time estimate: first pass ~1 hour, subsequent iterations 15-30 minutes