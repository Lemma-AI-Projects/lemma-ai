# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-06-22

### Added

- **7-phase methodology** with Progressive Disclosure architecture
  (Phase 1: Phenomenon Mining -> Phase 7: Destruction)
- **Atlas three-tier marking system**: `[CORE]`, `[EXPERIMENTAL]`, and unmarked
  entries with clear promotion criteria
- **Tension Atlas** with 19 cataloged tensions across 5 domains:
  Cognition & Information, Society & Organization, Computation & Systems,
  Life & Evolution, Design & Product
- **Invariant Atlas** with 12 cataloged invariants across 4 domains:
  Information, Identity & Boundaries, Networks & Flows, Evolution & Adaptation
- **5 domain templates**: AI Agent, NPC Society, Organization,
  Protocol Design, Algorithm Discovery
- **Additional templates**: API Design, Consensus Protocol, Game Design
- **8 case studies**: PageRank, Transformer, Bitcoin, Git, Wikipedia,
  NPC Society, Agent Organization, Dialogue Example
- **Additional case studies**: Consensus Protocols, Ant Colony Foraging, Market Efficiency
- **Cross-reference validation** via `scripts/validate-atlas.py`
- **GitHub Actions CI** with atlas validation, markdown lint, and link checking
- **Extension guides** in both atlases for adding new tensions and invariants

### Changed

- Complete restructuring from flat v1 format to modular `references/` layout
- SKILL.md rewritten as activation skeleton with Progressive Disclosure routing

## [1.0.0] - 2026-01-15

### Added

- Initial release with core tension mining methodology
- Basic tension and invariant catalogs
- Single domain template and example dialogue
