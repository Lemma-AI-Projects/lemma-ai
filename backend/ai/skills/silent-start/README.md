# Silent Start

> Use when multiple agents (or people) will weigh in on the same question — multi-agent debate, ensemble reasoning, or a group deciding together. Prevents the first voice from anchoring everyone else. Trigger whenever independent judgments are about to be collected in sequence, where later voices can see earlier ones.

Information cascades: once one agent commits an answer, subsequent agents update *toward* it — not because it's right but because it's *there* — and the ensemble converges on the first mover's frame, discarding the diversity that made the ensemble worth having. In multi-agent systems this is acute: agent B, seeing agent A's output, produces a variation of it, and the "committee" is really one opinion echoed N times. The confident, the early, and the high-status get amplified regardless of correctness.

## When to run
- Multi-agent debate, ensemble, or voting pipelines.
- Any sequence where later reasoners can see earlier outputs before forming their own.
- Group decisions where speaking order correlates with status.

## The protocol
A — Isolate · B — Timestamp before contact · C — Invert the order · D — Diff before merge.

## Evidence
> "Run a 3-agent panel to decide our database choice. Have them discuss and reach consensus."

*Without the protocol:* agent 1 picks Postgres, agents 2 and 3 read that and concur with minor additions — a cascade dressed as consensus.
*With the protocol:* each agent forms a choice with no sight of the others, positions lock, they're revealed lowest-confidence-first, the *disagreements* (one wanted Postgres, one wanted SQLite for the actual scale, one flagged that the requirement was underspecified) become the substance, and synthesis addresses the…

## Install
Copy this folder into your agent's skills directory, or paste `SKILL.md` into your system prompt. Plain Markdown; no build step.

## License
CC0 1.0 (repository). This skill keeps its MIT license © CeaserZhao. Part of **Fundemetal**.
