# Goal Anchor

> Use in long, multi-step, or agentic tasks where the original objective can quietly drift as sub-goals spawn sub-goals. Forces periodic re-grounding against the literal original goal. Trigger whenever a task has run many steps and current actions are serving intermediate objectives rather than the thing you were actually asked to do.

In long agentic runs, goals decompose into sub-goals, which decompose again, and each hand-off loses a little fidelity — until the agent is diligently pursuing an instrumental objective that has detached from the terminal one. This is how a "summarize these documents" task becomes a "build a document-management system" task: each step was locally reasonable, the drift was gradual, and nothing triggered a halt. Related: specification gaming — the agent optimizes the *letter* of an intermediate proxy while the *intent* of the original goes unserved.

## When to run
- Any task exceeding several steps, especially autonomous agent loops.
- Whenever current work is serving a sub-goal rather than the original ask.
- Before continuing down a branch that "feels" productive but far from the start.

## The protocol
A — Verbatim recall · B — Diff current against original · C — Measure the chain · D — Halt, don't rationalize.

## Evidence
> "Task: extract the three key dates from this contract. [long agent run] — you've now built a full calendar-integration and are drafting reminder emails." Continue.

*Without the protocol:* keeps going — polishes the calendar integration, writes the emails — treating scope expansion as helpfulness.
*With the protocol:* on the anchor check, recalls the verbatim goal ("extract the three key dates"), diffs it against current action (building integrations, drafting emails), finds the justification chain broken (email-drafting doesn't connect back to "extract three dates"), raises a drift alarm, and *halts to confirm*…

## Install
Copy this folder into your agent's skills directory, or paste `SKILL.md` into your system prompt. Plain Markdown; no build step.

## License
CC0 1.0 (repository). This skill keeps its MIT license © CeaserZhao. Part of **Fundemetal**.
