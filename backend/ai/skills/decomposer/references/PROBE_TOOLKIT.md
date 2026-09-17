# Probe Toolkit: How to Find Unknown Unknowns

A standalone extraction of the three probe techniques from the Decomposer Protocol's Step 2 (Uncertainty Mapping). These techniques are a **pre-processing layer** — run them before or during Step 2 to ensure that the uncertainty map is not missing the elements that matter most.

---

## Technique 1: Boundary Puncture

**Description**: For every Green zone element, ask: "If this assumption is wrong, what is the single most likely cause?" Force yourself to write down three concrete failure modes for each Green element. If you cannot, the element is probably not truly Green — it is a shell masquerading as certainty.

**Example** (from "Build the Next TikTok"): "Manual content creation workflow" is Green. Boundary puncture: "If this is wrong, it is because niche content is harder to produce than general content, or because the niche audience has higher quality standards, or because the manual curation creates a bottleneck that kills engagement." Result: the Green element is still Green, but the boundary conditions are now visible.

---

## Technique 2: Reverse Interrogation

**Description**: For every Yellow zone element, ask: "If this node disappeared tomorrow, would the project meaningfully change?" If the answer is "I don't know," the element is not Yellow — it is Red. You do not know the question, let alone the answer.

**Example**: "User acquisition without paid ads" is Yellow. Reverse interrogation: "If I had zero acquisition strategy, what happens?" The answer is obvious — nobody uses the platform. So the element is correctly Yellow. But if the answer were "I don't know what happens," it would be Red, and the protocol would need to add a probe to surface the shape of that unknown.

---

## Technique 3: Legacy Presumption

**Description**: Assume the project fails completely six months from now. Write a one-paragraph "failure report" explaining why it failed. Every cause listed in that report is a blind spot you have right now — it is an unknown unknown that you can only see by looking backward from a hypothetical future.

**Example**: "The niche was too small to sustain content supply. The manual process did not scale. Competitors copied the concept before we could build the moat." These three failure modes are now visible as blind spots. If they were not on the original uncertainty map, add them. If they are on the map but classified as Green, they are probably misclassified.

---

## When to Use Each Technique

| Technique | Best Used When | Signal to Apply |
|-----------|---------------|-----------------|
| **Boundary Puncture** | Your Green zone feels too large or too comfortable. You suspect some Green elements are actually Yellow. | "I can't think of a single reason this could go wrong." |
| **Reverse Interrogation** | Yellow zone elements are numerous but vague. You cannot tell which ones are genuinely important. | "I'm not sure what would happen if this turned out to be wrong." |
| **Legacy Presumption** | The project has been planned before, or there are existing assumptions that nobody has questioned. | "This is just how we always do it." |

---

## Combining Techniques

The three techniques are most effective when used in sequence:

1. **Start with Legacy Presumption** — Write the failure report first. This gives you a list of blind spots that the natural mapping process would miss. Add these to your uncertainty map before you begin classification.

2. **Use Boundary Puncture during classification** — As you assign elements to Green, force yourself to write three failure modes for each. This prevents false certainty from contaminating the map.

3. **Apply Reverse Interrogation after classification** — For every Yellow element, check whether it is truly Yellow or actually Red. This catches misclassifications that would otherwise remain hidden until execution.

The entire sequence takes 10-15 minutes for a typical project and dramatically reduces the chance that your uncertainty map is missing critical elements.

---

_Extracted from the Decomposer Protocol. See `../PROTOCOL.md` for the full protocol._