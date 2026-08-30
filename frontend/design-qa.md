# Course progress card design QA

- Source visual truth: `/var/folders/fd/fb2smxhx4lz5nfyd0ps7568m0000gn/T/codex-clipboard-d5ecb053-33c8-4e3c-b491-69528b150001.png`
- Implementation screenshot: `/var/folders/fd/fb2smxhx4lz5nfyd0ps7568m0000gn/T/lemma-course-center-progress-card-final.png`
- Full comparison: `/private/tmp/course-center-card-comparison.png`
- Focused card comparison: `/private/tmp/course-progress-card-focused-comparison.png`
- State: current week, one completed session, quick-start course available
- Source pixels: 2940 × 1714; implementation pixels: 1318 × 768
- Implementation CSS viewport: 1318 × 768 at browser capture density 1
- Density normalization: the source card crop was downsampled to the implementation card crop size (296 × 250) for focused comparison. The full source screenshot was downsampled to 1318 × 768 for composition review.

## Full-view comparison evidence

The Lemma implementation preserves the reference hierarchy: page title and filters at upper left, search on the same row, and the learning-progress card in the upper-right region. The existing Lemma sidebar is intentionally wider than Hyperknow's sidebar, so the card is aligned within Lemma's content canvas rather than copied against the browser edge.

## Focused-region comparison evidence

The normalized card comparison confirms matching proportions, vertical rhythm, seven-day grid density, weekly navigation placement, and quick-start card position. A focused comparison was required because the source and implementation browser screenshots were captured at different viewport widths.

## Required fidelity surfaces

- Fonts and typography: hierarchy, weight, line height, and wrapping match the reference closely while using the existing Lemma font stack.
- Spacing and layout rhythm: card footprint, padding, day-cell spacing, radii, and section gaps match after the second layout pass.
- Colors and visual tokens: the implementation intentionally uses Lemma's neutral zinc palette instead of Hyperknow's blue accent.
- Image quality and assets: the component contains no raster imagery. Existing Lucide chevrons match the project's icon system and the reference control shape.
- Copy and content: structural copy matches. The quick-start course title comes from Lemma's real course API; the secondary line is deliberately generic because no chapter-resume contract has been handed off.

## Comparison history

### Pass 1

- P2: the card rendered too narrow and sat too close to the right edge compared with the source.
- Fix: increased the desktop card width from 300px to 330px and changed its right offset from 64px to 44px within the page flex layout.

### Pass 2

- Post-fix evidence: the focused comparison shows the card footprint and content density aligned with the reference. No actionable P0, P1, or P2 differences remain.

## Interaction checks

- Previous-week control switches the heading to `上周`, changes the session count to 0, updates all seven day values, disables the previous control, and enables return to the current week.
- Current-week control restores the initial state.
- Quick start navigates to the selected real course at `/course/:id`.
- Loading, error, empty, and success states exist for the real course query.
- No runtime errors surfaced in the Vite development output during interaction checks.

## Follow-up polish

- P3: replace the generic quick-start subtitle with the actual next chapter once a resume/progress contract is available.

final result: passed
