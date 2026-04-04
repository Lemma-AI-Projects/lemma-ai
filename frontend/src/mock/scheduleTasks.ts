export const tasks = [
  {
    title: 'Watch Linear Algebra Lecture 12',
    description: 'Continue from eigenvalues decomposition, complete exercises 5-8',
    tags: [
      { label: 'Math', bg: 'bg-blue-100', text: 'text-blue-700' },
      { label: 'Video', bg: 'bg-orange-100', text: 'text-orange-700' },
    ],
    dueDate: 'Mar 15',
    commentCount: 2,
    progress: { completed: 1, total: 4 },
    overdue: true,
  },
  {
    title: 'Complete Python exercises Ch.5',
    description: 'Lists, dictionaries, and set comprehensions — all 6 exercises',
    tags: [
      { label: 'CS', bg: 'bg-violet-100', text: 'text-violet-700' },
      { label: 'Practice', bg: 'bg-emerald-100', text: 'text-emerald-700' },
    ],
    dueDate: 'Mar 15',
    commentCount: 0,
    progress: { completed: 0, total: 6 },
  },
  {
    title: 'Review ML lecture notes',
    description: 'Gradient descent, loss functions, and regularization summary',
    tags: [
      { label: 'AI', bg: 'bg-sky-100', text: 'text-sky-700' },
      { label: 'Reading', bg: 'bg-amber-100', text: 'text-amber-700' },
    ],
    dueDate: 'Mar 16',
    commentCount: 1,
    progress: { completed: 3, total: 3 },
  },
  {
    title: 'Calculus quiz preparation',
    description: 'Practice integration by parts and partial fractions problems',
    tags: [
      { label: 'Math', bg: 'bg-blue-100', text: 'text-blue-700' },
      { label: 'Quiz', bg: 'bg-rose-100', text: 'text-rose-700' },
    ],
    dueDate: 'Mar 16',
    commentCount: 3,
    progress: { completed: 2, total: 5 },
  },
  {
    title: 'ReadERTA paper sections 1-3',
    description: 'Focus on methodology and experiment design, take notes for discussion',
    tags: [
      { label: 'AI', bg: 'bg-sky-100', text: 'text-sky-700' },
      { label: 'Paper', bg: 'bg-fuchsia-100', text: 'text-fuchsia-700' },
    ],
    dueDate: 'Mar 17',
    commentCount: 0,
    progress: { completed: 1, total: 3 },
  },
] as const
