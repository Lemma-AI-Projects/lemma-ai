# Decomposer Protocol -- Quick Reference Card

## 5 Steps at a Glance

| Step | Summary |
|---|---|
| 1. Map Elements | Identify all elements in the problem space. Do not evaluate yet. |
| 2. Classify by Zone | Tag each element as Known-Known, Known-Unknown, or Unknown-Unknown. |
| 3. Test Dependencies | For each element, ask: "If A remains unknown, can B still be addressed?" |
| 4. Define Survival Conditions | For each critical element, write: "Alive if [measurable]. Dead if [measurable]." |
| 5. Sequence the Work | Order: kill tests first, then dependency chain, then execution. |

## 3 Zones

| Zone | State | Signal |
|---|---|---|
| Green | Known-Known | You have data, experience, or proof. No further investigation needed. |
| Yellow | Known-Unknown | You know what you don't know. This is where structured investigation lives. |
| Red | Unknown-Unknown | You do not know what you are missing. Treat as highest risk. Investigate before committing. |

## 70% Rule

**If Green > 70%, the map is dishonest.**

A healthy decomposition has at least 30% in Yellow and Red. If your map looks too certain, you have skipped unknowns.

## Dependency Test

**If A remains unknown, can B still be addressed?**

- If No: A is a blocker. Resolve A before B.
- If Yes: A and B are independent. Work on B in parallel.

## Survival Condition Template

```
Alive if: [measurable condition]
Dead if:   [measurable condition]
```

Both must be falsifiable. If neither can be proven false, the condition is not measurable.

## Anti-Shell Self-Check

| Check | Question | Pass/Fail |
|---|---|---|
| 1 | Does every element have a zone assignment? | / |
| 2 | Does every Red element have a discovery plan? | / |
| 3 | Can you name the single fatal premise? | / |
| 4 | Does the map pass the 70% rule? | / |
| 5 | Can you describe the project to a stranger in 3 sentences? | / |

## Cognitive Position Quick Scan

| Question | If Yes | If No |
|---|---|---|
| Do you know the fatal premise? | You are in Yellow. Go test it. | You are in Red. Find it first. |
| Can you name the smallest sellable unit? | You have a stopping criterion. | Do Card 3 before allocating capital. |
| Do you know the highest-leverage use of funds? | Allocate accordingly. | Do Card 2 before spending. |
| Does the map have a survival condition? | You can make a go/no-go call. | Define one before the next review. |

## Key Terms

- **Element**: A single piece of the problem space (assumption, constraint, resource, risk).
- **Survival Condition**: A measurable threshold that defines whether the project is alive or dead.
- **Lethality**: The degree to which a single element's failure kills the entire project. Fatal premise = 100% lethality.
- **Error Budget**: The amount of ambiguity or uncertainty you can tolerate before the map becomes unreliable.
- **Zone**: A classification of epistemic certainty (Green, Yellow, Red).