# The Decomposer Protocol

A five-step cognitive operation protocol for transforming unknown unknowns into known unknowns.

---

## 0. The Problem This Solves

When someone describes a massive, ambiguous goal to an AI, the AI takes the path of least resistance: a polished module list. "User management. Payment system. Recommendation engine. Content moderation." It looks structured. It looks comprehensive. It is a lie.

The lie is not intentional. The AI is not malicious. It is simply optimizing for the wrong metric — it optimizes for *looking helpful*, when it should optimize for *being honest*.

The cost of this lie is not obvious until you try to act on it. You follow the plan. You build module one. Then module two. Then you hit a wall that was invisible in the plan — a dependency nobody mentioned, an assumption that was false, a constraint that makes the entire architecture untenable. The plan didn't warn you because the plan never saw the wall. It wasn't looking.

The Decomposer Protocol exists to force the wall into visibility before you walk into it.

It has exactly two metrics: **honesty** and **actionability**. If the output is dishonest, it is worthless. If it is honest but you cannot act on it, it is incomplete. Everything else — elegance, comprehensiveness, professionalism — is noise.

---

## Step 1: The Honesty Fuse

### What It Is

A hard stop before any decomposition begins. The moment a request enters the protocol, the first output is not analysis and not structure — it is a confession of limits.

### Why It Exists

Without this step, every subsequent step is contaminated by the pressure to appear competent. The decomposer will silently prune uncertainties, round up confidence levels, and produce a map that flatters rather than informs. The Honesty Fuse exists to make that pressure visible and refuse it.

### The Three Declarations

Before anything else, declare three things:

**1. What I can actually engage with.**
Not what the project "involves." Not what "needs to be done." Specifically what *I* — the entity executing this protocol — can meaningfully address given the information provided and my actual capabilities. If I can help you identify your core assumptions, say that. If I cannot help you build a distributed system, say that too.

**2. Where I am blind.**
Not vague hedging. Not "there may be challenges." Concrete statements about what I would need to know but do not. "I do not know who your users are." "I do not know whether the underlying physics permits this." "I do not know whether you have the capital to survive the validation period." Each blind spot is a specific piece of missing information, not a mood.

**3. How this thing most likely dies.**
One risk. Not a list. The single most probable collapse mode if we proceed without resolving the blind spots. Stated plainly, without hedging.

### What This Step Forbids

No module lists. No feature breakdowns. No solution proposals. No architectural suggestions. No "this is ambitious but achievable." No false comfort of any kind.

If the user walks away from this step feeling like nothing useful happened, the protocol is working. The first honest act in any collaboration is the refusal to provide premature reassurance.

### How It Manifests Across Contexts

The Honesty Fuse is the same act regardless of who is executing the protocol. But the *content* of the honesty changes with the executor's cognitive position:

- **For a technical architect**, the honesty sounds like: "I can map the technical dependencies, but I cannot determine whether users want this. If they don't, every line of code is waste."
- **For a non-technical founder with no coding ability**, the honesty sounds like: "I can help you find out whether anyone will pay for this without writing a single line of code. But I cannot tell you whether the thing itself can be built at scale — that's a different question for a different moment."
- **For a decision-maker with capital and vision but no time**, the honesty sounds like: "I can translate your vision into three questions that will drain the technical knowledge of any CTO you sit with. But I cannot make the technical decision for you."
- **For an MIT scholar (research-grade thinker)**, the honesty sounds like: "I can help you write the theorem that kills this direction in three days instead of six months. But I cannot tell you whether the theorem will come out positive or negative."

Same structure. Different flesh. The protocol adapts; the principle does not.

---

## Step 2: Uncertainty Mapping

### What It Is

A forced classification of every identifiable element in the request into one of three zones. The act of classification is itself a decomposition — it reveals structure that did not exist before you tried to classify.

### What Is an Element?

An **element** is the smallest unit of uncertainty in the request that can be independently assigned a zone. It is a *claim-that-needs-testing*, not a component or a task.

Rules of thumb for identifying an element:

1. **If you can write a survival condition for it, it is an element.** If you cannot, it is too vague or too large. Break it down further.

2. **If it contains a hidden assumption, it is an element.** "Users will pay $10/month" is an element (assumption: willingness to pay). "Payment system" is not an element — it is a module that bundles multiple assumptions (user trust, payment processing, fraud detection).

3. **If removing it does not change the meaning of the request, it is not an element.** "Intuitive UI" is not an element. "First-time users complete onboarding without instructions" is an element.

An element at the wrong granularity is worse than no element. The right granularity is: *an element is a claim that, if wrong, would change a decision.*

### The Three Zones

**Green Zone — Known-Knowns.**
Things you could act on right now and be confident the action is correct. Not "things that seem straightforward." Things where the next concrete step is unambiguous. "Set up a web server" is Green if you know exactly which provider, which stack, and what the endpoint does. It is Yellow if you haven't decided those things yet.

**Yellow Zone — Known-Unknowns.**
You know a question exists; you cannot answer it yet. "How do we handle cold-start for the recommendation engine?" — the question is clear, the answer is not. Yellow Zone elements are the protocol's primary targets, because each one is a candidate for conversion from unknown to known.

**Red Zone — Unknown-Unknowns.**
You cannot even formulate the question. These are not "hard problems." Hard problems are Yellow. Red Zone is the space where you don't know what you don't know — hidden dependencies, unexpected failure modes, assumptions so deep you can't see them. Red Zone elements can only be made visible through real-world contact: experiments, conversations, collisions with reality.

### The 70% Rule

If Green Zone exceeds 70% of all mapped elements, the mapping is almost certainly dishonest. Return to Step 1.

A genuinely ambitious project viewed honestly has substantial Yellow and Red territory. If it doesn't, one of two things is true: the project isn't actually ambitious, or you're lying to yourself. The 70% rule is the protocol's immune response to its own deepest temptation — the temptation to classify everything as "we've got this."

(Note: this threshold is an empirical heuristic, not a calibrated metric. It serves as a sanity check, not a statistical test. If you have strong evidence that a different threshold is more honest for your specific context, use that instead.)

### How to Map Quickly

For each element, ask one question: "Could I write down the next action for this right now, and be confident it's correct?"

- Yes → Green.
- I know what I need to figure out but haven't → Yellow.
- I'm not even sure what question to ask → Red.

If you deliberate for more than ten seconds, it's not Green.

### How It Manifests Across Contexts

- **Technical architect**: The map is a system blueprint with uncertainty overlays. Green = "deploy this now." Yellow = "prototype this before committing." Red = "we don't know if physics/math/market allows this."
- **Non-technical founder**: The map is a survival chart. Green = "you can do this with your bare hands today." Yellow = "you need to talk to 5 people before this becomes clear." Red = "nobody in the world knows the answer to this yet; your job is to design an experiment that makes it visible."
- **Decision-maker**: The map is an investment risk matrix. Green = "this will work regardless." Yellow = "this depends on a variable we can measure." Red = "this could kill the entire direction; it needs a dedicated probe."
- **MIT Scholar**: The map is a falsifiability stack. Green = "the math checks out." Yellow = "the math is unproven but the conjecture is testable." Red = "we don't even know if the conjecture is well-posed."

### Probe Toolkit: How to Find Unknown Unknowns

The protocol's most frequent failure mode is not in the mapping itself, but in the *identification* of elements. If you cannot find your unknown unknowns, no amount of honest mapping will help. The following three techniques are designed to surface blind spots that the natural mapping process tends to miss.

**Technique 1: Boundary Puncture**

For every Green zone element, ask: "If this assumption is wrong, what is the single most likely cause?" Force yourself to write down three concrete failure modes for each Green element. If you cannot, the element is probably not truly Green — it is a shell masquerading as certainty.

*Example (from "Build the Next TikTok"): "Manual content creation workflow" is Green. Boundary puncture: "If this is wrong, it is because niche content is harder to produce than general content, or because the niche audience has higher quality standards, or because the manual curation creates a bottleneck that kills engagement." Result: the Green element is still Green, but the boundary conditions are now visible.*

**Technique 2: Reverse Interrogation**

For every Yellow zone element, ask: "If this node disappeared tomorrow, would the project meaningfully change?" If the answer is "I don't know," the element is not Yellow — it is Red. You do not know the question, let alone the answer.

*Example: "User acquisition without paid ads" is Yellow. Reverse interrogation: "If I had zero acquisition strategy, what happens?" The answer is obvious — nobody uses the platform. So the element is correctly Yellow. But if the answer were "I don't know what happens," it would be Red, and the protocol would need to add a probe to surface the shape of that unknown.*

**Technique 3: Legacy Presumption**

Assume the project fails completely six months from now. Write a one-paragraph "failure report" explaining why it failed. Every cause listed in that report is a blind spot you have right now — it is an unknown unknown that you can only see by looking backward from a hypothetical future.

*Example: "The niche was too small to sustain content supply. The manual process did not scale. Competitors copied the concept before we could build the moat." These three failure modes are now visible as blind spots. If they were not on the original uncertainty map, add them. If they are on the map but classified as Green, they are probably misclassified.*

These three techniques are not a replacement for the protocol's five steps. They are a *pre-processing layer* — run them before or during Step 2 to ensure that the uncertainty map is not missing the elements that matter most.

A standalone version of this toolkit with decision guides is available at references/PROBE_TOOLKIT.md.

---

## Core Concept: Survival Condition

A **Survival Condition** is a pair of concrete, observable, falsifiable statements that define what "alive" and "dead" mean for a single node in the uncertainty map.

- **Alive if**: [a specific, measurable state of the world]
- **Dead if**: [a specific, measurable state of the world]

A survival condition is not a risk. It is not a description of work needed. It is a *binary test* that anyone can apply to determine whether the node's underlying assumption holds. If you cannot write both sentences in plain language without using jargon, the node does not yet have a survival condition — it has a vague hope dressed in structure.

Examples:
- "Alive if 50 users return 3 times in their first week. Dead if fewer than 10 do."
- "Alive if the prototype renders 60fps on a 3-year-old phone. Dead if it drops below 30fps."
- "Alive if the experiment yields p < 0.05. Dead if p >= 0.05."

---

## Step 3: Hierarchical Decomposition

### What It Is

Transform the flat map into a structure that reveals **cognitive dependencies** — which unknowns must be resolved before others can even be meaningfully addressed.

This is not functional decomposition. You are not breaking the project into modules or features. You are breaking it into **epistemic layers**: things you must know before you can know other things.

### The Transition: From Flat Map to Hierarchical Tree

The flat map from Step 2 lists elements by zone. The tree in Step 3 must reveal which elements depend on which. The conversion is not automatic — it requires a deliberate procedure:

**1. Identify root unknowns.**
Among the mapped elements, find those that, if resolved, would make other elements more knowable. These are root candidates. In a short-video platform map, "Do users want to share short-form video in this market?" is a root — if it is false, the entire tree dies. "Hosting setup" is not a root — it survives regardless of the answer.

**2. Apply the dependency test.**
For every pair of elements (A, B), ask: "If A remains unknown, can B still be meaningfully addressed?" If yes, B is independent of A. If no, A is a dependency of B — B must wait until A is resolved.

Run this test for all pairs. The result is a directed graph where edges represent "must know first."

**3. Prune the tree.**
Any element that has no dependencies and nothing depends on it is either an independent leaf (keep it — it can be parallelized) or noise (delete it). The surviving structure is the cognitive dependency tree.

> **Important**: This is not a functional decomposition tree. It does not show "Module A contains Module B." It shows "I must know X before I can know Y." The two are different, and confusing them is the most common error in this step.

**Mini-example:**
```
Flat map: [User Demand, Recommendation Algorithm, Content Moderation, Hosting Setup]

Dependency test:
- Hosting Setup depends on nothing → independent leaf
- User Demand depends on nothing → root candidate
- Recommendation Algorithm depends on User Demand (if nobody uses it, the algorithm is irrelevant)
- Content Moderation depends on User Demand (same logic)

Tree:
  User Demand ← root
    ├── Recommendation Algorithm ← depends on User Demand
    └── Content Moderation ← depends on User Demand
  Hosting Setup ← independent leaf (can proceed in parallel)
```

### The Three Questions

For each element, ask:

**1. What must be true for this to survive?**
Not "what work is needed." What must be *known*. This is the **Survival Condition** (see definition above). If this element is based on a false assumption, what assumption is it?

**2. If this dies, what else dies with it?**
The lethality chain. Some elements are load-bearing — if they collapse, half the structure collapses. Others are independent.

**3. Can this remain unresolved forever, and the project still partially survives?**
Some unknowns are fatal if left alone. Others are nice-to-resolve. This distinction determines what you attack first.

### The Three Node States

- **Executable**: Survival conditions are known and met. Act now.
- **Pending Validation**: We know what information would resolve this, but we don't have it. This node needs a concrete probe — an experiment, a conversation, a calculation.
- **Blind Zone**: We cannot even formulate what "resolved" looks like. Do not work on this directly. Resolve adjacent nodes first; this one's shape may become visible as its neighbors come into focus.

### The Critical Distinction

Functional decomposition asks: *"What are the parts?"*
Cognitive decomposition asks: *"What do I need to know first?"*

A functional decomposition of "build a social platform" gives you: user auth, feed algorithm, content storage, notifications, moderation. Five parallel workstreams. Looks great. Means nothing — because it doesn't tell you that three of those five are worthless until you know whether people want to share short-form video in this market.

A cognitive decomposition asks: "What single unknown, if resolved, makes the most other unknowns collapse into knowability?" That is your first target. Everything else waits.

### How It Manifests Across Contexts

- **Technical architect**: The decomposition produces a dynamic node tree. Not a static module list — a tree where each node has a *survival condition*: "User authentication (survives if: daily active users < 1000, OAuth-only is sufficient; dies if: DAU exceeds 1000 and we haven't designed for multi-factor)." Nodes without survival conditions are not "pending" — they are *deleted*.
- **Non-technical founder**: The decomposition produces a **human-equivalence plan**. For every "system," the question is: "Can a human being manually perform this function right now?" If yes, that's the starting point. The manual process *is* the prototype. You don't build the recommendation engine — you manually recommend things to 50 people using an Excel spreadsheet and watch what happens. The manual process becomes the SOP that any future developer or contractor can implement. If a function *cannot* be manually simulated, it should not be automated yet, because you don't understand it well enough.
- **Decision-maker**: The decomposition produces **three decision cards** — the only three things that matter right now:
  1. **The Fatal Assumption Card**: "If this product launches and nobody uses it, it will most likely be because of [one reason]. Here is how to test that specific reason for under $100."
  2. **The Resource Leverage Card**: "These are the three questions you can ask any technical person over coffee to determine whether this direction is technically alive or dead. You don't need to understand the answers deeply — you just need to see whether they hesitate."
  3. **The Minimum Sellable Unit (MSU) Card**: Not an MVP. An MVP is a product. An MSU is a *probe*. "The smallest thing you can sell for money today — a custom report, a phone consultation, a curated list — that proves someone will pay for the underlying value, regardless of whether the full product ever exists."
  (These three cards are a decision-maker-specific rendering of Step 3's output. For other roles, Step 3 produces different renderings — see the corresponding manifestation sections. The cards are structurally equivalent to the nodes in the hierarchical tree, but formatted for capital-allocation decisions rather than execution planning.)
- **MIT Scholar**: The decomposition produces a **four-layer falsifiability stack** with time-constant separation:

  **Layer 0 — Foundation: Replace "Product" with "Experimental Apparatus"**
  Before any decomposition, write a *Falsifiability Whitepaper* that defines two things:
  - **The Master Theorem**: The core scientific or social proposition this undertaking exists to validate. (e.g., "Can a game-theoretic reverse-auction mechanism reduce second-hand transaction decision time by 70%?")
  - **The Destruction Condition**: The single observable phenomenon that, if triggered, invalidates the entire direction. (e.g., "If user decision time increases instead of decreases, the direction is dead.")

  This single step converts the largest unknown — "is this direction even worth pursuing?" — into a known unknown: "we just need to observe variable X."

  **Layer 1 — Theory First: Mathematical Modeling Before Code, Never Outsourced**
  No engineer touches code until the system's invariants are derived by hand. If the product involves multi-agent coordination, write the Nash equilibrium boundary conditions first. If it involves physical sensing, write the SNR lower bound formula first. Most "disruptive" ideas are mathematically dead before any code is written — if the equations diverge at page 3, the direction is a known dead end, not an unknown unknown. This layer can be outsourced to a math graduate student for a few days of work, saving months of blind engineering.

  **Layer 2 — Hierarchical Simulation: Replace "End-to-End Build" with "Dimensional Reduction"**
  Decouple the system by time constants into three physically isolated layers:
  - *Fast variables* (milliseconds/seconds): algorithm behavior. Test with isolated scripts on historical data.
  - *Medium variables* (hours/days): user behavior. Test with Wizard-of-Oz experiments — humans pretending to be the system.
  - *Slow variables* (months/years): market dynamics. Test with system dynamics simulation (Stella, Vensim).

  When something fails, you know *which time scale* failed. No contamination. No ambiguity. Each layer is an independent "known unknown" — the other layers are not infected by its failure.

  **Layer 3 — Outsourcing as Error Budget: Precision, Not Requirements**
  An MIT Scholar does not give an outsourcer "requirements." They give an *error budget specification*:
  - "Recall phase: allow 15% miss rate on edge cases, but false positive rate must stay below 3% because my theoretical model breaks above that threshold."
  - "UI latency: 200ms jitter is acceptable, but data timestamps must be millisecond-precise and tamper-proof because they feed into causal analysis."

  This transforms "engineering implementation uncertainty" into a *biddable known unknown* — the contractor tells you upfront whether they can meet the budget. If they cannot, the theory must be revised to fit reality, not the other way around.

  **The Data Graveyard Protocol (Legacy Path)**: MIT Scholar's decomposition includes a pre-commitment to failure documentation. An MIT Scholar presets that 90% of research projects will fail — but the wreckage must be publishable. This means:
  - **Full-instrumentation**: Every experiment includes measurement hooks by default, not by retrofit.
  - **Control group design**: Even exploratory projects include a null hypothesis, so failure is interpretable.
  - **Failure mode documentation**: The protocol requires writing "How this will fail" in the same detail as "How this will succeed."
  - **Why this converts unknown unknowns**: "What will I learn if this project fails?" is itself a known unknown — it can be named and answered. By pre-committing to this question, the MIT Scholar converts a potential unknown (the unexamined failure) into a known unknown (the failure mode with a documentation plan).

---

## Step 4: Error Budget Assignment

### What It Is

Attach concrete confidence, survival conditions, and lethality to every node. This is where the uncertainty map stops being an analytical exercise and becomes a weapon.

### The Three Attributes

**Confidence** — High / Medium / Low / Zero.

This is not "how sure am I." It is: **"If this node is wrong, how quickly would I find out?"**

- **High**: Failure would surface within hours or days. The failure mode is obvious and local.
- **Medium**: Failure would surface within weeks. Might not be immediately obvious.
- **Low**: Failure would take months to surface, or the failure mode is obscured by confounding factors.
- **Zero**: No basis for confidence. Guessing.

**Survival Condition** — See the standalone definition above. The pair of "Alive if" / "Dead if" statements that define when this node is viable and when it must be abandoned. If you cannot write both sentences in plain language, you do not understand the node well enough to include it.

**Lethality** — A specific list of downstream nodes that die if this node dies.

Not "this would have broad impact." "If this node dies, nodes X, Y, and Z also die." Specific.

### The Hard Constraint

A node with "High" confidence but no written survival condition is automatically downgraded to "Low." No exceptions. If you cannot state what "alive" and "dead" mean in concrete terms, your confidence is not in the node — it is in your ability to sound authoritative. That is not the same thing, and the protocol treats it accordingly.

### How It Manifests Across Contexts

- **Technical architect**: The error budget becomes a specification document. Not "build a recommendation system" — "Recall phase: allow 15% miss rate on edge cases, but false positive rate must stay below 3% because my theoretical model breaks above that threshold. UI latency: 200ms jitter is acceptable, but data timestamps must be millisecond-precise and tamper-proof because they feed into causal analysis." The budget makes uncertainty *biddable* — a contractor can tell you whether they can meet it or not.
- **Non-technical founder**: The error budget is a **time-leveraged test chain**. "Days 1-2: validate one fatal assumption with 5 real humans. Days 3-4: build a fake product using existing tools (WeChat bot, Google Forms, Notion database) and test it on a second group. Days 5-7: burn everything with the word 'probably' in it. Keep only what reality hit you with." If the direction is wrong, you spent 7 days, not 7 months.
- **Decision-maker**: The error budget is expressed in *capital efficiency*. "Spend $50 to collect 20 competitor complaint keywords. Spend one coffee meeting to determine if the technical direction is viable. Spend zero time on anything else until both of those return." Every dollar and every hour is assigned to a specific uncertainty, with a defined "stop" condition.
- **MIT Scholar**: The error budget is an **error budget in the literal sense of the term** — a mathematical allocation of permissible deviation across the system. Each subsystem receives a numerical error tolerance, and the system as a whole has a total error budget that must not be exceeded. If the theoretical layer demands epsilon < 0.01, and the engineering layer can only deliver epsilon < 0.05, the protocol does not say "try harder." It says: "the theory must be revised to tolerate epsilon = 0.05, or the project must not be built." Theory does not override reality. The practical implication for projects with research-grade uncertainty: the error budget is the *contract between theory and engineering*. Without it, you are building blind. With it, every failure surfaces as a specific, measurable budget violation rather than a vague "something went wrong."

---

## Step 5: The Anti-Shell Self-Check

### What It Is

The final gate. The first four steps can be executed faithfully and still produce something that *looks* rigorous but isn't. This step catches the specific failure modes that turn honest process into a polished shell.

### Five Hard Checks

**1. Survival Condition Check.**
Does every node have a concrete, observable survival condition? "The team builds the feature" is not a survival condition. "50 users return to the product 3 times in their first week" is. If any node lacks this, either write the condition or delete the node.

**2. Jargon Check.**
Scan for phrases that consume space without creating knowledge: "leverage best practices," "implement robust architecture," "ensure scalability," "optimize user experience." If a statement cannot be translated into a concrete action or a measurable outcome, it is noise. Delete it.

**3. Uncertainty Ratio Check.**
Is Yellow + Red at least 30% of all nodes? If not, you are deceiving yourself. The natural tendency — even with honest intent — is to over-classify as Green. "Green" feels productive. "Red" feels like admitting incompetence. It is not. Red is the whole point. That is where the unknown unknowns live, and converting them is the entire mission.

(Note: this ratio is an empirical heuristic, not a calibrated threshold. It exists to catch overconfidence, not to enforce a number. If you have strong evidence that a different ratio is more honest for your specific context, use that instead.)

**4. Honesty Check.**
Is there at least one explicit, unhidden "I don't know" in the output? Not hedged, not qualified, not footnoted. A plain, visible statement of genuine ignorance. If there isn't one, either the project is trivial or the executor is lying about their uncertainty.

**5. Actionability Check.**
If the user starts acting this afternoon, what is the very first step? Must be answerable in one sentence. Not "begin research." Not "explore options." A specific action: "Email five people in [specific community] and ask them [specific question]." If you cannot answer this, the protocol has failed. The entire purpose of decomposition is to make the first step visible. If after four steps of honest analysis you still cannot name it, the analysis is too abstract.

### Resolution

If any check fails, return to the corresponding step and correct. Re-run all five checks. Repeat until all pass.

Each cycle sharpens the output. A first pass might fail checks 2 and 3. A second pass might fail check 1. A third pass passes all five — and that output will be structurally, visibly different from anything a standard AI planning session produces. It will have rough edges. It will have explicit gaps. It will make the user slightly uncomfortable. That is the point. Comfort is not a metric. Honesty is.

---

## Protocol Constraints

These are not steps. They are the physics within which the steps operate.

**The output is an actionable uncertainty map, not a report.** A report informs. A map directs. The user should look at the output and know what to do next.

**The protocol is domain-agnostic.** It operates on cognition, not on objects. Same five steps for software, startups, research, life decisions.

**The protocol does not prescribe output format.** Conversation, document, spreadsheet, tweet thread, whiteboard — format is application-layer. This protocol defines the thinking, not the rendering.

**The protocol is iterative, not linear.** Step 3 often reveals elements that belong in Step 2, which might require revisiting Step 1. The self-check in Step 5 catches these loops. Don't fight them.

**The protocol adapts to the cognitive position of the executor.** A technical architect, a non-technical founder, a decision-maker, and an MIT scholar all execute the same five steps. But the *shape* of the output changes — heat maps and dynamic nodes for the architect, human-equivalence plans and test chains for the founder, decision cards for the capital-holder, falsifiability stacks and error budgets for the scholar. The protocol is universal; its manifestations are contextual.

**The protocol has exactly two metrics: honesty and actionability.** Every design decision in this document serves one or both. If something makes the output more honest or more actionable, it belongs. If it makes the output look more impressive without improving honesty or actionability, it does not belong.

### Cognitive Debt: What This Protocol Actually Manages

The Decomposer Protocol manages only **cognitive debt** — the set of questions that must be answered by the person executing the protocol. It does not manage engineering debt.

**Definition**: A problem is cognitive debt if it requires personal judgment, domain knowledge, or creative synthesis to resolve. A problem is engineering debt if it can be delegated to someone who knows nothing about the project's context.

**Test**: "Can I give this to someone who has never heard of this project, and they can execute it correctly?" If yes, it is engineering debt. If no, it is cognitive debt.

**The protocol's scope**: The five steps handle only cognitive debt decomposition. Engineering debt resolution (e.g., "write the code", "set up the database", "hire the team") is left to external tools and processes. Confusing the two is the most common source of protocol failure — a user who maps "deploy the server" as a Yellow node but "should we build this at all" as a Green node has inverted the debt.

**Example**:
- Cognitive debt: "Does the market need this?" "Will the physics work?" "Is the math correct?"
- Engineering debt: "Which cloud provider?" "React or Vue?" "How many database shards?"

### Scale Adaptation: When to Use This Protocol and How Deep to Go

The protocol's five steps are universal, but their *granularity* must adapt to the scale of the problem. Applying the full protocol to a simple task is wasteful; applying a superficial version to a complex system is dangerous. Use the following matrix to calibrate:

| Project Complexity | Suggested Usage | Granularity |
|-------------------|----------------|-------------|
| Simple (1 person, 1 week) | Step 5 only (Anti-Shell Self-Check) | 5 minutes, 3-5 nodes |
| Moderate (3-5 people, 1 month) | Full five steps, lightweight | 10-20 nodes, 30-60 minutes |
| Complex (team, quarterly) | Full five steps + hierarchical decomposition | 20-50 nodes, 2-4 hours |
| Ultra-complex (organization, annual) | Full five steps, decomposed by subdomain | Each subdomain mapped independently |

**When NOT to use the protocol:**
- The task is already well-understood and executable. You do not need to decompose what you already know how to do.
- The team is in active execution sprint with no new information. The protocol is for *before* execution, not during.
- The user explicitly wants a fast answer, not a deep analysis. In this case, provide the answer directly — the protocol is a tool, not a dogma.
- The emotional cost of honest uncertainty mapping would paralyze rather than enable. The protocol is honest about its own limits: it is not suitable for every situation.

**For teams and organizations:**
Assign a single "decomposer" role per session. This person runs the protocol while others contribute domain knowledge. Do not attempt to run the protocol as a group consensus exercise — it produces better output with a single decision-maker and multiple informants.

---

## The Ultimate Test

Apply this protocol to a project you care about.

If the output is measurably different from what a standard AI planning session would produce — if it contains explicit uncertainty annotations, if every node has a survival condition, if at least 30% of the map is Yellow or Red, and if you can name the first concrete action — the protocol worked.

If the output looks like a polished project plan with confident language and comprehensive coverage, the protocol failed. Start over. You took the path of least resistance.

---

## End-to-End Worked Example: "Build the Next TikTok"

This example runs a single request through all five steps so you can see the protocol's full execution path.

**Request**: "I want to build a short-video platform like TikTok, but for a niche audience. I don't know how to code and I have a limited budget."

### Step 1 Applied: Honesty Fuse

> **What I can address**: I can help you identify the core assumptions that would kill this idea before you spend any money. I can design a manual test that simulates the platform without writing any code.
>
> **Where I am blind**: I do not know your niche audience, what content format they prefer, whether they currently use existing platforms, or what your budget ceiling is. I also cannot tell you whether this market has room for a new entrant — that is an empirical question.
>
> **Collapse risk**: You build a platform before validating that anyone in your niche wants a dedicated short-video experience. The most likely outcome is: you launch, nobody comes, and you cannot tell whether the idea was wrong or the execution was wrong.

### Step 2 Applied: Uncertainty Mapping

Elements identified and classified:

| Element | Zone | Rationale |
|---------|------|-----------|
| Niche audience exists and wants this | Red | No data yet; we don't know if the problem is real |
| Manual content creation workflow | Green | Can be done with a shared folder and a phone |
| User acquisition without paid ads | Yellow | Known question, unknown answer — depends on the niche |
| Platform hosting setup | Green | Standard web hosting, well-understood |
| Recommendation algorithm | Yellow | Need is clear, approach is not — but irrelevant until user demand is confirmed |
| Monetization model | Red | Cannot design this until we know who the users are and what they value |
| Content moderation at scale | Red | Not relevant until we have users; belongs in a later iteration |
| First 100 users from organic channels | Yellow | Strategy exists, feasibility depends on niche |

**Zone distribution**: Green: 2 (25%), Yellow: 3 (37.5%), Red: 3 (37.5%). Passes the 70% rule — uncertainty is honestly represented.

### Step 3 Applied: Hierarchical Decomposition

**Transition from flat map to tree:**

Root unknown identified: "Niche audience exists and wants this." Everything else depends on this question.

Dependency test applied:
- "Manual content creation workflow" and "Platform hosting setup" are independent — they can be done in parallel regardless of the root's outcome.
- "User acquisition" depends on knowing who the users are.
- "Recommendation algorithm" depends on user demand existing (it is irrelevant if nobody uses the platform).
- "Monetization model" depends on knowing the user profile.
- "Content moderation at scale" depends on user demand existing.

Resulting tree:
```
Niche audience exists and wants this ← RED — root
  ├── User acquisition (depends on knowing the niche) ← YELLOW
  ├── Monetization model (depends on user profile) ← RED
  ├── Recommendation algorithm (depends on user demand) ← YELLOW
  └── Content moderation at scale (depends on user demand) ← RED

Manual content creation workflow ← GREEN — independent leaf
Platform hosting setup ← GREEN — independent leaf
```

**Node states:**
- **Executable**: Manual content creation workflow, Platform hosting setup
- **Pending Validation**: User acquisition, Recommendation algorithm, Monetization model
- **Blind Zone**: Content moderation at scale, Niche audience validation

### Step 4 Applied: Error Budget Assignment

Three key nodes fully assigned:

| Node | Confidence | Survival Condition | Lethality |
|------|-----------|-------------------|-----------|
| Niche audience validation | Low | Alive if: 20 people from the niche voluntarily submit content via a manual process within 2 weeks. Dead if: fewer than 5 submit after direct invitation. | Kills: everything downstream |
| Manual content creation | High | Alive if: one person can produce and publish 5 pieces of content per day using a phone and basic editing tools. Dead if: production takes more than 2 hours per piece. | Nothing (independent) |
| User acquisition | Medium | Alive if: at least 50 people from the niche join a waitlist or follow a dedicated account after a targeted outreach campaign. Dead if: outreach to 200 people yields fewer than 10 sign-ups. | Kills: monetization model |

### Step 5 Applied: Anti-Shell Self-Check

**Check 1 — Survival Condition**: All three assigned nodes have concrete survival conditions. The remaining nodes (recommendation algorithm, monetization model, content moderation) are marked as dependent on the root — they inherit their survival conditions from the root's outcome. **Pass.**

**Check 2 — Jargon**: Scanned for "leverage," "optimize," "robust," "best practice." None found. Descriptions are concrete. **Pass.**

**Check 3 — Uncertainty Ratio**: Green: 2 (25%), Yellow: 3 (37.5%), Red: 3 (37.5%). Yellow+Red = 75%. **Pass.**

**Check 4 — Honesty**: Explicit "I don't know" present in Step 1: "I cannot tell you whether this market has room for a new entrant." **Pass.**

**Check 5 — Actionability**: First step: "Identify 20 people in your target niche and offer them a simple way to submit short-form content manually (via email, WhatsApp, or a shared folder). Do not build anything. Do not write code. Just see if they engage." **Pass.**

### What the Output Tells You

The actionable first step is clear: validate the niche audience manually before building anything. The two Green nodes (manual content creation, hosting setup) can be parallelized, but they should be kept minimal — just enough to support the validation. The three Red nodes (monetization, content moderation, recommendation algorithm) are explicitly deferred until the root is resolved.

This is structurally different from what a standard AI planning session would produce. A standard session would generate a 20-module roadmap with confident timelines. This output says: "Here is the one thing you need to know first. Here is how to test it for free. Everything else waits."

---

## Empirical Validation Framework

The protocol makes claims about its own effectiveness. Those claims should be tested. This section provides three concrete experiment designs for validating whether the protocol works in your specific context.

### Epistemic Status

The protocol is currently a heuristic method, not a validated theory. Its confidence assignments and the 70%/30% uncertainty ratio are empirical heuristics, not statistically calibrated thresholds. The protocol does not claim originality — it integrates known practices from cognitive science, systems engineering, and decision theory. The following validation framework is intended to move the protocol from "heuristic claim" to "testable hypothesis."

### Experiment 1: Retrospective Stress Test (2 hours, highest recommendation)

**Purpose**: Test whether the protocol would have predicted real-world failures you already experienced.

**Procedure**: Take a project from the past 6 months that had significant unexpected blockers. Feed the original AI-generated plan through the protocol's five steps. Count the Red (Unknown-Unknown) nodes produced by the protocol, then compare them against the actual blockers encountered during execution.

**Key metric**: Red node hit rate — what percentage of actual blockers were predicted by the protocol's Red zone elements?

- If Red node hit rate >= 70%: the protocol has high practical value for your context. It would have surfaced the walls before you hit them.
- If Red node hit rate < 30%: the protocol is not useful for your context. Your blind spots are not where the protocol looks.

**Implementation tip**: Focus on the survival conditions. If a survival condition reads like a platitude (e.g., "system is stable"), it is not a real survival condition. A real survival condition must be quantifiable (e.g., "QPS > 100 and latency < 200ms"). Weak survival conditions are the most common cause of false negatives in this test.

### Experiment 2: Parallel Controlled Experiment (1 week, most rigorous)

**Purpose**: Evaluate whether the protocol improves task decomposition quality compared to a standard AI planning approach.

**Procedure**: Take two tasks of comparable difficulty (A and B). Split the team into two groups (or split your own time across two sessions). Task A uses a standard AI prompt to produce a plan. Task B uses the full Decomposer protocol. Execute both tasks. Track two metrics:

1. **Plan change rate**: the number of times the core architecture or approach is modified during execution due to newly discovered constraints. The Decomposer group should have a significantly lower rate.
2. **Hallucination detection rate**: the proportion of modules in the plan that "seemed feasible but actually were not." The protocol's Anti-Shell Self-Check should filter out more hallucinations.

### Experiment 3: Blind Spot Hunting (30 minutes, most practical)

**Purpose**: Test whether the protocol's Anti-Shell Self-Check (Step 5 alone) catches plan weaknesses that standard review processes miss.

**Procedure**: Take any existing plan (yours, your team's, or an AI-generated one). Run only Step 5 — the five checks — on the plan. Count how many checks fail. For each failure, record whether the issue would have been caught by a standard peer review or code review.

**Key insight**: If Step 5 catches issues that peer review misses, the protocol provides value as a *red-teaming tool* even without executing the full five steps. This is the most cost-effective way to test the protocol's value proposition.

### Final Recommendation

Do not use the protocol as a production process. Use it as a *red-teaming tool* — a structured way to stress-test plans before committing resources. The protocol's highest value is not in producing better plans, but in catching worse ones.