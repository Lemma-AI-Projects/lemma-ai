# Tension Mining Template: Consensus Protocol

> Use this template when analyzing distributed consensus protocols, evaluating consistency models, or designing new distributed coordination mechanisms.
> This template references `_core-template.md` for the shared 7-Phase Workflow skeleton.

---

## When to Use This Template

- Designing a new distributed consensus protocol
- Evaluating existing consensus mechanisms (Raft, Paxos, PBFT, etc.)
- Analyzing consistency vs availability tradeoffs
- Modeling failure scenarios and fault tolerance guarantees
- Comparing leader-based vs leaderless consensus approaches

---

## Pre-Filled Phenomenon Library

Select real-world consensus systems that exhibit the behavior you are studying:

- [ ] **Raft/Paxos Leader Election** → single-leader consensus, log replication, safety under partial failures
- [ ] **PBFT (Practical Byzantine Fault Tolerance)** → byzantine agreement, three-phase commit, $3f+1$ resilience
- [ ] **Bitcoin Proof-of-Work** → probabilistic finality, longest-chain rule, energy-backed security
- [ ] **Ethereum Casper/Gasper** → proof-of-stake finality, slashing conditions, LMD-GHOST fork choice
- [ ] **Apache ZooKeeper (Zab)** → atomic broadcast, primary-backup replication, crash fault tolerance
- [ ] **Hashgraph (Swirlds)** → gossip-based protocol, virtual voting, asynchronous Byzantine fault tolerance
- [ ] **Two-Phase Commit (2PC)** → atomic commitment protocol, blocking coordinator failure
- [ ] **Quorum-based Read/Write (Dynamo-style)** → quorum intersection, vector clocks, eventual consistency
- [ ] **Gossip Protocols** → epidemic dissemination, probabilistic propagation, anti-entropy repair
- [ ] **CRDTs (Conflict-Free Replicated Data Types)** → conflict-free replication, commutative/associative merge semantics
- [ ] **Other:** ___________________

### Domain Analysis Dimension

Consensus protocols operate in a **distributed failure model** where nodes may crash, messages may be delayed or lost, and malicious actors may exist. Unlike a single-machine system where state is instantly consistent, distributed consensus must navigate the fundamental tradeoffs formalized by the CAP theorem and the FLP impossibility result. When analyzing phenomena, pay special attention to **failure assumptions** (crash vs byzantine), **communication model** (synchronous vs asynchronous), and **finality guarantees** (probabilistic vs deterministic).

---

## Pre-Filled Tension Checklist

### Core Tensions (select all that apply)

- [ ] **Safety vs Liveness** (`T-SAF-001`)
  - Must the protocol guarantee that all correct nodes agree on the same value?
  - Can the protocol make progress even when some nodes are faulty or messages are delayed?

- [ ] **Centralization vs Decentralization** (`T-CEN-011`)
  - Does the protocol rely on a single leader for coordination? What happens if the leader fails?
  - What is the cost (in messages, rounds, or complexity) of fully decentralized coordination?

- [ ] **Consistency vs Availability** (`T-CON-012`)
  - What consistency model does the protocol provide (linearizability, sequential consistency, eventual consistency)?
  - Under network partition, does the protocol choose availability or consistency? What are the consequences of each choice?

- [ ] **Latency vs Durability** (`T-LAT-003`)
  - How many rounds of communication are needed before a value is committed?
  - What persistence guarantees exist after a crash recovery? Is replay possible?

- [ ] **Simplicity vs Fault Tolerance** (`T-SIM-004`)
  - How easy is the protocol to understand, implement, and debug correctly?
  - What fault model does the protocol tolerate (crash, omission, byzantine)? What is the implementation complexity cost?

### Additional Tensions

- [ ] **Deterministic vs Probabilistic** (`T-DET-002`)
- [ ] **Communication vs Computation** (`T-CMP-013`)
- [ ] **Synchronous vs Asynchronous** (`T-SYN-010`)
- [ ] **Trust vs Verification** (`T-TRU-005`)

---

## Pre-Filled Invariant Checklist

- [ ] **Tradeoffs Are Inescapable** (`I-TAE-001`)
- [ ] **Feedback Loops Stabilize** (`I-FLS-001`)
- [ ] **Local Rules Create Global Order** (`I-LCG-001`)
- [ ] **Consensus Requires Cost** (`I-CRC-001`)
- [ ] **Failure Assumptions Bound Guarantees** (`I-FAB-001`)

---

## Pre-Filled Mechanism Library

- [ ] **Leader Election** (coordinator selection, heartbeat monitoring)
- [ ] **Quorum Intersection** (majority overlap, read-repair)
- [ ] **State Machine Replication** (deterministic log application, idempotent operations)
- [ ] **Byzantine Fault Tolerance** ($3f+1$ replication, signed messages, view-change)
- [ ] **Consensus Rounds / Phases** (prepare-promise, propose-accept, commit-decide)
- [ ] **Failure Detection** (timeout-based, gossip-based, Phi-accrual)
- [ ] **Cryptographic Commitments** (hash chains, Merkle proofs, digital signatures)
- [ ] **View Stamps / Epochs** (logical time, term numbers, ballot ids)
- [ ] **Anti-Entropy Repair** (Merkle tree reconciliation, delta sync)

---

> **7-Phase Workflow:** Use `_core-template.md` for the full 7-Phase Workflow skeleton.
> **Output Template:** Use `_core-template.md` for the Final Deliverable structure.
> **Execution Protocol:** Load `references/execution-protocol.md` for detailed phase instructions.