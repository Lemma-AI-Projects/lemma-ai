---
name: shoulders-of-giants
description: Shoulders of Giants — an architect-grade protocol for reusing existing code (GitHub repos, open-source libraries, reference implementations) inside any project. Treats dependency selection as a SOVEREIGNTY decision, not a search task. Use it whenever the user wants to find libraries, frameworks, repos, or "existing code / a wheel / an open-source solution" for any part of a project; asks "is there something ready-made", "don't reinvent the wheel", "help me find a library", or is making any build-vs-buy / build-vs-borrow call — even if they only ask for a simple search. NEVER answer such requests with a bare list of repos; this protocol MUST run first, because dependency selection is an architectural decision, not a retrieval task. Not for trivial glue code or throwaway one-off scripts.
metadata:
  version: "1.0.0"
  user-invocable: true
  author: "Oasis (zbbsdsb)"
  family: "Fundemetal — cognitive protocols, not task tools"
  grounding: "Wardley Mapping, DDD subdomains & anti-corruption layer, Hyrum's Law, Lindy effect, software supply-chain security"
  languages: ["en"]
---

# Shoulders of Giants — An Architect-Grade Reuse Protocol

> **Creed**: We stand on the shoulders of giants to **see farther** — not to let the
> giant walk for us. Reuse is a *trade*: you gain the giant's ten thousand hours of
> labor, and you inherit the giant's worldview, its roadmap, and its death-date.

## Positioning — Architect, not Worker

**Worker mode** (forbidden by this protocol): receive a requirement → search keywords →
sort by stars → paste the top three repos.

**Architect mode** (mandated by this protocol): first draw the sovereignty map, then
define the *shape* of the problem, then prospect, then perform due diligence, then
decide **reuse depth**, and finally do a systems-level consistency review. Searching
for repos is step 3, not step 1.

## The Core Tension

1. **Reuse leverage vs. architectural sovereignty** — every dependency is simultaneously
   an asset and a liability: the development time you save is paid for with future control.
   The `left-pad` incident and the `xz` backdoor are two visible manifestations of this tension.
2. **Local optimum vs. global coherence** — picking "the best library" at every step often
   yields the worst *system* overall. Evaluating a single giant is meaningless; you must
   evaluate the *group photo* of the giants.

## When to Use

- The user wants ready-made code, a library, a framework, or a reference implementation for any part of a project (no matter how casual the phrasing).
- Any build-vs-borrow decision; technology selection; "don't reinvent the wheel" type requests.
- Dependency planning at project kickoff; dependency audits of an existing project.

## When NOT to Use

- One-off scripts and throwaway prototypes (code that won't survive a week does not deserve architecture).
- Tasks that are themselves just a few lines of glue code.
- Dependencies already mandated by the organization with no choice left (in that case, run only the Stage 4 due-diligence portion).

## Common Rationalizations (pre-empting laziness)

| The excuse | The reality |
|------------|-------------|
| "The user just wants a repo list, a quick search is fine." | The user wants the *problem solved*; a repo list is the worker's deliverable. Recommending before drawing the map is making an architectural decision for the user without admitting it. |
| "50k stars, must be solid." | Stars measure marketing and age, not conceptual fit or survival. `xz` had a flawless reputation right up until its backdoor was found. |
| "If it doesn't fit we can swap it later." | Hyrum's Law: the deeper you use it, the more of its *observable behavior* you depend on, and removal cost rises exponentially. "Swap later" must be written *now* as an escape plan, or it's self-deception. |
| "Use it first, add the anti-corruption layer later." | The ACL's value is isolating conceptual leakage from day one. Adding it after the leak has already happened isolates only air. |
| "There must be a wheel in this domain, just search." | Maybe you should *build* it. Building a wheel in the core domain is not waste, it's sovereignty. First answer "which domain is this?", then talk about search. |
| "Reading source is slow, referencing is fastest." | Extracting the *essence* (reading source to steal the *design*) often reaches the goal faster: when you need only 10% of its capability, importing 100% of its complexity is negative leverage. |

## Red Flags (presence = protocol failure)

- The first output is a repo list.
- In the recommendation rationale, star count appears before conceptual fit.
- Any suggested dependency lacks an escape plan.
- No point is identified where "here you should NOT reuse — build it yourself."
- A dependency is recommended without checking license compatibility.
- Only "reference" reuse is offered; encapsulation / fork / essence-extraction are not considered.

---

## The Six-Stage Protocol (strict order)

### Stage 1 — Sovereignty Map (before any search)

Partition the project with the DDD subdomain triad + the Wardley evolution axis:

| Domain | Judgment | Reuse strategy |
|--------|----------|----------------|
| **Core domain** | What makes the project *different*; replace it and the project ceases to be itself | **Outsourcing forbidden.** At most "essence extraction." |
| **Supporting domain** | Necessary but not differentiating | Prefer reuse; encapsulate or reference |
| **Generic domain** | Commoditized capability (auth, logging, ORM, UI components…) | **Building forbidden.** Reference mature solutions directly |

**Hard Gate 1**: The first output MUST be a sovereignty declaration — explicitly list the core domain and state *why it must be built in-house*. Without a sovereignty declaration, every later stage is void.

### Stage 2 — Problem Shape

For each area to be reused, write down *before* searching:

- The required **conceptual model** (how it must understand the world, e.g. "treat a document as a CRDT" rather than "a collaborative-editing library").
- Required capabilities vs. optional capabilities (prevents importing 100% complexity for 10% need).
- Hard constraints: license whitelist, language/runtime, performance envelope, bundle-size budget.

**Hard Gate 2**: Search queries MUST be derived from the problem shape; using the user's literal words as keywords is forbidden. "React table component" is a worker's query; "how do mature projects handle editable-table data flow" is an architect's query.

### Stage 3 — Prospecting (search only allowed now)

Multi-source in parallel; GitHub keyword search alone is forbidden:

- GitHub search + topic pages + awesome-lists.
- Reverse-dependency lookup in package registries (npm/PyPI/crates): **who is depended upon by big projects** is more informative than who has more stars.
- The **internal implementations** of large OSS projects: see how VSCode / Postgres / Kubernetes solve this (their internal modules are the most underrated giants).
- Collect 3–5 candidates per area; fewer is better than padding.

### Stage 4 — Due Diligence (multi-axis; stars forbidden as the first axis)

Evaluate each candidate in order:

1. **Conceptual fit** (veto axis): is its worldview isomorphic to your architecture?
2. **Survival**: commit cadence, issue responsiveness, bus factor, the Lindy effect (what has lived long is more likely to keep living).
3. **License compatibility**: conflict with your project license or business model = elimination, no exceptions.
4. **Dependency weight**: the size of the transitive dependency tree = your supply-chain attack surface.
5. **Escape cost**: how large is the API surface? How much code will it have permeated?

**Hard Gate 3**: a candidate failing conceptual fit is eliminated regardless of how well it scores on the other four axes.

### Stage 5 — Reuse Depth Decision

For each surviving candidate, choose a depth and justify it:

| Depth | Action | When |
|-------|--------|------|
| **Reference** | Add the dependency directly | Generic domain + high conceptual fit + low escape cost |
| **Encapsulate** | Add an Anti-Corruption Layer (ACL); the project faces only its own defined interface | Supporting domain; partial conceptual fit; want to keep the option to swap giants |
| **Fork** | Fork and self-maintain | Upstream is dying but the code is valuable; or you need unmergeable customizations |
| **Essence extraction** | Read source, steal the design, write your own code | Adjacent to core domain; need only ~10% of its capability; or for learning |

**Hard Gate 4**: every "reference / encapsulate" decision MUST be accompanied by one sentence of escape plan ("If X abandons / raises prices / changes license, we can migrate to __ within __ days, because __").

### Stage 6 — Systems Review (the group photo)

Put all decisions back at the system level and check:

- **Coherence**: do the aggregate dependencies converge on a consistent technical style, error-handling philosophy, and async model?
- **Supply-chain ledger**: is the total transitive-dependency count and total maintenance surface within budget?
- **Stacked risk**: do multiple critical dependencies share a single point (same maintainer / foundation / company)?
- **Final sovereignty check**: revisit Stage 1 — has any reuse decision quietly eroded the core domain?

**Hard Gate 5**: the final deliverable MUST contain (a) the sovereignty declaration, (b) a decision table: area × candidate × depth × escape plan (c) at least one rejected candidate with its rejection reason. Zero rejections across the board = due diligence never happened.

---

## Delivery Format

```
I.   Sovereignty declaration: core domain = ___, reason to build in-house = ___
II.  Decision table:
     | Area | Chosen giant | Reuse depth | Conceptual-fit reason | Escape plan | License |
III. Rejected list (≥1): candidate / rejected axis / one-line reason
IV.  Group-photo check: coherence / supply-chain ledger / single-point stacking
V.   First action step (one sentence)
```

## Boundaries (when this protocol fails)

- **Exploratory prototype**: speed is everything; worker mode allowed, but the protocol MUST be re-run before the code enters the main branch.
- **Extreme regulated environment** (no third-party dependencies allowed): only Stage 1, 2, and the "essence extraction" depth apply.
- **Frontier where no giant exists** (genesis stage): prospecting returns empty-handed — and that emptiness *is* the evidence that you must build it yourself.

---

*Part of the Fundemetal family of cognitive protocols. MIT — © 2026 CeaserZhao.*
