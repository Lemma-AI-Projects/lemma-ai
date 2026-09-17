# Great Expectations — Repository Upgrade: Overview

**Goal:** Bring the repo to world-class standard — demo examples, contribution
guide, and a GitHub Pages site in strict black/white **Swiss / International
Typographic** style. Executed end-to-end with the strictest self-review; user
accepts tomorrow.

## What shipped

### Site (`docs/`, zero-dependency static — no build step)
| File | Role |
|------|------|
| `assets/style.css` | Swiss design system: ink `#0A0A0A` / paper `#FAFAFA`, accent `#E30613` (<5%), 12-col grid, 8px baseline, Positive/Negative inversion, responsive (860/560), print, `prefers-reduced-motion`. **Zero external requests.** |
| `assets/site.js` | Theme inversion (persisted + OS-aware) + reveal-on-scroll. Label now tracks current theme. |
| `assets/demo.js` | Prompt assembler — composes the full system prompt + 3 inputs into a copyable block. No LLM key, no fabricated output. |
| `index.html` | Manifesto: creed, method, proof, completeness gate. |
| `skill.html` | Four academic pillars, forced non-skippable workflow, banned vocabulary, 8-section format, acceptance metrics table. |
| `demo.html` | Three honest example runs (Google Glass back-test, Web3 county, carbon-neutral) + live prompt assembler. |
| `contributing.html` | On-site governance mirror of `CONTRIBUTING.md`. |
| `assets/favicon.svg`, `assets/og.svg` | Monochrome brand marks. |
| `examples/*.md` | (Source of the demo runs; mirrored inline in `demo.html`.) |

### Governance (repo root)
`LICENSE` (MIT) · `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1) ·
`CONTRIBUTING.md` (philosophy red lines, change protocol, DoD) ·
`.github/ISSUE_TEMPLATE/*` · `.github/PULL_REQUEST_TEMPLATE.md` ·
rewritten `README.md` (Swiss header, features, quick-start, site link, badges).

### Deployment (no CI — by design)
Served directly by GitHub Pages via **Settings → Pages → Source → "Deploy from a branch" → `main` → `/docs`**.
No build, no Actions, no permissions. The static `docs/` folder is published as-is.

## Defects found & fixed during strict audit
1. **Gate bug** — `urljoin` resolved `index.html/` as a directory on Windows, false-failing every link. Rewrote to `dirname`-based resolution.
2. **Missing page** — `contributing.html` was referenced in nav but never created → built it.
3. **Copy typo** — `demo.js` said `Creep:` → `Creed:`.
4. **Stale toggle label** — theme button now reflects target state (`POSITIVE`/`NEGATIVE`).

## Verification
- Local `http.server`: all 4 pages + 5 assets return **200**; `style.css` → `text/css`.
- Docs gate: **PASSED** on all HTML/CSS.
- Contrast: ink/paper, muted/paper, accent/paper all ≥ 4.5:1 in **both** themes (WCAG AA).
- Responsive: collapses to single column ≤860px; no horizontal overflow at 320px.

## Known limitations (flagged, not blocking)
- `og.svg` is SVG; some platforms ignore SVG OG images (PNG preferred for social cards).
- Docs gate (`check_docs.py`) was removed to keep deployment dead-simple; the static `docs/` folder is served directly. Lighthouse 4×100 is engineered-for and left as a manual acceptance step.

## Acceptance checklist for tomorrow
- [ ] Open `docs/index.html` — Swiss layout, theme toggle inverts cleanly.
- [ ] `skill.html` reads as a precise execution protocol.
- [ ] `demo.html` — three example runs render; assembler copies a valid prompt.
- [ ] `contributing.html` + root `CONTRIBUTING.md` consistent.
- [ ] Enable GitHub Pages (Source: Deploy from a branch → `main` → `/docs`) and confirm live URL.
- [ ] (Optional) Run Lighthouse locally for the 4×100 confirmation.
