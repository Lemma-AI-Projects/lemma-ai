# Contributing to Tension Mining

Contributions are welcome! This project is an open methodology for analyzing
complex systems through the lens of persistent tensions and cross-domain
invariants.

## Quick Start

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-contribution`)
3. Run the atlas validation script: `python scripts/validate-atlas.py`
4. Commit your changes and open a [Pull Request](./.github/PULL_REQUEST_TEMPLATE.md)

### Issue Templates

Before starting work, consider opening an issue using the appropriate template:

- [New Tension](https://github.com/zbbsdsb/Tension-Mining/issues/new?template=new-tension.yml) — Submit a new persistent tension
- [New Invariant](https://github.com/zbbsdsb/Tension-Mining/issues/new?template=new-invariant.yml) — Submit a new cross-domain invariant
- [New Case Study](https://github.com/zbbsdsb/Tension-Mining/issues/new?template=new-case-study.yml) — Propose a new case study

## Spread the Word

Help the methodology reach researchers, students, and engineers who could benefit from it:

- **Star the repo** on GitHub — it helps others discover the project
- **Share on Twitter/X** — use the [pre-made tweet](https://twitter.com/intent/tweet?text=Tension%20Mining%20%E2%80%94%20Discover%20cross-domain%20invariants%20in%20complex%20systems&url=https://github.com/zbbsdsb/Tension-Mining) or write your own
- **Post on Reddit** — share in r/MachineLearning, r/ClaudeAI, r/ChatGPTCoding, or r/complexsystems
- **Write about it** — a blog post, LinkedIn article, or mention in your paper's related work section
- **Tell your advisor** — professors and lab mates are the best vector for academic adoption
- **Use it in class** — the [workshop module](./docs/workshop-module.md) works as a graduate seminar exercise

Every share, star, and mention helps. Thank you for spreading the idea!

## Adding a New Tension

Follow the rules defined in [`PROJECT_STRUCTURE.md`](./PROJECT_STRUCTURE.md)
and the extension guide at the bottom of [`references/tension-atlas.md`](./references/tension-atlas.md).

Key requirements:

- Assign a unique ID matching the format `T-{3-letter-domain}-{3-digit-number}`
- Include all required fields: Force A, Force B, Definition, Why ineliminable,
  Cross-domain examples, Over-optimization consequences, Related invariants
- Mark as `[EXPERIMENTAL]` initially; do not use `[CORE]` unless validated
  in 3+ case studies
- Update related invariant entries with back-references
- Run `python scripts/validate-atlas.py` before committing

## Adding a New Invariant

Follow the extension guide at the bottom of
[`references/invariant-atlas.md`](./references/invariant-atlas.md).

Key requirements:

- Assign a unique ID matching the format `I-{3-letter-domain}-{3-digit-number}`
- Include all required fields: Statement, Supporting phenomena, Mechanism
  explanation, Mathematical intuition, Boundary conditions, Related tensions,
  Related cases
- The invariant must be cross-domain (at least 3 distinct domains)
- Mark as `[EXPERIMENTAL]` initially
- Update related tension entries with back-references
- Run `python scripts/validate-atlas.py` before committing

## Adding a Case Study or Template

- Place case studies in `examples/` following the naming convention
  `examples/{topic-name}.md`
- Place templates in `templates/` following the naming convention
  `templates/{domain-name}.md`
- Use `templates/_core-template.md` as the structural skeleton
- Reference the case study from relevant tension and invariant entries

## [CORE] Promotion Criteria

An entry may be upgraded from `[EXPERIMENTAL]` to `[CORE]` when:

1. It has been applied and validated in **3 or more** distinct case studies
2. The case studies span at least **2 different domains**
3. The validation evidence is documented in the case study files

## PR Checklist

Before submitting a Pull Request, ensure:

- [ ] `python scripts/validate-atlas.py` exits with code 0
- [ ] No redundant atlas files exist in the repository root
- [ ] All new IDs follow the `{T|I}-{3-letters}-{3-digits}` format
- [ ] All cross-references are bidirectional (tension <-> invariant)
- [ ] New entries include the `[EXPERIMENTAL]` marker unless CORE criteria are met

## Academic Credit

We encourage academic contributions and provide the following credit mechanisms for researchers:

### Citation

If you use Tension Mining in your research, please cite the repository:

```
Zhao, C. (2026). Tension Mining: A Methodology for Discovering Invariants in Complex Systems (Version 2.0.0) [Software]. https://github.com/zbbsdsb/Tension-Mining
```

Or in BibTeX format:

```bibtex
@software{zhao2026tension,
  author = {Zhao, Ceaser},
  title = {{Tension Mining}: A Methodology for Discovering Invariants in Complex Systems},
  year = {2026},
  version = {2.0.0},
  url = {https://github.com/zbbsdsb/Tension-Mining}
}
```

A `CITATION.cff` and `CITATION.bib` file are included in the repository root for automatic citation generation. An accompanying arXiv paper describing the methodology in detail is forthcoming. Contributors who participate in the methodology paper (see Co-Authorship below) will be listed as co-authors.

### Co-Authorship

Contributors who add validated `[CORE]` tensions or invariants (following the promotion criteria above) are eligible for co-authorship on the official methodology paper (planned Q3 2026). Each contributor's specific additions will be documented in the paper's Contributions section.

### Acknowledgement

All contributors are listed in the Acknowledgements section of the Atlas documentation (`references/tension-atlas.md` and `references/invariant-atlas.md`). Contributors who add case studies or templates are acknowledged in the respective case study file.

### Contact

For academic collaboration inquiries, open an issue or reach out via the GitHub repository.
