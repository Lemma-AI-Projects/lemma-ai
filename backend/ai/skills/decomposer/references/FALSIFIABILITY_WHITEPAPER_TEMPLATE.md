# Falsifiability Whitepaper Template

*(Fill-in-the-blank template for the MIT Scholar cognitive position, Layer 0: Experimental Apparatus. Use this template to define your core thesis in falsifiable terms before any engineering begins.)*

---

## 1. Master Theorem

*(State the core proposition of your project in one sentence. This must be a statement that can be proven false by observable evidence.)*

> **[Product/Project]** aims to validate the core proposition that **[one sentence describing the causal mechanism you believe to be true]** . If this proposition is false, then **[the consequence — what observable outcome would NOT occur]** .

**Fill-in example structure:**

| Field | Your Entry |
|-------|-----------|
| Product/Project | *(e.g., "A recommendation engine for indie bookstores")* |
| Core Proposition | *(e.g., "Readers browsing physical stores will purchase 30% more if recommendations are based on local purchasing patterns rather than national bestseller lists")* |
| Falsification Consequence | *(e.g., "No statistically significant lift in per-visit purchase rate will be observed over a 90-day A/B test")* |

**Validation check:** If you cannot imagine a scenario that would prove your proposition false, your proposition is not yet falsifiable. Reformulate.

---

## 2. Destruction Condition

*(Define the single observable event or metric threshold that, if reached, invalidates the entire direction. This is your project's "kill switch.")*

> The entire direction is immediately invalidated when **[specific observable metric/event]** occurs.

**Fill-in table:**

| Field | Your Entry |
|-------|-----------|
| Observable Metric/Event | *(e.g., "Daily active users < 50 after 4 weeks with $5,000 in acquisition spend")* |
| Measurement Method | *(e.g., "Server-side analytics; no self-reporting")* |
| Decision Window | *(e.g., "Within 7 days of the metric being observed, pause all development")* |
| Who Decides | *(e.g., "Founder + one independent advisor; either can veto continuation")* |

**Design rule:** A destruction condition must be:
- **Pre-registered** (written before data is collected)
- **Observable** (requires no interpretation)
- **Timely** (the window to observe it is shorter than the project's runway)

---

## 3. Time Scale Separation

*(Decompose your system into variables that operate at different speeds. This prevents the common mistake of treating all uncertainty as equally urgent.)*

### Fast Variables (Days to Weeks)

*(Things that change rapidly and can be tested in short iterations.)*

| Variable | Hypothesized Behavior | Test Method | Iteration Cycle |
|----------|----------------------|-------------|-----------------|
| *(e.g., User signup rate)* | *(e.g., Grows 5% week-over-week with organic referrals)* | *(e.g., Track conversion funnel)* | *(e.g., 1 week)* |
| *(fill in)* | *(fill in)* | *(fill in)* | *(fill in)* |
| *(fill in)* | *(fill in)* | *(fill in)* | *(fill in)* |

### Medium Variables (Weeks to Months)

*(Things that require sustained effort to observe meaningful change.)*

| Variable | Hypothesized Behavior | Test Method | Iteration Cycle |
|----------|----------------------|-------------|-----------------|
| *(e.g., Weekly retention rate)* | *(e.g., Stabilizes at 40% by week 8)* | *(e.g., Cohort analysis)* | *(e.g., 4 weeks)* |
| *(fill in)* | *(fill in)* | *(fill in)* | *(fill in)* |
| *(fill in)* | *(fill in)* | *(fill in)* | *(fill in)* |

### Slow Variables (Months to Quarters)

*(Things that define the system's long-term trajectory. These are the hardest to change and the most expensive to test.)*

| Variable | Hypothesized Behavior | Test Method | Iteration Cycle |
|----------|----------------------|-------------|-----------------|
| *(e.g., Network effects: does value per user grow with total user count?)* | *(e.g., Content-per-user ratio increases 2x per quarter)* | *(e.g., Quarterly platform-wide audit)* | *(e.g., 3 months)* |
| *(fill in)* | *(fill in)* | *(fill in)* | *(fill in)* |
| *(fill in)* | *(fill in)* | *(fill in)* | *(fill in)* |

**Separation rule:** Never test a slow variable with a fast-variable methodology. If you need to observe a network effect, you cannot run a one-week experiment.

---

## 4. The Null Path

*(Define what you will have learned — and what output you can publish — if the project fails. This ensures that even a negative result produces academic or professional value.)*

> If this project fails, the data will still be publishable because **[specific reason]** .

**Fill-in table:**

| Field | Your Entry |
|-------|-----------|
| Publishable Reason | *(e.g., "The A/B test design controls for confounding variables, making the null result a valid contribution to the literature on recommendation systems")* |
| Target Venue | *(e.g., "Internal whitepaper, blog post, or conference talk (e.g., RecSys workshop)")* |
| Data That Will Be Released | *(e.g., "Anonymized cohort data, experiment design document, and analysis scripts")* |
| What We Will Have Learned | *(e.g., "That local-pattern recommendation does NOT outperform national-bestseller baselines in physical bookstores — a non-obvious result")* |

**Design rule:** If you cannot imagine a publishable null result, you have not defined your experiment clearly enough. A falsifiable thesis is one where both positive and negative outcomes are informative.

---

## 5. Complete Worked Example

**Scenario:** Build a short-form video platform for niche hobby communities.

### Master Theorem

> **HobbyVid** aims to validate the core proposition that **users in niche hobby communities (e.g., aquascaping, mechanical keyboards, bonsai) will produce and consume short-form video content at higher engagement rates than general-interest platforms because the content maps directly to an existing identity and skill-building practice**. If this proposition is false, then **no niche hobby community will sustain >30% week-4 retention, and content production will fall below 1 video per 10 active users per week within 8 weeks of launch**.

| Field | Entry |
|-------|-------|
| Product/Project | HobbyVid — a short-form video platform for niche hobby communities |
| Core Proposition | Users in niche hobby communities will produce and consume short-form video content at higher engagement rates than general-interest platforms because content maps to existing identity and skill-building practice |
| Falsification Consequence | No niche hobby community sustains >30% week-4 retention, and content production falls below 1 video per 10 active users per week within 8 weeks |

### Destruction Condition

> The entire direction is immediately invalidated when **fewer than 3 out of 5 initial hobby communities fail to reach 200 MAU with <$2,000 in acquisition spend per community within 6 weeks of launch**.

| Field | Entry |
|-------|-------|
| Observable Metric/Event | <3 of 5 communities reach 200 MAU with <$2,000/community spend in 6 weeks |
| Measurement Method | Server-side analytics (signups, DAU/MAU, content uploads) |
| Decision Window | Within 7 days after the 6-week mark |
| Who Decides | Founder + lead investor or advisor |

### Time Scale Separation

| Speed | Variable | Hypothesized Behavior | Test Method | Cycle |
|-------|----------|----------------------|-------------|-------|
| **Fast** | Content upload rate (per user per week) | >0.5 uploads/user/week in the first 2 weeks | Server-side event tracking | 1 week |
| **Fast** | Invite acceptance rate | >30% of invites accepted within 48 hours | Link tracking | 1 week |
| **Medium** | Week-4 retention (per cohort) | >30% of week-1 users still active at week 4 | Cohort analysis | 4 weeks |
| **Medium** | Video completion rate | >60% of videos watched to 80% completion | Playback analytics | 4 weeks |
| **Slow** | Cross-community content discovery | >15% of user sessions include content from a community they did not join | Cross-community event tracking | 3 months |
| **Slow** | Skill-progression loop | Users who post tutorials show 2x retention over users who only consume | Longitudinal user tracking | 3 months |

### The Null Path

> If this project fails, the data will still be publishable because **the controlled launch across multiple comparable hobby communities provides a natural experiment on whether identity-aligned content drives retention — a question that general-interest platforms cannot answer because their user base is too diffuse**.

| Field | Entry |
|-------|-------|
| Publishable Reason | Controlled multi-community launch provides a natural experiment on identity-aligned content vs. general-interest retention |
| Target Venue | Internal whitepaper; Product School / Platypus Labs blog; or conference talk (e.g., ProductCon, SVPG) |
| Data That Will Be Released | Anonymized community-level retention curves, content production rates, and experiment design document |
| What We Will Have Learned | Whether niche identity-aligned communities can sustain short-form video production without the network effects of a general platform — a non-trivial finding for any community-based product |

---

## Usage Notes

1. **Complete this template before writing any code.** The falsifiability whitepaper is Layer 0 of the MIT Scholar cognitive position. It defines what would count as evidence before any engineering resources are committed.
2. **The destruction condition is not optional.** If you cannot define a condition that would kill the project, you are not ready to start.
3. **Time scale separation prevents premature optimization.** Fast variables should be tested with cheap, quick experiments. Slow variables should be monitored but not optimized until fast variables stabilize.
4. **The null path protects against sunk cost.** Knowing that a failure still produces publishable value reduces the emotional resistance to honestly evaluating results.