# Decomposer — Team Communication Adapter

How the Decomposer protocol surfaces as a team meeting brief or shared document.

---

## Format

One-page structured summary.

## Structure

**Structure**: The one-pager should contain three sections:
1. **What we know** (Green): things we can act on today.
2. **What we don't know** (Yellow): things we need to research or test.
3. **What we can't see** (Red): things we need to design experiments for.
4. **First action**: the single most important step to take this week.

If the project is large (team/quarterly scope or larger), refer to `references/SCALE_GUIDE.md` for guidance on how to decompose by subdomain rather than attempting a single mapping.

## Constraints

- Maximum 1 page (or 5 minutes of presentation time)
- Every Yellow zone must have a named owner
- Survival conditions phrased as "We'll know we're wrong when [X]"
- Do not include the full protocol reasoning — just the output

## Example

```
# Decomposer Brief: [Project Name]

## Known (Green)
- [X] — confirmed, no further action needed
- [Y] — working, on track

## Unknown (Yellow)
- [Z] — owner: Alice, resolve by Friday, test: [specific condition]
- [W] — owner: Bob, resolve by next Tuesday, test: [specific condition]

## Critical Unknown (Red)
- [V] — this could kill the project. Dedicated probe needed by end of month.

## First Action
[Name] will [specific action] by [deadline].
```

## Reference

See `references/OUTPUT_CONTEXTS.md` for the full rendering rules.