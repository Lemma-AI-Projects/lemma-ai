# Zero-Code Validation Template

## Wizard-of-Oz / Manual Simulation Approach

> **Target Audience**: Non-technical founders who need to validate an idea before investing in development.
> **Core Principle**: Simulate the product manually. If people won't use a human-powered version, they won't use an automated one.

---

## 1. Core Question

**What is the single most important assumption that must be validated?**

> Fill in:
> _"We assume that [target user] will [desired behavior] because [hypothesized motivation]."_

---

## 2. Manual Process Map

| What the final product would do | What a human does instead | Tools / Medium |
|---|---|---|
| [e.g., Algorithmically generate meal plans] | [e.g., Manually curate 3 meal options per user] | [e.g., Spreadsheet + Email] |
| [e.g., Send push notifications] | [e.g., Send SMS or WhatsApp message] | [e.g., Twilio / Personal phone] |
| [e.g., Track user preferences over time] | [e.g., Log preferences in a CRM or spreadsheet] | [e.g., Airtable / Google Sheets] |
| [e.g., Generate a weekly shopping list] | [e.g., Manually compile list from meal plan] | [e.g., Google Docs] |
| [e.g., Charge subscription fee] | [e.g., Collect payment via manual invoice] | [e.g., Stripe invoice / PayPal] |

---

## 3. Wizard-of-Oz Experiment Design

### 3.1 The Illusion

> **The user thinks the system is doing**:
> `[Describe what the user believes is automated]`

> **But actually a human is doing**:
> `[Describe the manual process behind the curtain]`

### 3.2 Success Metrics

> **Success** = `[number]` users complete `[action]` by `[deadline]`.

> **Leading indicator**: `[e.g., 50% of users who sign up complete their first week]`

> **Lagging indicator**: `[e.g., 3 users refer a friend within the trial period]`

### 3.3 Cost & Resources

> **This experiment costs** `[time/money estimate]` **and requires** `[people / tools / resources]`.

| Resource | Quantity | Estimated Cost |
|---|---|---|
| [e.g., Human hours per week] | [e.g., 10 hrs/week] | [e.g., $200/week] |
| [e.g., Software tools] | [e.g., 1 Airtable Pro account] | [e.g., $20/month] |
| [e.g., Communication costs] | [e.g., SMS credits] | [e.g., $50] |
| **Total estimated budget** | | **[$total]** |

---

## 4. Validation Criteria

> **The idea is validated if**:
> `[Describe the specific, measurable condition that proves the idea works]`

> **The idea is invalid if**:
> `[Describe the specific, measurable condition that proves the idea does not work]`

---

## 5. Complete Worked Example

### Scenario: A personalized meal-planning app for busy professionals

### 1. Core Question

> _We assume that **busy professionals aged 28-45 who cook at home at least 3x/week** will **pay $15/month for a personalized meal-planning service** because **they spend too much time deciding what to cook and often waste food they bought but didn't use**._

### 2. Manual Process Map

| What the final product would do | What a human does instead | Tools / Medium |
|---|---|---|
| Algorithmically generate personalized meal plans based on dietary preferences | Manually research and curate 5 dinner recipes per user per week, tailored to their stated preferences | Google Sheets + recipe websites (e.g., NYT Cooking, AllRecipes) |
| Send weekly meal plan push notifications | Send a personalized WhatsApp message every Sunday at 4 PM with the week's meal plan | WhatsApp Business account |
| Auto-generate a grocery shopping list | Manually scan each recipe and compile a combined shopping list, organized by supermarket aisle | Google Docs |
| Learn user preferences over time (likes/dislikes) | After each week, manually ask the user: "Rate last week's meals 1-5. What would you change?" and log responses in Airtable | Airtable |
| Auto-charge monthly subscription | Send a PayPal invoice on the 1st of each month | PayPal invoicing |

### 3. Wizard-of-Oz Experiment Design

#### The Illusion

> **The user thinks the system is doing**:
> An AI-powered meal-planning engine that automatically generates personalized weekly plans, learns preferences, and sends everything on autopilot.

> **But actually a human is doing**:
> Manually researching recipes, typing WhatsApp messages, compiling shopping lists by hand, and tracking feedback in a spreadsheet.

#### Success Metrics

> **Success** = **10** users complete **4 consecutive weeks of using the meal plan** by **30 days from launch**.

> **Leading indicator**: 60% of users who receive Week 1's meal plan cook at least 3 of the 5 recipes.

> **Lagging indicator**: 2 users refer a colleague within the first 30 days.

#### Cost & Resources

> **This experiment costs** **$270 + 15 hours of labor** **and requires** **1 person (the founder) + basic tools**.

| Resource | Quantity | Estimated Cost |
|---|---|---|
| Founder time (curation + messaging) | 15 hrs/week | $0 (sweat equity) |
| WhatsApp Business account | 1 | $0 |
| Google Workspace (Sheets + Docs) | 1 | $0 |
| Airtable Pro (feedback tracking) | 1 month | $20 |
| PayPal transaction fees | ~3% of payments | ~$5 |
| SMS/calling (if WhatsApp fails) | Contingency | ~$10 |
| **Total estimated budget** | | **~$35 cash + 60 hrs total labor** |

### 4. Validation Criteria

> **The idea is validated if**:
> At least 7 out of 10 initial users complete 4 weeks, **and** at least 2 express willingness to pay $15/month (or actually pay). Retention curve is flat or improving after Week 2.

> **The idea is invalid if**:
> Fewer than 4 users complete Week 2, **or** all users say the meal plan is not useful enough to pay for, **or** the manual process takes more than 20 hours/week to sustain (meaning automation would be too expensive to build).

---

## 6. Quick Reference Card

```
┌─────────────────────────────────────────────────────────────┐
│                    ZERO-CODE VALIDATION                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  QUESTION  ──→  Is there a real problem worth solving?      │
│                                                             │
│  METHOD    ──→  Simulate the product manually.              │
│                 The user never knows a human is behind it.   │
│                                                             │
│  COST      ──→  Should be under $500 and 1-4 weeks.        │
│                                                             │
│  OUTCOME   ──→  Hard data: retention, willingness to pay.   │
│                 Not opinions, not surveys.                  │
│                                                             │
│  RULE      ──→  If people won't use a free manual version,  │
│                 they definitely won't pay for an automated   │
│                 version.                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```