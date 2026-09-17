# Tension Mining — Dialogue Example

> A complete user-AI interaction demonstrating the full 7-phase pipeline.
> Topic: Designing a decentralized identity system.
> This example shows the Inversion pattern (AI interviews the user), gate conditions, error handling, Common Rationalizations defense, and quality rubric application.

---

## Context

**User:** "I want to build a decentralized identity system for a peer-to-peer marketplace. Users need to establish reputation without a central authority. What should the algorithm look like?"

**AI (Internally):** This matches the tension-mining trigger: "designing a protocol or multi-agent system from scratch." The user is asking for an algorithm before understanding the tensions. I should activate the skill and start from Phase 1.

---

## Phase 1: Phenomenon Mining

**AI:** Let's step back from algorithms for a moment. Before we design anything, let's understand the forces at play. I'd like to start by collecting real-world phenomena where identity and reputation emerge without central authority.

**Question 1:** "What real-world systems (natural, social, or technological) exhibit reputation or identity emerging without a central authority?"

**User:** "I guess eBay ratings? Amazon reviews? Forums maybe?"

**AI:** Those are good starts — they involve reputation systems. But they still have central authorities (eBay, Amazon own the ratings). Let me ask:

**Question 2:** "Can you identify at least one system outside your target domain that shows a similar pattern? Perhaps in nature or society?"

**User:** "Hmm... academic citation networks? Paper reputation depends on citations, not a central authority."

**AI:** Excellent. That's a strong cross-domain phenomenon.

**Question 3:** "What other systems maintain reputation or trust without central control?"

**User:** "Street food vendors in dense cities — they develop reputation through word of mouth. Tribal societies where your reputation precedes you through oral tradition."

**AI:** Great broadening. Let me push for one more extreme case:

**Question 4:** "What would you consider the 'extreme case' — where reputation matters most but central authority is most clearly absent?"

**User:** "Wikipedia? Anyone can edit, but the system produces reliable content through community review. There's no single authority deciding what's true."

**AI:** Perfect. So we have phenomena from: e-commerce (eBay/Amazon), academia (citations), anthropology (tribal reputation, street vendors), and online collaboration (Wikipedia). That's 4+ domains.

### Gate Check

**AI:** "You have collected 5 phenomena from at least 4 distinct domains. The next phase (Tension Mining) requires identifying forces that shape these phenomena. Shall we proceed?"

**User:** "Yes, let's move on."

---

## Phase 2: Tension Mining

**AI:** Now let's identify the forces that shape your phenomena. Remember, tensions are not "problems to solve" — they are tradeoffs that cannot be permanently eliminated.

**Question 1:** "For each phenomenon, what force pushes the system in one direction, and what fights back?"

**User:** "For Wikipedia — openness lets anyone contribute, but that creates reliability problems. So Openness vs Reliability?"

**AI:** That's exactly right. Openness lets information flow freely; reliability requires gatekeeping. Neither can be eliminated.

**Question 2:** "What about academic citations — what's the tension there?"

**User:** "Novelty vs Verifiability? New ideas get attention, but they need supporting citations and reproduction... which nobody does because it's not rewarded."

**AI:** Great. You're already seeing the over-optimization consequences: too much novelty produces unreproducible science; too much verification kills innovation.

**Question 3:** "And the street vendor case?"

**User:** "I think... Adaptability vs Consistency. Vendors adapt to local tastes, but building reputation requires consistent quality. If you change your menu too often, people can't count on you."

**AI:** Now let's distill these into a tension map. Let me ask:

**Question 4:** "Which tension do you think is the most fundamental — the one that drives the others?"

**User:** "Probably Identity vs Accountability. You need stable identity for reputation to work, but accountability requires linking identity across contexts — which threatens privacy. That tension seems to underlie everything."

### Gate Check

**AI:** "You have identified at least 4 tensions (Openness vs Reliability, Novelty vs Verifiability, Adaptability vs Consistency, Identity vs Accountability) with clear Force A/B and over-optimization consequences. The next phase (Invariant Mining) looks for patterns that hold across all these tensions. Proceed?"

**User:** "Yes."

---

## Phase 3: Invariant Mining

**AI:** Let's extract principles that appear across multiple tensions and domains.

**Question 1:** "Looking across all the tensions, what pattern appears in multiple domains?"

**User:** "Reputation seems to be a 'slow to build, fast to destroy' phenomenon in every domain. A street vendor takes years to build trust and one bad batch to lose it. A Wikipedia editor builds credibility through thousands of edits but one vandalism destroys it."

**AI:** That's a strong cross-domain pattern. Can we state that as an invariant?

**User:** "Reputation is asymmetric: accumulation is slow and costly, destruction is fast and cheap."

**AI:** Good. **Question 2:** "When would this principle NOT apply?"

**User:** "When reputation is anonymous or ephemeral. If identities are disposable, there's no accumulated reputation to destroy. Tor nodes, for example — they rotate frequently, so reputation doesn't accumulate."

**AI:** Excellent boundary condition. **Question 3:** "Any other invariants?"

**User:** "Gating mechanisms. In every system, there's a threshold that separates trusted from untrusted. For Wikipedia, it's the number of edits. For academic citations, it's the h-index. For street vendors, it's how long they've been in business."

**AI:** So "gating mechanisms create trust shortcuts." Let me check: does this also apply to eBay ratings?

**User:** "Yes — you need 10+ positive reviews before most people will buy from you. The gate protects against newcomers who might be bad actors."

### Gate Check

**AI:** "You have extracted 2 cross-domain invariants with boundary conditions. The minimum is 3. Can you find one more?"

**User:** "Reputation is domain-specific but signals are portable. A great chef doesn't automatically make a great accountant. But if I know someone is reliable in one domain, I'm more likely to trust them in another. This is why LinkedIn recommendations work — reputation leaks across domains."

**AI:** Perfect. Three invariants: (1) Reputation asymmetry, (2) Gating mechanisms, (3) Domain specificity with leaky signals. All with clear boundary conditions.

---

## Phase 4: Mechanism Mining

**AI:** Now let's study how reality resolves the tensions.

**Question 1:** "For the Identity vs Accountability tension, how does the real world handle it?"

**User:** "Pseudonymity with linkability. In academia, ORCID IDs provide persistent identity without revealing your real name. In street markets, vendors have consistent stall locations — the location acts as a persistent pseudonym."

**AI:** That's Mechanism 1: Persistent Pseudonyms. **Question 2:** "For Openness vs Reliability on Wikipedia?"

**User:** "Peer review before publication. Each edit is visible, and the community can revert bad edits. The mechanism is transparent audit trails."

**AI:** Good — Mechanism 2: Transparent Audit Trails.

**Question 3:** "Is there a mechanism that addresses more than one tension?"

**User:** "Reputation scores — they address both Identity vs Accountability (by linking behavior to identity) and Adaptability vs Consistency (by providing a history). They partially address Openness vs Reliability too — reputation score acts as a signal of reliability."

**AI:** That's the cross-cutting mechanism.

**Question 4:** "When does the reputation score mechanism break down?"

**User:** "When scores can be gamed (sybil attacks, fake reviews). When scores are the only signal (ignoring context). When scores can't be transferred between domains."

### Gate Check

**AI:** "You have identified 3+ mechanisms mapped to tensions. Proceed to System Synthesis?"

---

## Phase 5: System Synthesis

**AI:** Let's combine everything into a coherent model.

**Question 1:** "Of all the tensions, which is the most fundamental?"

**User:** "Identity vs Accountability. If you can't establish persistent identity, reputation can't form. But if identity is too persistent, privacy is lost. All other tensions flow from this choice."

**AI:** **Question 2:** "What is the minimal set of components that explains the system?"

**User:** "Persistent pseudonyms + reputation accumulation + domain-specific gating thresholds + cross-domain signal leakage."

**AI:** **Question 3:** "What failure modes does this model predict?"

**User:** "Sybil attacks if identity creation is too cheap. Privacy loss if pseudonyms are too linkable. Echo chambers if gating thresholds create insular communities. Signal inflation if reputation is transferable across too many domains."

### System Model Summary

- **Core tension:** Identity vs Accountability
- **Core invariants:** Reputation asymmetry, Gating mechanisms, Domain specificity with leakage
- **Core mechanisms:** Persistent pseudonyms, Transparent audit trails, Reputation scores
- **Expected behaviors:** Trust emerges slowly, is maintained through consistent behavior, and transfers partially across domains
- **Failure modes:** Sybil attacks, privacy breaches, echo chambers, signal inflation

---

## Phase 6: Algorithm Synthesis

**AI:** Now — finally — we can derive algorithm candidates.

**Question 1:** "If Persistent Pseudonyms were a computational process, how would it work?"

**User:** "Each user generates a cryptographic key pair. Their public key is their identity. They can generate multiple key pairs for different domains, preventing cross-domain tracking while maintaining reputation within each domain."

**AI:** **Question 2:** "What would the algorithm look like?"

**User:** "A directed graph where nodes are pseudonyms and edges are trust signals. When user A completes a trade with user B, they rate each other. The rating is a signed message: `sign(A, "B: +1 | context: transaction_id | domain: marketplace")`."

**AI:** Good. What about the gating mechanism?

**User:** "A threshold function: `trust(A) = sum(weighted_ratings(A)) > threshold(domain)`. Different domains require different thresholds. The threshold adapts based on the domain's risk profile."

### Algorithm Candidates

1. **Pseudonymous Key Registry** — Users register public keys per domain; cross-domain key rotation prevents tracking
2. **Signed Reputation Graph** — Directed, signed graph of trust signals with cryptographic verification
3. **Domain-Adaptive Gating** — Threshold function with domain-specific parameters
4. **Cross-Domain Signal Transfer** — Weighted trust leakage between connected identities

---

## Phase 7: Destruction Phase

**AI:** Now we attack the model. Assume everything we've built is wrong.

**Question 1:** "What is the single most questionable assumption?"

**User:** "That users will behave honestly in their ratings. In practice, rating systems are plagued by strategic behavior: collusion (friends rate each other highly), retaliation (bad rating leads to revenge rating), and bribery (paying for positive ratings)."

**AI:** **Question 2:** "What tension did we miss?"

**User:** "Cooperation vs Competition. We assumed users want to cooperate in building an honest reputation system. In reality, marketplace participants compete, and there's strategic incentive to manipulate reputation."

**AI:** **Question 3:** "What redesign would you propose based on this?"

**User:** "We need to make ratings costly or scarce. Option 1: require a small stake (like a deposit) to rate someone. If the rating is statistically anomalous, the deposit is forfeited. Option 2: limit the number of ratings each user can give per time period, making each rating a scarce resource."

### Failure Analysis

| Category | Finding |
|----------|---------|
| **Weak assumptions** | (1) Honest ratings, (2) Stable identity across sessions, (3) User willingness to manage keys |
| **Missing tensions** | Cooperation vs Competition, Cost vs Accessibility |
| **Missing invariants** | "Trust requires friction" — easy trust is fragile trust |
| **Missing mechanisms** | Stake-based rating, Reputation amortization, Decay of old reputation |
| **Redesign proposals** | (1) Stake-weighted ratings, (2) Time-decaying reputation, (3) Domain-specific reputation with explicit portability costs |

---

## Quality Rubric Evaluation

**AI (loads `references/quality-rubric.md`):** Let me evaluate our analysis.

### D1 — Phenomenon Quality: Score 3
10+ phenomena from 4+ domains (e-commerce, academia, anthropology, online collaboration), including the "street vendor" cross-domain analogy.

### D2 — Tension Depth: Score 3
5+ tensions with clear Force A/B, over-optimization consequences, and "why ineliminable" reasoning. Identity vs Accountability identified as the fundamental driver.

### D3 — Invariant Validity: Score 2
3 invariants with cross-domain support and boundary conditions. However, the "leaky reputation" invariant could benefit from a fourth supporting domain.

### D4 — Mechanism Map: Score 3
3+ mechanisms clearly mapped to tensions and invariants, with failure mode analysis for each.

### D5 — Destruction Depth: Score 3
5 weak assumptions identified, 2 missing tensions, 1 missing invariant, 2 missing mechanisms, 2 concrete redesign proposals.

### Overall: 14/15 — Professional-grade

Rating: **Professional-grade**. The analysis is ready for publication or implementation. Consider strengthening D3 with one additional domain before finalizing.

---

## Key Lessons from This Dialogue

1. **The Inversion pattern works:** By asking questions one at a time, the AI guided the user from vague intuition ("I want decentralized identity") to a structured system model with testable claims.

2. **Gate conditions prevent skipping:** Before Synthesis, the user could only discuss mechanisms. Before Algorithms, only system properties. This prevented premature algorithmization.

3. **Common Rationalizations resisted:** When the user initially asked "What algorithm?" the AI redirected to phenomenon collection. This was a critical activation of the Common Rationalizations table in SKILL.md.

4. **The Destruction Phase is not optional:** It revealed the "Cooperation vs Competition" missing tension — arguably the most critical oversight of the entire analysis. Without this phase, the algorithm would have failed in practice.

5. **Rubric enforces quality:** The 14/15 score tells the user the analysis is strong but D3 could be improved. This provides a clear action item rather than vague "good job" feedback.