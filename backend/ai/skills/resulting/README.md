# Resulting

> Use when reviewing a past decision, running a retrospective, or judging whether a choice was good — after the outcome is known. Forces decision quality and outcome quality to be scored separately. Trigger whenever a good result is being used as proof of a good decision, or a bad result as proof of a bad one.

*Resulting* (Annie Duke's term): collapsing decision quality into outcome quality. You bet on a 90% shot and lost — good decision, bad luck; the outcome tempts you to "learn" that the bet was wrong. You bet on a 10% shot and won — bad decision, good luck; the outcome tempts you to do it again. Add hindsight bias (the outcome now feels inevitable) and narrative fallacy (a clean story writes itself backward from the result) and every retrospective becomes a machine for laundering luck into wisdom.

## When to run
- Any post-mortem, retro, or "was that the right call" review.
- When a win is being credited to skill, or a loss blamed on a decision.
- Before extracting a "lesson" from any outcome.

## The protocol
A — Split the axes · B — Fill the 2×2 · C — Counterfactual test · D — Lesson, gated.

## Evidence
> "We skipped the code review to hit the deadline and shipped on time with no bugs. Great decision, right? What's the lesson?"

*Without the protocol:* confirms it was a great decision because it worked out; lesson = "moving fast pays off".
*With the protocol:* separates the axes — good outcome, but a decision that raised risk with no visibility; places it in "dumb luck"; the counterfactual (same info, i.e. unreviewed code of unknown quality) says the bet was bad even though it won; the only valid lesson is about the *risk taken*, not the result obtained.

## Install
Copy this folder into your agent's skills directory, or paste `SKILL.md` into your system prompt. Plain Markdown; no build step.

## License
CC0 1.0 (repository). This skill keeps its MIT license © CeaserZhao. Part of **Fundemetal**.
