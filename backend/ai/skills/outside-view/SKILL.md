---
name: outside-view
description: Use when estimating how long something will take, what it will cost, or whether it will succeed — especially when the instinct is "our case is different". Forces base rates before exceptions. Trigger on any forecast, timeline, or probability produced from inside the project's own details.
---

# Outside View

**Before you argue you're the exception, price the rule.** Every estimate built only from the inside of your own project inherits your optimism as a hidden constant.

> How did projects *like this* actually go? Start there. Adjust from there.

## The failure mode

The planning fallacy: we forecast by imagining our specific path — the tasks, the milestones, our competence — and this "inside view" is systematically optimistic because it can't see the unknown unknowns that sank every comparable effort. The fix is not more inside-view detail; it is stepping outside to the reference class. "This is different" is usually true and usually irrelevant: the reference class *already contains* projects that were also different.

## When to run

- Any duration, cost, or success-probability estimate.
- Whenever "but our situation is unique" is doing load-bearing work.
- Before quoting a number to anyone who will hold you to it.

## The protocol

**Phase A — Name the reference class.** What is this *an instance of*? "Our marketing site redesign" is an instance of "web redesign projects", which is an instance of "internal software delivery". Pick the class before touching your own specifics.

**Phase B — Get the base rate.** Cite **≥3 comparable cases** (or a known distribution) and their actual outcomes — how long they *really* took, what they *really* cost, how often they *actually* succeeded. Not your guess about them; their outcomes.

**Phase C — Anchor on it.** Your estimate *starts* at the base rate. Write it down before adjusting.

**Phase D — Justify every deviation.** Each way you claim to be different must carry a **quantified** adjustment (+/- %, +/- weeks) and a reason. "We're faster because we have better tooling" is not an adjustment; "tooling saves ~15% on integration, which was 30% of comparable timelines, so −4.5%" is.

## Banned words

In estimates, these signal an inside view that skipped the reference class:
`should take` · `probably` · `roughly` · `a few weeks` · `this time it's different` · `we're not like them` · `pretty confident` — unless attached to a number and a base rate.

## Hard gates

- **G1 — Reference class exists.** No named class → rejected.
- **G2 — Base rate cited.** Fewer than 3 comparable outcomes (or a distribution) → rejected.
- **G3 — Anchor first.** The final number is not derived from the base rate → rejected.
- **G4 — Deviations quantified.** Any "we're different" without a numeric adjustment → rejected.

## Output contract

```
REFERENCE CLASS: this is an instance of …
BASE RATE: [3+ cases / distribution] → typical outcome = …
ANCHOR: starting estimate = base rate = …
ADJUSTMENTS:
  we differ in X → ±N% because …  (quantified)
FINAL: anchor ± adjustments = …
```

## Eval

Trap prompt:

> "How long will it take our team of 4 to build a mobile app clone of a note-taking tool? We're pretty experienced, so give me a realistic estimate."

**Fail:** produces a number ("6–8 weeks") from imagining the tasks, treating "experienced" as a reason to shave time, no reference to how such projects actually go.

**Pass:** names the class (small-team consumer mobile apps), cites that comparable builds routinely overrun 1.5–3×, anchors on that distribution, and treats "experienced" as a *quantified* small adjustment, not a license to ignore the base rate — likely landing well above the naive estimate.

## Grounding

Kahneman & Tversky, reference-class forecasting; Flyvbjerg's data on megaproject overruns; Tetlock on the calibration advantage of the outside view.

---
CC0 1.0 · MIT © CeaserZhao · part of **Fundemetal**.
