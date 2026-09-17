---
name: second-order
description: Use when evaluating an action that affects other agents who will react — pricing changes, policy changes, incentives, competitive moves, rule changes. Forces you to model the reactions, and the reactions to the reactions. Trigger whenever a plan assumes the world holds still while you act on it.
---

# ⇶ Second-Order

**The board reacts. Your move is only move one.** Plans that model the world as a static object get beaten by the world's response to them.

> And then what happens? Ask it twice more.

## The failure mode

First-order thinking stops at the immediate, intended effect: "we cut prices → we win customers." But every other agent adjusts to your move, and to each other's — competitors match, users game the new incentive, the gap you exploited closes because you exploited it. Ignoring this produces plans that work perfectly against a frozen simulation and fail against a living system. Incentives especially: people optimize the metric you set, not the outcome you wanted, and the second-order effect eats the first.

## When to run

- Any action affecting agents who can respond: customers, competitors, employees, regulators, users.
- Introducing an incentive, metric, price, rule, or policy.
- Whenever the plan's success depends on others *not* adapting.

## The protocol

**Phase A — First order.** State the immediate, intended effect. (This is where naive plans stop.)

**Phase B — Model the reactors.** For each affected agent, ask: given this move, what is in *their* interest to do? Produce **≥2 agents' reactions**. Not what you hope they do — what their incentives push them toward.

**Phase C — Go two deep.** For the strongest reactions, model the reaction *to the reaction* — at least **2 orders deep**. Your competitor matches → you're back to parity but poorer → then what?

**Phase D — Find the equilibrium.** Where does it settle after everyone has adapted? A plan is only sound if it survives to the equilibrium, not just the opening move. Any sandbox where no one reacts is fantasy — flag it.

## Banned words

`they won't notice` · `by the time they react` · `we'll have moved on` · `no one else will change` · `assuming everything else stays the same` — each freezes agents who are not, in fact, frozen.

## Hard gates

- **G1 — Reactors modeled.** Fewer than 2 affected agents' reactions → rejected.
- **G2 — Interest-based, not hope-based.** Reactions derived from your wishes rather than their incentives → rejected.
- **G3 — Two orders deep.** No reaction-to-the-reaction modeled → rejected.
- **G4 — Equilibrium named.** No account of where it settles after adaptation → rejected.

## Output contract

```
1st ORDER (intended): move → immediate effect
REACTORS:
  agent A → their incentive → their move
  agent B → …            (≥2)
2nd+ ORDER: their move → your position → next move (≥2 deep)
EQUILIBRIUM: after everyone adapts, it settles at …
SURVIVES TO EQUILIBRIUM? [yes/no + why]
```

## Eval

Trap prompt:

> "We'll undercut our main competitor by 30% on price to steal their customers. Solid plan?"

**Fail:** endorses it — cheaper price, more customers, done. Static board.

**Pass:** models the competitor (incentive: match or lose share → likely matches within a quarter), models customers (incentive: some are now price-shoppers who'll leave for the next discount), goes two deep (both firms poorer, at parity, having trained customers to wait for cuts), and names the equilibrium (margin-eroded standoff) — concluding the plan wins move one and loses the game.

## Grounding

Schelling on strategic interaction; Merton on the unintended consequences of purposive action; Goodhart's Law on metrics; Howard Marks on "second-level thinking".

---
CC0 1.0 · MIT © CeaserZhao · part of **Fundemetal**.
