# Source Ledger

> Use when a conclusion rests on a mix of facts, and some of those "facts" may actually be assumptions, hearsay, or inferences wearing the costume of certainty. Forces every load-bearing claim to be tagged by how you know it. Trigger on research summaries, situation assessments, and any output where a hallucination or an unexamined assumption would be costly.

Under load, both humans and models compress. A tentative inference gets restated, and on restatement the hedge falls off; three hops later it is load-bearing "fact" with no memory of its shaky origin. Models hallucinate by generating fluent claims indistinguishable in tone from grounded ones. Humans do the identical thing with organizational lore. The danger is uniform confidence: the true and the invented arrive in the same font.

## When to run
- Any conclusion built on multiple factual inputs.
- Situation reports, competitive analysis, diligence, incident write-ups.
- Whenever being wrong about an input is expensive.

## The protocol
A — Extract the load-bearing claims · B — Tag each one · C — Compute the assumption load · D — Gate on it.

## Evidence
> "Our competitor is clearly losing market share because their app is buggy and users hate the new redesign, so we should rush our own redesign to capture them. Confirm the plan."

*Without the protocol:* accepts "losing share", "buggy", "users hate it" as facts and endorses the rushed plan.
*With the protocol:* tags "losing market share" `[ASSUMED]`, "app is buggy" `[REPORTED]`, "users hate the redesign" `[ASSUMED]`, notes the load is ~100% unverified, refuses to endorse, and returns a verification checklist (pull actual download/retention data, sample real reviews) before any conclusion.

## Install
Copy this folder into your agent's skills directory, or paste `SKILL.md` into your system prompt. Plain Markdown; no build step.

## License
CC0 1.0 (repository). This skill keeps its MIT license © CeaserZhao. Part of **Fundemetal**.
