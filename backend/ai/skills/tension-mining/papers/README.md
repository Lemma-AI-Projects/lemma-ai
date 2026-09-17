# Tension Mining arXiv Paper

This directory contains the LaTeX source for the Tension Mining methodology paper,
targeting submission to arXiv (cs.MA primary, cross-list cs.CY, cs.SI).

## Files

| File | Purpose |
|------|---------|
| `tension-mining-arxiv.tex` | Main LaTeX source (7 pages, ~3800 words) |
| `tension-mining-arxiv.bib` | BibTeX bibliography (16 references) |
| `Makefile` | Build automation |
| `figures/` | Figure sources |

## Requirements

- LaTeX distribution: TeX Live 2020+ or MiKTeX
- Packages: `graphicx`, `hyperref`, `natbib`, `booktabs`, `tikz`, `geometry`, `microtype`

## Compilation

```bash
# Using Make
make

# Or manually
pdflatex tension-mining-arxiv
bibtex tension-mining-arxiv
pdflatex tension-mining-arxiv
pdflatex tension-mining-arxiv
```

## arXiv Submission

1. Ensure all source files follow arXiv naming rules (no spaces, no Unicode filenames)
2. Upload to https://arxiv.org/submit
3. Select: cs.MA (primary) → cross-list cs.CY, cs.SI
4. License: arXiv perpetual non-exclusive license
5. First-time submitters will need endorsement from an existing arXiv author

## Citation

```bibtex
@misc{zhao2026tension,
  author = {Zhao, Ceaser},
  title = {{Tension Mining}: {A} Structured Methodology for Cross-Domain Invariant Discovery in Complex Systems},
  year = {2026},
  eprint = {arXiv:XXXX.XXXXX},
  url = {https://github.com/zbbsdsb/Tension-Mining}
}
```

After acceptance, update `eprint` with the actual arXiv ID.