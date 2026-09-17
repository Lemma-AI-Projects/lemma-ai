<p align="center">
  <img src="assets/images/logo-horizontal.svg" alt="DECOMPOSER" width="400">
</p>

<p align="center">
  <strong>A cognitive operation protocol for transforming unknown unknowns into known unknowns.</strong>
  <br>
  <em>Honest. Actionable. Domain-agnostic.</em>
</p>

<p align="center">
  <a href="https://zbbsdsb.github.io/Decomposer-Skill/"><img src="https://img.shields.io/badge/site-Swiss%20Style-000000?style=flat-square" alt="GitHub Pages"></a>
  <a href="#"><img src="https://img.shields.io/badge/license-MIT-000000?style=flat-square" alt="License MIT"></a>
  <a href="#"><img src="https://img.shields.io/badge/status-alpha-000000?style=flat-square" alt="Alpha"></a>
  <a href="#"><img src="https://img.shields.io/badge/platform-agnostic-000000?style=flat-square" alt="Platform Agnostic"></a>
  <a href="#"><img src="https://img.shields.io/badge/ai-ready-000000?style=flat-square" alt="AI Ready"></a>
</p>

---

## The Problem

Every AI-generated plan is a lie.

Not a malicious lie. Not a deliberate deception. But a lie nonetheless — a polished module list that mimics the shape of understanding without any of the substance. "User management. Payment system. Recommendation engine." It looks structured. It looks comprehensive. It is a **shell**.

The shell looks like progress. It feels like clarity. But the moment you try to act on it, you hit a wall that was invisible in the plan — a dependency nobody mentioned, an assumption that was false, a constraint that makes the entire architecture untenable.

The plan didn't warn you because the plan never saw the wall. It wasn't looking.

**Decomposer exists to force the wall into visibility before you walk into it.**

## The Core Claim

> **The fundamental unit of progress is not a feature, a module, or a milestone.**
> **It is the conversion of one unknown unknown into a known unknown.**

An unknown unknown is something you didn't even know you didn't know — a hidden dependency, an invisible assumption, a failure mode you can't imagine yet. A known unknown is a question you can name but cannot yet answer. "Will users pay for this?" "Does the math support this approach?"

The entire purpose of the Decomposer Protocol is to perform this conversion, ruthlessly and repeatedly, until what remains is a structure where every piece has a survival condition, every claim can be tested, and every gap is explicitly owned.

## The Protocol in One Image

<p align="center">
  <img src="assets/diagrams/protocol-flow.svg" alt="Decomposer 5-Step Protocol" width="700">
</p>

## Quick Start: 30 Seconds

```
# 1. Read the protocol
cat PROTOCOL.md

# 2. Pick a problem — anything large, ambiguous, or scary
# 3. Run the 5 steps in your head (or on a whiteboard)
# 4. The output is an actionable uncertainty map
# 5. Everything has a survival condition. Nothing is hidden.
```

**No installation. No dependencies. No AI required.**

The protocol runs in your head, on a whiteboard, or in a conversation. The AI skill (TRAE adapter) is a convenience, not a requirement. See `adapters/human/` for the pen-and-paper version.

## The Five Steps

- **01 — Honesty Fuse**. State your limits before any analysis. Prevents the "shell" from forming.
- **02 — Uncertainty Mapping**. Classify every element as Green/Yellow/Red. Makes the invisible visible.
- **03 — Hierarchical Decomposition**. Build a cognitive dependency tree. Reveals what must be known first.
- **04 — Error Budget**. Assign confidence, survival condition, lethality. Every node can be tested or killed.
- **05 — Anti-Shell Self-Check**. Five hard checks. Iterate until all pass. Guarantees honesty and actionability.

**Two metrics**: Honesty and Actionability. If the output is dishonest, it is worthless. If it is honest but you cannot act on it, it is incomplete. Everything else is noise.

## Standard AI Plan vs. Decomposer Output

| | Standard AI Plan | Decomposer Output |
|---|---|---|
| **Auth** | "We need user authentication." (no caveats, no conditions) | **ALIVE** — "User auth. Alive if 50 users register in week 1. Dead if >10% login failures." |
| **Recommendation** | "We'll implement a recommendation engine." (sounds confident) | **YELLOW** — "I don't know if collaborative filtering works here. Need 100 users of behavior data to test." |
| **Scale** | "Then we scale." (hand-wave) | **RED** — "I cannot see the failure mode. First probe: load test with 1000 concurrent users." |

## Platform Adapters

The protocol is universal. Its rendering is contextual.

| Adapter | Path | Purpose |
|---------|------|---------|
| **TRAE** | [`adapters/trae/`](adapters/trae/) | AI-assistant conversation integration |
| **Twitter** | [`adapters/twitter/`](adapters/twitter/) | Long-form essay structural template |
| **Team** | [`adapters/team/`](adapters/team/) | Decision-friendly meeting brief |
| **Human** | [`adapters/human/`](adapters/human/) | Pen-and-paper physical checklist |

## Read These Files

| File | Purpose |
|------|---------|
| [PROTOCOL.md](PROTOCOL.md) | Full five-step protocol with complete end-to-end example |
| [MANIFEST.md](MANIFEST.md) | Philosophy, commitments, and epistemic status |
| [FIELD_GUIDE.md](FIELD_GUIDE.md) | Application annotations for TRAE, Twitter, human, and general contexts |
| [SKILL.md](SKILL.md) | Platform-agnostic skill definition |
| [VALIDATION.md](VALIDATION.md) | Empirical validation roadmap and experiment designs |
| [TUTORIAL.md](TUTORIAL.md) | Step-by-step beginner tutorial with a worked example |
| [references/](references/) | Cognitive position detection, output contexts, scale guide, common pitfalls, standalone templates |
| [adapters/](adapters/) | Platform-specific adapters (TRAE, Twitter, Team, Human) |
| [docs/](docs/) | GitHub Pages site (Swiss Style) |

## The Commitment

> If the best we can deliver is three honest nodes with survival conditions — three pieces of the problem that are genuinely understood and genuinely actionable — that is superior to a fifty-page plan where every module is a placeholder in disguise.

> The fifty-page plan gives you the feeling of progress. The three honest nodes give you the *fact* of progress. The feeling evaporates on contact with reality. The fact survives.

## License

MIT — use it, fork it, remix it, ship it. The protocol is free. The honesty is the point.

---

<p align="center">
  <strong>Stop building shells. Start decomposing.</strong>
  <br><br>
  <a href="https://github.com/zbbsdsb/Decomposer-Skill">GitHub</a>
  &nbsp;·&nbsp;
  <a href="https://zbbsdsb.github.io/Decomposer-Skill/">GitHub Pages</a>
  &nbsp;·&nbsp;
  <a href="https://github.com/zbbsdsb/Decomposer-Skill/blob/main/PROTOCOL.md">Protocol</a>
</p>

<p align="center">
  <a href="https://github.com/zbbsdsb">ceaserzhao</a> &nbsp;·&nbsp; MIT License
</p>