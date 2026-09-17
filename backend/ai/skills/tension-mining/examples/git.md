# Tension Mining: Git

> How a tension between divergence and convergence enabled distributed collaboration.

---

## System Overview

Git, created by Linus Torvalds in 2005 for Linux kernel development, is now the dominant version control system. But Git did not begin as a better version control system. It began with a tension: how can thousands of developers work on the same codebase without constant conflict? The breakthrough was not better merge algorithms or faster operations -- it was recognizing that divergence is not a problem to eliminate, but a fundamental property of creative work that must be embraced and managed.

---

## Phase 1: Phenomenon Mining

**Goal:** Build a library of relevant real-world phenomena.

### Phenomenon 1: Text Evolution in Manuscripts
- **Domain:** History / Literature
- **Behavior:** Medieval manuscripts evolved through copying, annotation, and correction. Each copy introduced variations. Scholars reconstruct original texts by comparing divergent versions.
- **Why it matters:** Text evolution is inherently divergent. The "original" is often a reconstruction from multiple divergent copies. Version control is a form of textual archaeology.

### Phenomenon 2: Collaborative Writing
- **Domain:** Publishing / Academia
- **Behavior:** Academic papers go through rounds of revision with multiple authors. Each author maintains their own version. Reconciling changes is a major source of conflict.
- **Why it matters:** Creative collaboration naturally produces divergence. The challenge is not preventing divergence but managing convergence.

### Phenomenon 3: Code Branching in Software Development
- **Domain:** Software Engineering
- **Behavior:** Developers create branches to work on features independently. Eventually, branches must be merged back. Merge conflicts are inevitable.
- **Why it matters:** Branching is essential for parallel development, but merging is the hard part. The tension between parallel work and unified code is fundamental.

### Phenomenon 4: Merge Conflicts in Legal Documents
- **Domain:** Law / Contract Management
- **Behavior:** Contracts are negotiated through rounds of redlines. Each party proposes changes. The final document is a negotiated convergence of divergent versions.
- **Why it matters:** Legal negotiation is a form of version control with high stakes. The process of convergence is where value is created or destroyed.

### Phenomenon 5: Snapshot Systems in Photography
- **Domain:** Photography / Art
- **Behavior:** Photographers take multiple shots of the same scene. Each snapshot captures a moment. The final image is selected from a divergent set.
- **Why it matters:** Snapshots preserve history without judgment. The ability to return to any previous state is more valuable than incremental change tracking.

---

## Phase 2: Tension Mining

**Goal:** Identify forces that continuously shape the system.

### Tension 1: Divergence vs Convergence (`T-FRE-006`)
- **Force A:** Divergence (independent development, branching, experimentation)
- **Force B:** Convergence (merging, integration, unified codebase)
- **Why both matter:** Divergence enables parallel creativity; convergence ensures product integrity. Without divergence, development is serialized. Without convergence, the product fragments.
- **Over-optimizing Divergence:** Fragmented codebase, incompatible features, "integration hell"
- **Over-optimizing Convergence:** Bureaucratic approval processes, stifled innovation, fear of branching

### Tension 2: History vs Flexibility (`T-STA-009`)
- **Force A:** Immutable history (every change preserved forever)
- **Force B:** Flexible rewriting (ability to change history)
- **Why both matter:** Immutable history provides auditability and accountability. Flexible rewriting enables cleanup and simplification before sharing.
- **Over-optimizing History:** Cluttered history, exposed mistakes, inability to clean up
- **Over-optimizing Flexibility:** Loss of audit trail, confusion about what actually happened, potential for malicious rewriting

### Tension 3: Local vs Global State (`T-LOC-004`)
- **Force A:** Local state (each developer has their own repository)
- **Force B:** Global state (shared canonical repository)
- **Why both matter:** Local state enables offline work and experimentation. Global state provides the shared truth that collaboration requires.
- **Over-optimizing Local:** Divergence without convergence, "works on my machine", no shared baseline
- **Over-optimizing Global:** Centralized bottleneck, single point of failure, requires constant connectivity

### Tension 4: Simplicity vs Power (`T-SIM-017`)
- **Force A:** Simple, easy-to-use interface
- **Force B:** Powerful, flexible functionality
- **Why both matter:** Simplicity enables adoption by non-experts. Power enables experts to handle complex scenarios.
- **Over-optimizing Simplicity:** Inability to handle edge cases, hidden complexity, "magic" behavior
- **Over-optimizing Power:** Steep learning curve, footguns, complexity that breeds errors

---

## Phase 3: Invariant Mining

**Goal:** Discover patterns that appear across multiple phenomena.

### Invariant 1: Boundaries Shape Behavior (`I-BSB-001`)
- **Statement:** The structure of boundaries determines the patterns of behavior within and between systems.
- **Supporting phenomena:** Cell membranes, national borders, APIs, organizational boundaries
- **Explanation:** In Git, branches are boundaries. They create separate contexts where developers can work without interfering with each other. The boundary (branch) shapes behavior by enabling risk-taking within the branch while protecting the main codebase. Merge operations are boundary negotiations.

### Invariant 2: Identity Drives Cooperation (`I-IDC-001`)
- **Statement:** Shared identity markers enable cooperation beyond kin selection and reciprocal altruism.
- **Supporting phenomena:** National identity, corporate culture, cryptographic keys, green-beard effect
- **Explanation:** In Git, commits are signed with author identity. This identity marker enables accountability and trust in distributed collaboration. Developers cooperate not because they know each other, but because they can identify who made what change.

### Invariant 3: Local Rules Create Global Order (`I-LCG-001`)
- **Statement:** Local interactions between simple agents produce emergent global structure without centralized control.
- **Supporting phenomena:** Flocking birds, ant trail formation, traffic flow, distributed consensus
- **Explanation:** Each Git repository operates independently with local rules (commit, branch, merge). The global order (shared codebase) emerges from the local interactions (push, pull, merge) without a central coordinator. No single node controls the system.

---

## Phase 4: Mechanism Mining

**Goal:** Understand how reality resolves tensions.

### Mechanism 1: Directed Acyclic Graph (DAG)
- **Function:** Represents history as a graph of commits, enabling multiple parents and branches
- **Related tensions:** `T-FRE-006` (Divergence vs Convergence)
- **Related invariants:** `I-BSB-001` (Boundaries Shape Behavior)
- **Explanation:** Unlike linear version control, Git's DAG allows commits to have multiple parents (merges) and multiple children (branches). This graph structure naturally represents divergence and convergence without forcing a linear narrative.

### Mechanism 2: Content-Addressable Storage
- **Function:** Identifies objects by their content hash, enabling deduplication and integrity
- **Related tensions:** `T-LOC-004` (Local vs Global State)
- **Related invariants:** `I-IDC-001` (Identity Drives Cooperation)
- **Explanation:** Every object (blob, tree, commit) is identified by its SHA-1 hash. This means identical content is stored once regardless of how many times it appears. It also means integrity is verifiable -- if content changes, its hash changes.

### Mechanism 3: Three-Way Merge
- **Function:** Resolves divergence by comparing two branches against their common ancestor
- **Related tensions:** `T-FRE-006` (Divergence vs Convergence)
- **Related invariants:** `I-LCG-001` (Local Rules Create Global Order)
- **Explanation:** When merging two branches, Git finds their common ancestor and compares each branch against it. Changes that are the same in both branches are kept; changes that differ require manual resolution. This is a local rule that produces global convergence.

### Mechanism 4: Rebase vs Merge
- **Function:** Provides two philosophies for convergence: rewrite history (rebase) or preserve history (merge)
- **Related tensions:** `T-STA-009` (History vs Flexibility)
- **Related invariants:** `I-BSB-001` (Boundaries Shape Behavior)
- **Explanation:** Merge preserves the true history of divergence. Rebase rewrites history to appear as if divergence never happened. This is not just a technical choice -- it is a philosophical choice about whether history is a record of truth or a narrative for consumption.

---

## Phase 5: System Synthesis

**Goal:** Combine tensions, invariants, and mechanisms into a coherent system model.

### Core Tensions
- Divergence enables creativity but requires convergence
- History provides truth but flexibility requires rewriting
- Local autonomy enables speed but global consistency requires coordination

### Core Invariants
- Boundaries (branches) shape behavior
- Identity (commits) drives cooperation
- Local rules (merge algorithms) create global order

### Core Mechanisms
- DAG as divergence/convergence representation
- Content-addressable storage for integrity and deduplication
- Three-way merge for automated convergence
- Rebase/merge as philosophical choice

### Expected Behaviors
- Developers can work independently without blocking each other
- History is complete and verifiable
- Merges are automatic when changes do not overlap
- The system scales to thousands of contributors

### Failure Modes
- Merge conflicts require manual resolution
- History rewriting can confuse collaborators
- Large binary files bloat repositories
- Submodule management is complex

---

## Phase 6: Algorithm Synthesis

**Goal:** Generate implementation candidates.

### Algorithm: Git Version Control

**Core idea:** Model history as a directed acyclic graph of content-addressed objects. Enable divergence through branching and convergence through merging. Preserve complete history while allowing flexible rewriting.

**Mathematical representation:**

```
Commit = {tree: TreeHash, parent: [CommitHash], author, message, timestamp}
Tree = {name: BlobHash | TreeHash}  // directory structure
Blob = content  // file content

All objects identified by SHA-1(object content)
```

**Advantages:**
- Complete local history enables offline work
- DAG naturally represents parallel development
- Content-addressing provides automatic deduplication
- Distributed architecture has no single point of failure
- Cryptographic hashes ensure integrity

**Limitations:**
- Steep learning curve (exposes internal complexity)
- Large repositories become slow
- Binary files are not handled efficiently
- Merge conflicts require human judgment
- History rewriting is dangerous and confusing

---

## Phase 7: Destruction Phase

**Goal:** Attack the model. Assume it is wrong.

### Weak Assumptions
- **Developers understand the DAG model:** In practice, many developers use Git as a series of magic commands without understanding the underlying graph.
- **History is valuable:** For many projects, the full history is never examined. The value of complete history may be overstated.
- **Distributed is better than centralized:** For small teams, the complexity of distributed version control may outweigh the benefits.
- **Content-addressing is sufficient:** SHA-1 collisions, while rare, are theoretically possible and have been demonstrated.

### Missing Tensions
- **Individual vs Collective:** Git optimizes for individual developer workflow. Code review and collective ownership require additional tools (GitHub, GitLab).
- **Speed vs Safety:** Git allows destructive operations (force push, rebase) that can lose work.
- **Code vs Data:** Git is designed for text. It handles binary data, large files, and non-code assets poorly.

### Missing Invariants
- **Context matters:** A commit that is correct in isolation may be wrong in context. Git does not capture the "why" behind changes.
- **Trust is not transitive:** Just because a commit is in the history does not mean it was reviewed or correct.

### Missing Mechanisms
- **Semantic merge:** Git merges text, not meaning. It cannot resolve semantic conflicts (e.g., renaming a function in one branch and adding calls in another).
- **Temporal reasoning:** Git tracks what changed, not when it was correct. It cannot answer "what did the codebase look like at 3pm yesterday?" efficiently.
- **Collaborative editing:** Real-time collaborative editing (like Google Docs) is fundamentally different from Git's async model.

### Possible Redesigns
- **Semantic version control:** Merge based on code semantics, not text diffs
- **CRDTs for real-time collaboration:** Conflict-free replicated data types for simultaneous editing
- **Partial clones:** Only download relevant parts of large repositories
- **Snapshot-based systems:** Focus on snapshots rather than diffs (like Docker layers)
- **AI-assisted merging:** Use language models to resolve semantic merge conflicts

---

## Key Insight

Git is not a version control system. It is a mechanism for managing the tension between divergence and convergence. The insight was not "create branches" or "use a DAG" -- it was recognizing that divergence is not a failure mode but a fundamental property of creative work. By making divergence cheap and convergence explicit, Git enables the creative chaos of distributed development while providing the tools to resolve it. The algorithm emerged from the tension: if creative work naturally diverges, design a system that embraces divergence and provides structured paths back to convergence.
