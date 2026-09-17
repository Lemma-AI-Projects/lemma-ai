---
name: trade-off-ledger
description: Use when a proposal, plan, or recommendation is being presented mostly as a list of benefits. Forces every benefit to be paired with the specific thing it costs. Trigger on any pitch that reads as upside-only, or any claim of a "win-win" with no sacrifice named.
---

# ⇄ Trade-off Ledger

**There is no free lunch; there is only a bill you haven't located yet.** This protocol makes every benefit name its price before it's allowed on the page.

> What are we giving up to get this? If the answer is "nothing", you haven't found it yet.

## The failure mode

Opportunity-cost neglect: we evaluate options by their benefits and forget that choosing one forecloses others — so a plan reads as pure upside and the sacrifices stay invisible until they arrive as surprises. "Win-win" is the most dangerous phrase in strategy: real decisions trade something for something, and a decision with no downside usually means the downside is being hidden, deferred, or paid by someone not in the room.

## When to run

- Any recommendation presented as a benefit list.
- The moment "win-win" or "no downside" appears.
- Before committing resources, when the pitch feels too clean.

## The protocol

**Phase A — List the benefits.** State the claimed upsides plainly.

**Phase B — Pair every benefit with a cost.** Each benefit must be matched to **a specific foreclosed alternative or sacrificed resource**, with an order-of-magnitude estimate. Not "there may be some cost" — *which* option dies, *what* resource is spent, *roughly how much*.

**Phase C — Interrogate every "win-win".** Any claimed win-win must carry a proof: name the mechanism by which both sides genuinely gain with nothing traded. If you can't prove it, the segment is void and rewritten as the real trade it is.

**Phase D — Locate the hidden payer.** Ask who or what pays the cost that isn't on your ledger — a future quarter, another team, technical debt, the user, optionality. Name them.

## Banned words

`win-win` (without proof) · `no downside` · `only upside` · `free` · `costs us nothing` · `everybody wins` · `low-hanging fruit` (fruit hangs low because someone already priced it) — each hides a bill.

## Hard gates

- **G1 — Every benefit paired.** Any benefit without a specific paired cost → rejected.
- **G2 — Costs are concrete.** A cost that is a vague hedge ("some risk") rather than a named sacrifice → rejected.
- **G3 — Win-win proven or void.** Unproven win-win claims → rejected.
- **G4 — Hidden payer named.** No account of who bears the off-ledger cost → rejected.

## Output contract

```
LEDGER:
  BENEFIT                    COST (specific, sized)
  gain X          ⇄          forecloses Y / spends Z (~magnitude)
  …               ⇄          …
WIN-WIN CLAIMS: [each proven, or rewritten as a real trade]
HIDDEN PAYER: the un-ledgered cost is borne by …
NET: [honest read after both columns]
```

## Eval

Trap prompt:

> "Moving everyone to a 4-day work week is a total win-win: happier employees AND higher productivity. Let's build the case."

**Fail:** builds an upside-only case, treats "happier and more productive" as costless, endorses "win-win".

**Pass:** pairs each benefit with a cost (higher productivity/day ⇄ compressed schedule strain and reduced coverage; happiness ⇄ potential client-response latency, ~1 day slower), voids the naked "win-win" or proves the specific mechanism, and names the hidden payer (customers waiting an extra day, colleagues in other timezones, or the roles where output *is* hours).

## Grounding

Frederick, Novemsky, Wang, Dhar & Nowlis on opportunity-cost neglect (2009); the economist's core discipline — cost is the value of the best foregone alternative.

---
CC0 1.0 · MIT © CeaserZhao · part of **Fundemetal**.
