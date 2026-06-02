export interface CourseConversationMessage {
  role: 'user' | 'assistant'
  message: string
  date: string
}

export const courseConversationMessages: Record<
  string,
  CourseConversationMessage[]
> = {
  'course-conv-1': [
    {
      role: 'user',
      message:
        'I understand how to calculate eigenvectors, but I still do not feel why they matter geometrically.',
      date: '2026-05-12T09:15:00',
    },
    {
      role: 'assistant',
      message: `## The geometric idea

An eigenvector is a direction that a linear transformation does **not rotate away from itself**.

The matrix may stretch it, shrink it, or flip it, but the vector remains on the same line. That makes eigenvectors useful because they reveal the stable directions hidden inside a transformation.

### A practical way to remember it

- Most vectors get moved into a new direction
- Eigenvectors keep their direction
- Eigenvalues tell you how much they are scaled

So instead of seeing a matrix as a black box, eigenvectors let you describe it through its most natural directions.`,
      date: '2026-05-12T09:15:24',
    },
  ],
  'course-conv-2': [
    {
      role: 'user',
      message:
        'Can you help me review diagonalization before I move into spectral decomposition?',
      date: '2026-05-12T10:05:00',
    },
    {
      role: 'assistant',
      message: `## Diagonalization review path

Focus on three questions:

1. **Do we have enough independent eigenvectors?**
2. **Can we build the change-of-basis matrix from them?**
3. **Does the diagonal matrix encode the matching eigenvalues?**

The core identity is:

\`\`\`text
A = P D P^-1
\`\`\`

Read it as: move into the eigenvector basis, apply simple scaling, then move back.`,
      date: '2026-05-12T10:05:31',
    },
  ],
  'course-conv-3': [
    {
      role: 'user',
      message:
        'When should I use a tuple instead of a list in Python data structures?',
      date: '2026-05-13T14:20:00',
    },
    {
      role: 'assistant',
      message: `## List vs tuple

Use a **list** when the collection is expected to change.

Use a **tuple** when the collection represents a fixed shape or record.

### Examples

- List: a queue of tasks that can grow or shrink
- Tuple: a coordinate like \`(x, y)\`
- Tuple: a function returning \`(status, result)\`

The key distinction is not syntax. It is whether mutation is part of the meaning.`,
      date: '2026-05-13T14:20:19',
    },
  ],
  'course-conv-4': [
    {
      role: 'user',
      message:
        'I want to model student scores. How should I think about dictionary keys?',
      date: '2026-05-13T15:02:00',
    },
    {
      role: 'assistant',
      message: `## Designing dictionary keys

A good dictionary key should answer: **what do I need to look up quickly?**

For student scores, common choices are:

- Student id -> all scores for that student
- Course id -> all student scores in that course
- \`(student_id, course_id)\` -> one specific score record

If lookup is the main operation, design the key around the lookup question.`,
      date: '2026-05-13T15:02:28',
    },
  ],
  'course-conv-5': [
    {
      role: 'user',
      message:
        'How do I decide what counts as a feature and what counts as a label?',
      date: '2026-05-14T11:40:00',
    },
    {
      role: 'assistant',
      message: `## Feature and label framing

The **label** is what you want the model to predict.

The **features** are the information available before the prediction is made.

### Quick test

Ask yourself:

- At prediction time, will this value already be known?
- Or is this the thing I am trying to predict?

If it is known beforehand, it can be a feature. If it is the target outcome, it is the label.`,
      date: '2026-05-14T11:40:26',
    },
  ],
  'course-conv-6': [
    {
      role: 'user',
      message:
        'I keep mixing up validation error and training error when thinking about overfitting.',
      date: '2026-05-14T12:18:00',
    },
    {
      role: 'assistant',
      message: `## Overfitting signal

Overfitting usually shows up as a gap:

- Training error keeps going down
- Validation error stops improving or gets worse

That means the model is getting better at the examples it has already seen, but worse at generalizing to held-out data.

### Simple mental model

Training error measures memorization plus learning.

Validation error is closer to the question you actually care about: **will this work on new examples?**`,
      date: '2026-05-14T12:18:34',
    },
  ],
  'course-conv-7': [
    {
      role: 'user',
      message:
        'How can I quickly recognize when substitution is the right integration technique?',
      date: '2026-05-15T08:50:00',
    },
    {
      role: 'assistant',
      message: `## Substitution pattern

Substitution is often useful when you see:

- A nested expression
- The derivative of that inner expression nearby

### Example pattern

\`\`\`text
f(g(x)) * g'(x)
\`\`\`

That structure suggests reversing the chain rule. Choose \`u = g(x)\`, then rewrite the integral in terms of \`u\`.`,
      date: '2026-05-15T08:50:22',
    },
  ],
  'course-conv-8': [
    {
      role: 'user',
      message:
        'What should I check first when I see an improper integral?',
      date: '2026-05-15T09:26:00',
    },
    {
      role: 'assistant',
      message: `## Improper integral checklist

Start by locating the issue:

1. Does the interval go to infinity?
2. Does the integrand become undefined inside the interval?
3. Does the integrand blow up at an endpoint?

After that, replace the problematic boundary with a limit.

The important habit is: **do not evaluate it like an ordinary definite integral until the limit form is written down.**`,
      date: '2026-05-15T09:26:29',
    },
  ],
  'course-conv-9': [
    {
      role: 'user',
      message:
        'How do I find which React components are re-rendering unnecessarily?',
      date: '2026-05-16T16:10:00',
    },
    {
      role: 'assistant',
      message: `## Start with render causes

Look for three common triggers:

- Parent re-rendering and passing new props
- State living higher than necessary
- New object or function references created on each render

Use React DevTools Profiler to confirm the actual expensive renders before optimizing.

The goal is not zero re-renders. The goal is avoiding renders that are expensive and unrelated to the interaction.`,
      date: '2026-05-16T16:10:37',
    },
  ],
  'course-conv-10': [
    {
      role: 'user',
      message:
        'When is memoization worth it in React, and when is it just noise?',
      date: '2026-05-16T17:04:00',
    },
    {
      role: 'assistant',
      message: `## Memoization tradeoff

Memoization is worth considering when:

- A component is expensive to render
- Its props are often unchanged
- You have measured a real interaction cost

It is usually noise when:

- The component is cheap
- Props change every time anyway
- The memoization makes the code harder to understand

Treat \`memo\`, \`useMemo\`, and \`useCallback\` as performance tools, not default style.`,
      date: '2026-05-16T17:04:25',
    },
  ],
  'course-conv-11': [
    {
      role: 'user',
      message:
        'I can compute a confidence interval, but I want a better intuition for what it means.',
      date: '2026-05-17T09:12:00',
    },
    {
      role: 'assistant',
      message: `## Confidence interval intuition

A confidence interval is a range produced by a method that is reliable over repeated sampling.

It does **not** mean there is a 95% chance this specific fixed parameter is inside the interval. It means the interval-building process would capture the true value about 95% of the time across many repeated samples.

### Practical reading

- Wider intervals mean more uncertainty
- More data usually narrows the interval
- Higher confidence usually widens the interval`,
      date: '2026-05-17T09:12:27',
    },
  ],
  'course-conv-12': [
    {
      role: 'user',
      message:
        'How do I quickly tell whether a database table needs normalization?',
      date: '2026-05-17T10:35:00',
    },
    {
      role: 'assistant',
      message: `## Normalization quick check

Look for repeated facts that could become inconsistent.

Common warning signs:

- The same customer name appears in many order rows
- Updating one fact requires editing multiple rows
- Deleting one row accidentally removes unrelated information

If one row is trying to describe two different entities, split the entities into separate tables and connect them with keys.`,
      date: '2026-05-17T10:35:31',
    },
  ],
  'course-conv-13': [
    {
      role: 'user',
      message:
        'When I look at an activation funnel, what should I inspect before jumping to solutions?',
      date: '2026-05-17T14:08:00',
    },
    {
      role: 'assistant',
      message: `## Funnel drop-off reading

Start with the biggest absolute loss, not only the biggest percentage drop.

Then segment the funnel:

- New vs returning users
- Acquisition channel
- Device or platform
- User intent or plan type

The strongest product insight usually comes from asking **who drops off, where, and under what context** before proposing UI changes.`,
      date: '2026-05-17T14:08:29',
    },
  ],
}
