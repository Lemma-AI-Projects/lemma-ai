# Tension Mining Template: Protocol Design

> Use this template when designing distributed protocols, consensus mechanisms, or communication systems.
> This template references `_core-template.md` for the shared 7-Phase Workflow skeleton.

---

## When to Use This Template

- Designing a new distributed protocol
- Evaluating existing consensus mechanisms
- Building peer-to-peer systems
- Designing inter-agent communication
- Analyzing protocol security and robustness

---

## Pre-Filled Phenomenon Library

- [ ] **TCP/IP** (reliable transmission over unreliable networks)
- [ ] **Byzantine Consensus** (agreement despite malicious actors)
- [ ] **CAP Theorem** (consistency, availability, partition tolerance tradeoffs)
- [ ] **Gossip Protocols** (epidemic information dissemination)
- [ ] **Blockchain Consensus** (proof-of-work, proof-of-stake)
- [ ] **DNS** (distributed naming system)
- [ ] **BGP** (border gateway protocol, path vector routing)
- [ ] **Raft/Paxos** (leader-based consensus)
- [ ] **BitTorrent** (peer-to-peer file sharing)
- [ ] **Other:** ___________________

### Domain Analysis Dimension

Protocols are unique in that **failure is distributed and detection is delayed**. Unlike a monolithic system where a crash is immediately obvious, protocol failures may only become visible when inconsistency is detected — which could be arbitrarily late. When analyzing phenomena, pay special attention to failure detection latency and how the protocol bounds it.

---

## Pre-Filled Tension Checklist

### Core Tensions (select all that apply)

- [ ] **Consistency vs Availability** (`T-CON-012`)
  - What consistency guarantees does your protocol provide?
  - What availability guarantees does it provide?

- [ ] **Security vs Performance** (`T-CMP-013`)
  - What security properties are required?
  - What performance costs do they impose?

- [ ] **Complexity vs Usability** (`T-SIM-017`)
  - How complex is the protocol?
  - What errors do implementers typically make?

- [ ] **Centralization vs Decentralization** (`T-CEN-011`)
  - Does the protocol require central coordination?
  - What are the single points of failure?

- [ ] **Synchronicity vs Asynchronicity** (`T-SYN-010`)
  - Does the protocol require synchronous communication?
  - What happens under latency and message loss?

- [ ] **Trust vs Verification** (`T-TRA-008`)
  - What trust assumptions does the protocol make?
  - What is cryptographically verified?

### Additional Tensions

- [ ] **Local vs Global** (`T-LOC-004`)
- [ ] **Short-term vs Long-term** (`T-SHO-019`)
- [ ] **Specialization vs Resilience** (`T-SPR-016`)

---

## Pre-Filled Invariant Checklist

- [ ] **Consensus Requires Cost** (`I-TAE-001`)
- [ ] **Boundaries Shape Behavior** (`I-BSB-001`)
- [ ] **Feedback Loops Stabilize** (`I-FLS-001`)
- [ ] **Local Rules Create Global Order** (`I-LCG-001`)
- [ ] **Tradeoffs Are Inescapable** (`I-TAE-001`)

---

## Pre-Filled Mechanism Library

- [ ] **Leader Election** (coordinator selection)
- [ ] **Quorum Consensus** (majority agreement)
- [ ] **Cryptographic Verification** (signature checking, hash chains)
- [ ] **Timeout and Retry** (failure detection and recovery)
- [ ] **State Machine Replication** (deterministic execution)
- [ ] **Merkle Trees** (efficient verification of large datasets)
- [ ] **Vector Clocks** (causality tracking)
- [ ] **CRDTs** (conflict-free replicated data types)
- [ ] **Zero-Knowledge Proofs** (privacy-preserving verification)

---

> **7-Phase Workflow:** Use `_core-template.md` for the full 7-Phase Workflow skeleton.
> **Output Template:** Use `_core-template.md` for the Final Deliverable structure.
> **Execution Protocol:** Load `references/execution-protocol.md` for detailed phase instructions.