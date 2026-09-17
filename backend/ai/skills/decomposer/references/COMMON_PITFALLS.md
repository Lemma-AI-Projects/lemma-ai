# Common Pitfalls in Executing the Decomposer Protocol

> This document catalogs the most frequent errors observed during protocol execution, along with their causes, corrections, and prevention strategies.

---

## Pitfall 1: The "I Know Everything" Trap

**Error**: The uncertainty map has 90%+ Green nodes. The user confidently classifies almost everything as "Known-Known."

**Why it happens**: The protocol's Step 2 asks you to classify elements. The natural psychological response is to classify as Green because Green feels productive and competent. The 70% rule exists specifically to catch this, but users often apply it as a rubber stamp rather than a genuine check.

**How to fix**: Force yourself to apply the Probe Toolkit techniques (Boundary Puncture, Reverse Interrogation, Legacy Presumption) before the mapping. If you cannot puncture a Green element, write down three specific failure modes for it. If you cannot name three, the element is likely a shell, not a genuine Green.

**Prevention**: Before starting the mapping, write down three specific things you do not know about this project. If you cannot, you are not being honest with yourself.

---

## Pitfall 2: The "Jargon Shield"

**Error**: The protocol output contains phrases like "leverage best practices," "implement robust architecture," "ensure scalability," or "optimize user experience." The user believes these are substantive statements.

**Why it happens**: Jargon is a linguistic shortcut. It sounds authoritative without requiring specific knowledge. It is the most common way that shells enter the protocol output, because the user (or the AI) fills a gap with a phrase that sounds like it contains information but does not.

**How to fix**: Apply the Jargon Check (Step 5, Check 2) aggressively. For every phrase, ask: "Can I translate this into a concrete action or a measurable outcome?" If not, delete it. Replace "ensure scalability" with "test with 1000 concurrent users and confirm latency stays under 200ms."

**Prevention**: Before writing any protocol output, pre-commit to using only concrete, measurable language. If you catch yourself using a jargon word, stop and ask: "What is the specific thing I am trying to say here?"

---

## Pitfall 3: The "Survival Condition as Wish"

**Error**: A survival condition that reads like a platitude rather than a falsifiable test. Examples: "Alive if: the system is stable." "Alive if: users are happy." "Alive if: the team executes well."

**Why it happens**: The user understands that survival conditions are required, but writes them in a way that cannot actually be tested. "Stable" and "happy" are not measurable states. They are descriptions of desired outcomes, not falsifiable conditions.

**How to fix**: Apply the "Grandma Test" — if you cannot explain the survival condition to a non-expert in one sentence using concrete numbers, it is not a real survival condition. "Alive if: 50 users return 3 times in their first week" passes the test. "Alive if: users are engaged" does not.

**Prevention**: Use the template: "Alive if: [specific number] [specific behavior] within [specific time frame]. Dead if: [specific number] [specific behavior] within [specific time frame]."

---

## Pitfall 4: The "Functional Decomposition Masquerade"

**Error**: The hierarchical decomposition (Step 3) produces a functional breakdown instead of a cognitive dependency tree. Example: "User management → Login → Password reset → Profile editing" instead of "Do users want this? → Will they pay? → Can we build it?"

**Why it happens**: Functional decomposition is the default mode of thinking. It is how most people have been trained to plan. The protocol explicitly warns against this, but the habit is strong.

**How to fix**: After building the tree, ask: "If I delete the top node, do the bottom nodes still make sense?" If yes, the tree is functional, not cognitive. A cognitive tree should have the property that deleting a root node makes the dependent nodes meaningless.

**Prevention**: Before starting Step 3, write the question "What do I need to know first?" at the top of your page. If you find yourself writing "What are the parts?" instead, stop and restart.

---

## Pitfall 5: The "Confidence Without Evidence"

**Error**: A node is assigned "High" confidence but has no written survival condition. The user believes the node is "obviously" correct.

**Why it happens**: Confidence is often based on intuition, not evidence. The protocol's hard constraint (High confidence without survival condition → automatically downgraded to Low) exists to catch this, but users often skip writing the survival condition because they "know" the node is safe.

**How to fix**: Apply the hard constraint rigorously. If a node is marked High, force yourself to write the survival condition. If you cannot, the confidence is not grounded in anything testable.

**Prevention**: Use the rule: "If you cannot write the survival condition, the confidence is Low by default."

---

## Pitfall 6: The "One-Pass Illusion"

**Error**: The user runs the protocol once, produces a map, and considers the job done. Months later, the map is still the same, and the project has changed significantly.

**Why it happens**: The protocol produces a satisfying artifact (the uncertainty map). The user mistakes the artifact for the process. But the protocol is an iterative loop — one pass reveals one layer of uncertainty; the next pass reveals the next layer.

**How to fix**: Schedule a protocol re-execution at regular intervals. For a moderate project, re-run every 2 weeks. For a complex project, re-run monthly. The second pass should always be faster than the first because you have more information.

**Prevention**: At the end of each protocol execution, write a calendar reminder for the next re-execution. The reminder should say: "Re-run the Decomposer protocol. The old map is outdated."

---

## Pitfall 7: The "Red Zone Avoidance"

**Error**: The user classifies as few Red nodes as possible. Red nodes are treated as "we don't know enough" rather than "this is the most important part of the map."

**Why it happens**: Red nodes are uncomfortable. They represent genuine ignorance. The natural tendency is to minimize them by either classifying them as Yellow (optimistic) or by not identifying them at all (avoidance).

**How to fix**: Remind yourself of the protocol's core message: Red is the whole point. The conversion of Red to Yellow is the only unit of progress that matters. A map with no Red nodes is worthless — it is a map of what you already know.

**Prevention**: Before starting the mapping, set a minimum Red node target: "I will identify at least 3 Red nodes. If I cannot, I am not thinking hard enough."

---

## Pitfall 8: The "Protocol as Crutch"

**Error**: The user relies on the protocol to produce insight that only domain expertise can provide. The protocol becomes a substitute for thinking rather than a structure for thinking.

**Why it happens**: The protocol looks comprehensive. It is easy to mistake the process of filling in the template for the process of understanding the problem. But the protocol cannot manufacture domain knowledge — it can only structure what you already know and surface what you do not.

**How to fix**: If the protocol output feels shallow despite being well-structured, the problem is not the protocol. The problem is insufficient domain knowledge. Spend time learning the domain, then re-run the protocol.

**Prevention**: The protocol is a red-teaming tool, not a knowledge generator. Use it to catch bad plans, not to produce good ones from thin air.

---

## Pitfall 9: The "Group Consensus Trap"

**Error**: A team runs the protocol as a group exercise, trying to reach consensus on every node's classification. The result is a watered-down map where everyone's disagreement is averaged into a mushy middle.

**Why it happens**: Group decision-making tends toward the path of least resistance. In a group, difficult classifications (should this be Red or Yellow?) are often resolved by choosing the least controversial option, not the most honest one.

**How to fix**: Assign a single "decomposer" role per session. This person makes the final classification call. Other team members contribute information and challenge assumptions, but they do not vote. The decomposer is responsible for the final map.

**Prevention**: Before the session, agree: "The decomposer has the final say. If you disagree with a classification, present evidence, not opinion."

---

## Pitfall 10: The "Over-Engineering" Trap

**Error**: The user applies the full protocol with maximum granularity to a simple task. The result is a 50-node map for a task that could have been done in an afternoon.

**Why it happens**: The protocol is satisfying to execute. The process of mapping and classifying feels productive. It is easy to forget that the protocol is a means to an end, not an end in itself.

**How to fix**: Use the Scale Adaptation Guide (references/SCALE_GUIDE.md) to calibrate the protocol's depth to the task's complexity. For a simple task, run only Step 5. For a moderate task, keep the map to 10-20 nodes.

**Prevention**: Before starting, answer: "How much time is this protocol execution worth? If the answer is 'more than the task itself,' reduce the granularity."