# Decomposer Field Guide

How the protocol surfaces in specific contexts. This is application-layer, not core protocol. Read PROTOCOL.md first.

---

## Annotation 1: TRAE Skill

### What Changes

The protocol itself is unchanged. A TRAE Skill is a thin wrapper that does three things:

1. **Trigger detection**: The SKILL.md `description` field contains keywords that cause TRAE to invoke the skill when a user describes a large, ambiguous, or uncertain project.

2. **Output formatting**: The protocol's uncertainty map is rendered in Markdown within the TRAE conversation. The format is conversation-native — not a separate document, but part of the dialogue flow.

3. **Hard-gate enforcement**: TRAE's instruction-following capability is used to prevent the AI from skipping the Honesty Fuse or producing module lists before the mapping is complete.

### What Stays the Same

All five steps. The 70% rule. The hard constraint on confidence without survival conditions. The five self-checks. The anti-jargon rule. The two metrics (honesty, actionability). The protocol adapts to the user's cognitive position; the TRAE Skill must detect or ask about that position and route accordingly.

### Implementation Notes

- The SKILL.md should be short. It should point to PROTOCOL.md's logic, not duplicate it.
- The `description` should include trigger phrases like: "decompose this project," "help me figure out what I don't know," "this is too big and I don't know where to start," "avoid empty plan," "honest breakdown."
- The skill should not produce files by default. The uncertainty map lives in the conversation. If the user wants it saved, that is their choice.

---

## Annotation 2: Twitter Long-Form Essays

### What Changes

The protocol's output (an actionable uncertainty map) becomes the structural backbone of a Twitter essay. The mapping is direct:

- **The Honesty Fuse** → The opening of the essay. State the limits of what you know. Make the reader slightly uncomfortable immediately. This is the hook — not clickbait, but the discomfort of encountering someone who refuses to perform confidence.

- **The Uncertainty Map** → The body of the essay. Each node in the map becomes a section. Green zones get concise treatment ("this works, here's why"). Yellow zones get extended treatment ("here's what we know, here's what we don't, here's how we'd find out"). Red zones get the most dramatic treatment — "here is where I am completely blind, and here is why that blindness matters."

- **Survival Conditions** → The "so what" of each section. Every claim in the essay must have a testable implication. If a reader finishes a section and cannot answer "how would I know if this is wrong?", the section failed.

- **The Self-Check** → The essay's conclusion. Restate the honest gaps. Name one thing you genuinely don't know. End with the first concrete action, not with a summary.

### What Stays the Same

The five-step protocol runs before any writing begins. You do not write the essay and then apply the protocol to it. You execute the protocol on the *topic*, and the essay is the rendered form of the resulting uncertainty map.

### The Key Insight

A Decomposer-style Twitter essay is not a "hot take." It is a structured act of intellectual honesty performed in public. The value to the reader is not the conclusion — it is the *process*. Watching someone think honestly about a complex topic is rare. That rarity is the content.

### Structural Template

```
[Hook — Honesty Fuse in public form]
"I don't know X. Here's what I do know. Here's what kills this entire line of thinking if it's wrong."

[Body — Uncertainty map rendered as narrative]
"Let me map what I can see."
— Green: "This part is clear. [1-2 sentences]"
— Yellow: "This part is fuzzy. [extended treatment with the specific question that needs answering]"
— Red: "And here — I'm completely blind. [why this blindness matters]"

[Turn — The cognitive dependency]
"But here's the thing. [Node A] doesn't matter until we know [Node B]. The real question is..."

[Action — The first step]
"If you want to test this yourself, the first thing to do is [specific action]. Not 'research.' Not 'think about it.' [Concrete step]."

[Closing — Explicit honesty]
"One thing I genuinely don't know: [specific gap]. If you know, tell me."
```

### Constraints

- The essay must contain at least one explicit "I don't know." If it doesn't, it's a standard opinion piece, not a Decomposer essay.
- The essay must name a specific, testable survival condition for its central claim. If the central claim cannot be falsified, the essay should not exist.
- The essay must end with a concrete action, not a summary. Summaries are for reports. Decomposer outputs are maps.

---

## Annotation 3: Human Self-Execution (Pen and Paper)

### What Changes

Nothing. The protocol is cognitive — it runs in your head. It does not require an AI.

A human can execute all five steps alone using a whiteboard, sticky notes, and colored markers. The mapping is direct:

- **Step 1**: Write the three Honesty Fuse declarations on a sticky note. Stick it at the top of the board. If you cannot write all three, you are not ready to decompose yet.
- **Step 2**: Write each element on its own sticky note. Use three colors: green for Green Zone, yellow for Yellow Zone, red for Red Zone. If you run out of red notes, you are probably overconfident.
- **Step 3**: Rearrange the sticky notes into a tree. Draw arrows for dependencies. If a note has no arrow pointing to it and no arrow pointing away, decide whether it is an independent leaf (keep) or noise (remove).
- **Step 4**: On each sticky note, write two lines: "Alive if: [X]. Dead if: [Y]." If you cannot write both, mark the note as Blind Zone and move it to the edge of the board.
- **Step 5**: Run the five checks. For each check that fails, identify the corresponding step and correct the board. Repeat until all five pass.

### What Stays the Same

All five steps. All constraints. The 70% rule. The hard constraint on confidence without survival conditions. The five self-checks. The two metrics.

### Time Estimate

A first pass through all five steps takes approximately one hour for a moderately complex project. Subsequent iterations on the same project take 15-30 minutes, depending on how much new information you have.

### What This Proves

The protocol does not depend on AI. It is a cognitive tool, not a software tool. The AI-assisted version (TRAE Skill) and the Twitter essay version are conveniences, not requirements. If you have a whiteboard, sticky notes, and an hour, you can apply the Decomposer protocol.

---

## Annotation 4: General Notes

### The Protocol Does Not Need More Annotations to Be Useful

The annotations above (TRAE Skill, Twitter essays, Human Self-Execution) are the ones we have concrete use for today. The protocol works in any context where someone needs to think honestly about a complex problem. A team lead presenting to stakeholders. A researcher writing a grant proposal. A founder pitching investors. A person making a life decision.

The protocol is the same. Only the rendering changes.

### If You Add New Annotations

Each annotation should answer exactly one question: *"When using the Decomposer protocol in context X, what changes and what stays the same?"*

Keep it short. The protocol is the star. Annotations are footnotes.