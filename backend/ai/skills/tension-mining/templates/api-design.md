# Tension Mining Template: API Design

> Use this template when analyzing API design decisions, evaluating API protocols (REST/gRPC/GraphQL), or designing new APIs.
> This template references `_core-template.md` for the shared 7-Phase Workflow skeleton.

---

## When to Use This Template

- Designing a new API from scratch
- Evaluating tradeoffs between REST, gRPC, GraphQL, or other API paradigms
- Refactoring an existing API with breaking changes
- Choosing between RPC-style and resource-oriented design
- Analyzing API versioning and evolution strategies
- Balancing developer experience against runtime performance

---

## Pre-Filled Phenomenon Library

Select real-world phenomena that parallel the API design challenge you are facing:

- [ ] **Library catalog system** (resource identification, search, and retrieval protocols)
- [ ] **Postal service addressing** (hierarchical naming, routing, and delivery guarantees)
- [ ] **Legal contract negotiation** (schema versioning, backward compatibility, clause interpretation)
- [ ] **Diplomatic embassy** (protocol translation, message formatting, stateless vs stateful communication)
- [ ] **Electrical outlet standards (Type A/B/C/etc.)** (interface standardization, regional variation, adapter pattern)
- [ ] **Human language translation** (schema mapping, lossy conversion, context preservation)
- [ ] **Restaurant kitchen ordering** (request batching, prioritization, error handling, idempotency)
- [ ] **Banking check processing** (idempotent transactions, audit trails, settlement reconciliation)
- [ ] **Public transportation timetable** (scheduled vs on-demand, batch vs streaming, rate limiting)
- [ ] **Other:** ___________________

### Domain Analysis Dimension

API design occupies a unique position: the API is simultaneously a **contract** (legal-like obligations between provider and consumer), a **language** (vocabulary and grammar for expressing intent), and a **boundary** (separating internal implementation from external usage). When selecting phenomena, prioritize those that reveal tension between these three roles. The most insightful API designs emerge from understanding which role dominates in your specific context.

---

## Pre-Filled Tension Checklist

### Core Tensions (select all that apply)

- [ ] **Consistency vs Flexibility** (`T-CON-012`)
  - Does the API enforce a strict, uniform contract across all consumers?
  - How much flexibility should consumers have in shaping requests and responses?
  - What is the cost of breaking consistency for a specific use case?

- [ ] **Simplicity vs Capability** (`T-SIM-017`)
  - Is a minimal CRUD surface sufficient, or are rich semantic operations needed?
  - Do complex operations belong in the API layer or should they be composed client-side?
  - What is the learning curve tradeoff for adding each new capability?

- [ ] **Local vs Global** (`T-LOC-004`)
  - Is each service free to design its API independently?
  - What global consistency constraints (naming conventions, error formats, auth patterns) must all services follow?
  - How do you enforce cross-service conventions without stifling local innovation?

- [ ] **Performance vs Expressiveness** (`T-CMP-013`)
  - Should the API favor batch operations and bulk endpoints?
  - What expressiveness is lost when optimizing for throughput?
  - Are consumers willing to accept latency for richer query capabilities?

- [ ] **Versioning vs Evolution** (`T-VER-001`)
  - Must the API maintain strict backward compatibility?
  - How do you evolve the API without breaking existing clients?
  - What is the cost of supporting multiple API versions simultaneously?

### Additional Tensions

- [ ] **Coarse vs Fine Grained** (`T-GRA-005`)
  - Should endpoints return large composite responses or minimal atomic data?
  - How does granularity affect network round trips and client complexity?

- [ ] **Stateful vs Stateless** (`T-STA-009`)
  - Does the API server maintain session state?
  - What are the scalability implications of each choice?

- [ ] **Standardized vs Custom** (`T-SPR-016`)
  - Should the API adopt an industry standard (OpenAPI, JSON:API, OData)?
  - When does customization provide competitive advantage vs maintenance burden?

---

## Pre-Filled Invariant Checklist

- [ ] **Tradeoffs Are Inescapable** (`I-TAE-001`)
- [ ] **Local Rules Create Global Order** (`I-LCG-001`)
- [ ] **Compression Reveals Structure** (`I-CRS-001`)
- [ ] **Boundaries Shape Behavior** (`I-BSB-001`)

---

## Pre-Filled Mechanism Library

- [ ] **Contract-First Design** (OpenAPI / protobuf / schema-first development)
- [ ] **Facade Pattern** (aggregation, composition, response shaping)
- [ ] **Pagination & Streaming** (cursor-based, offset-based, server-sent events)
- [ ] **Rate Limiting & Throttling** (token bucket, leaky bucket, sliding window)
- [ ] **Version Negotiation** (URL path, header, content-type, query parameter)
- [ ] **Adapter / Translator** (protocol conversion, schema mapping, middleware)
- [ ] **Idempotency Keys** (retry safety, deduplication, exactly-once semantics)
- [ ] **HATEOAS / Hypermedia** (discoverability, self-describing endpoints)
- [ ] **Caching & Staleness Control** (ETag, last-modified, cache invalidation)
- [ ] **Webhook / Callback** (asynchronous notification, event-driven integration)

---

> **7-Phase Workflow:** Use `_core-template.md` for the full 7-Phase Workflow skeleton.
> **Output Template:** Use `_core-template.md` for the Final Deliverable structure.
> **Execution Protocol:** Load `references/execution-protocol.md` for detailed phase instructions.