export interface ScheduleTaskTag {
  label: string
  bg: string
  text: string
}

export interface ScheduleTaskMock {
  id: string
  title: string
  description: string
  tags: readonly ScheduleTaskTag[]
  /** 相对今天的天数：0 = 今天，-1 = 昨天。样例数据跟随打开页面的日期平移。 */
  dayOffset: number
  /** 预计时长（分钟），决定日历格子里这一段条的长度 */
  minutes: number
  commentCount: number
  progress: { completed: number; total: number }
}

const MATH = { label: 'Math', bg: 'bg-blue-100', text: 'text-blue-700' }
const VIDEO = { label: 'Video', bg: 'bg-orange-100', text: 'text-orange-700' }
const CS = { label: 'CS', bg: 'bg-violet-100', text: 'text-violet-700' }
const PRACTICE = { label: 'Practice', bg: 'bg-emerald-100', text: 'text-emerald-700' }
const AI = { label: 'AI', bg: 'bg-sky-100', text: 'text-sky-700' }
const READING = { label: 'Reading', bg: 'bg-amber-100', text: 'text-amber-700' }
const QUIZ = { label: 'Quiz', bg: 'bg-rose-100', text: 'text-rose-700' }
const PAPER = { label: 'Paper', bg: 'bg-fuchsia-100', text: 'text-fuchsia-700' }

export const scheduleTasks: readonly ScheduleTaskMock[] = [
  { id: 't01', title: 'Matrix multiplication lecture', description: 'Lecture 3 of the linear algebra course, with in-video checks', tags: [MATH, VIDEO], dayOffset: -21, minutes: 60, commentCount: 0, progress: { completed: 3, total: 3 } },
  { id: 't02', title: 'Python basics quiz', description: 'Variables, control flow and functions', tags: [CS, QUIZ], dayOffset: -21, minutes: 30, commentCount: 1, progress: { completed: 1, total: 1 } },
  { id: 't03', title: 'Read "Attention" paper intro', description: 'Abstract, introduction and background sections', tags: [AI, PAPER], dayOffset: -20, minutes: 45, commentCount: 0, progress: { completed: 2, total: 2 } },
  { id: 't04', title: 'Determinants practice', description: 'Cofactor expansion and row reduction, exercises 1-5', tags: [MATH, PRACTICE], dayOffset: -19, minutes: 50, commentCount: 0, progress: { completed: 5, total: 5 } },
  { id: 't05', title: 'ML lecture 1 notes', description: 'Supervised learning overview', tags: [AI, READING], dayOffset: -19, minutes: 40, commentCount: 0, progress: { completed: 1, total: 1 } },
  { id: 't06', title: 'Recursion drills', description: 'Four classic recursion problems', tags: [CS, PRACTICE], dayOffset: -19, minutes: 30, commentCount: 2, progress: { completed: 4, total: 4 } },
  { id: 't07', title: 'Rank of a matrix', description: 'Lecture 5 and the rank–nullity theorem', tags: [MATH, VIDEO], dayOffset: -17, minutes: 60, commentCount: 0, progress: { completed: 2, total: 2 } },
  { id: 't08', title: 'Vector spaces', description: 'Lecture 6: span, basis and dimension', tags: [MATH, VIDEO], dayOffset: -14, minutes: 60, commentCount: 0, progress: { completed: 2, total: 2 } },
  { id: 't09', title: 'Loops and functions', description: 'Six short exercises on iteration', tags: [CS, PRACTICE], dayOffset: -14, minutes: 45, commentCount: 0, progress: { completed: 6, total: 6 } },
  { id: 't10', title: 'Gradient descent reading', description: 'Chapter 4.1 of the ML textbook', tags: [AI, READING], dayOffset: -13, minutes: 40, commentCount: 1, progress: { completed: 1, total: 1 } },
  { id: 't11', title: 'Linear transformations', description: 'Lecture 7 with matrix representations', tags: [MATH, VIDEO], dayOffset: -12, minutes: 60, commentCount: 0, progress: { completed: 2, total: 2 } },
  { id: 't12', title: 'Sorting algorithms', description: 'Implement merge sort and quicksort, compare runtimes', tags: [CS, PRACTICE], dayOffset: -12, minutes: 60, commentCount: 3, progress: { completed: 3, total: 5 } },
  { id: 't13', title: 'Calculus: limits', description: 'Epsilon-delta definition and limit laws', tags: [MATH, PRACTICE], dayOffset: -12, minutes: 45, commentCount: 0, progress: { completed: 4, total: 4 } },
  { id: 't14', title: 'ML lecture 2 notes', description: 'Linear regression and least squares', tags: [AI, READING], dayOffset: -10, minutes: 40, commentCount: 0, progress: { completed: 1, total: 1 } },
  { id: 't15', title: 'Eigenvalues intro', description: 'Lecture 9: characteristic polynomial', tags: [MATH, VIDEO], dayOffset: -7, minutes: 60, commentCount: 0, progress: { completed: 2, total: 2 } },
  { id: 't16', title: 'Dictionaries practice', description: 'Counting, grouping and nested lookups', tags: [CS, PRACTICE], dayOffset: -7, minutes: 45, commentCount: 0, progress: { completed: 3, total: 3 } },
  { id: 't17', title: 'Derivatives review', description: 'Chain rule and implicit differentiation', tags: [MATH, PRACTICE], dayOffset: -6, minutes: 50, commentCount: 0, progress: { completed: 5, total: 5 } },
  { id: 't18', title: 'Paper sections 4-5', description: 'Experiments and ablations of the "Attention" paper', tags: [AI, PAPER], dayOffset: -6, minutes: 45, commentCount: 1, progress: { completed: 1, total: 2 } },
  { id: 't19', title: 'Similar matrices', description: 'Lecture 10 and change of basis', tags: [MATH, VIDEO], dayOffset: -5, minutes: 60, commentCount: 0, progress: { completed: 2, total: 2 } },
  { id: 't20', title: 'Regularization notes', description: 'L1 vs L2 and when to use each', tags: [AI, READING], dayOffset: -5, minutes: 30, commentCount: 0, progress: { completed: 1, total: 1 } },
  { id: 't21', title: 'Stacks and queues', description: 'Implement both with a linked list', tags: [CS, PRACTICE], dayOffset: -5, minutes: 45, commentCount: 0, progress: { completed: 2, total: 2 } },
  { id: 't22', title: 'Integration basics', description: 'Antiderivatives and substitution', tags: [MATH, PRACTICE], dayOffset: -3, minutes: 60, commentCount: 0, progress: { completed: 4, total: 4 } },
  { id: 't23', title: 'Diagonalization', description: 'Lecture 11 and exercises on diagonalizable matrices', tags: [MATH, VIDEO], dayOffset: -2, minutes: 60, commentCount: 2, progress: { completed: 1, total: 3 } },
  { id: 't24', title: 'Linked lists', description: 'Reverse, merge and detect cycles', tags: [CS, PRACTICE], dayOffset: -2, minutes: 45, commentCount: 0, progress: { completed: 2, total: 2 } },
  { id: 't25', title: 'Loss functions reading', description: 'Cross-entropy and hinge loss', tags: [AI, READING], dayOffset: -2, minutes: 30, commentCount: 0, progress: { completed: 1, total: 1 } },
  { id: 't26', title: 'Quadratic forms', description: 'Lecture 12 part one', tags: [MATH, VIDEO], dayOffset: -1, minutes: 60, commentCount: 0, progress: { completed: 2, total: 2 } },
  { id: 't27', title: 'Tree traversal', description: 'Pre-, in- and post-order, recursive and iterative', tags: [CS, PRACTICE], dayOffset: -1, minutes: 50, commentCount: 0, progress: { completed: 3, total: 3 } },
  { id: 't28', title: 'Calculus drills', description: 'Mixed practice on derivatives and integrals', tags: [MATH, PRACTICE], dayOffset: -1, minutes: 40, commentCount: 0, progress: { completed: 5, total: 5 } },
  { id: 't29', title: 'ML lecture 3 notes', description: 'Logistic regression', tags: [AI, READING], dayOffset: -1, minutes: 30, commentCount: 0, progress: { completed: 1, total: 1 } },
  { id: 't30', title: 'Positive definite matrices', description: 'Tests for definiteness, exercises 1-3', tags: [MATH, PRACTICE], dayOffset: -1, minutes: 40, commentCount: 1, progress: { completed: 2, total: 3 } },
  { id: 't31', title: 'Hash tables', description: 'Open addressing vs chaining', tags: [CS, READING], dayOffset: -1, minutes: 45, commentCount: 0, progress: { completed: 2, total: 2 } },
  { id: 't32', title: 'Integration by parts', description: 'Three worked problems', tags: [MATH, PRACTICE], dayOffset: -1, minutes: 30, commentCount: 0, progress: { completed: 1, total: 3 } },
  { id: 't33', title: 'Weekly quiz', description: 'Covers this week in linear algebra and calculus', tags: [MATH, QUIZ], dayOffset: -1, minutes: 25, commentCount: 0, progress: { completed: 0, total: 1 } },
  { id: 't34', title: 'Watch Linear Algebra Lecture 12', description: 'Continue from eigenvalues decomposition, complete exercises 5-8', tags: [MATH, VIDEO], dayOffset: 0, minutes: 60, commentCount: 2, progress: { completed: 1, total: 4 } },
  { id: 't35', title: 'Complete Python exercises Ch.5', description: 'Lists, dictionaries, and set comprehensions — all 6 exercises', tags: [CS, PRACTICE], dayOffset: 0, minutes: 45, commentCount: 0, progress: { completed: 0, total: 6 } },
  { id: 't36', title: 'Review ML lecture notes', description: 'Gradient descent, loss functions, and regularization summary', tags: [AI, READING], dayOffset: 0, minutes: 30, commentCount: 1, progress: { completed: 3, total: 3 } },
  { id: 't37', title: 'Calculus quiz preparation', description: 'Practice integration by parts and partial fractions problems', tags: [MATH, QUIZ], dayOffset: 0, minutes: 50, commentCount: 3, progress: { completed: 2, total: 5 } },
  { id: 't38', title: 'Read ERTA paper sections 1-3', description: 'Focus on methodology and experiment design, take notes for discussion', tags: [AI, PAPER], dayOffset: 1, minutes: 45, commentCount: 0, progress: { completed: 1, total: 3 } },
  { id: 't39', title: 'Midterm review: matrices', description: 'Rework lectures 1-8 exercises', tags: [MATH, PRACTICE], dayOffset: 2, minutes: 120, commentCount: 0, progress: { completed: 0, total: 4 } },
  { id: 't40', title: 'Graph traversal', description: 'BFS and DFS on adjacency lists', tags: [CS, PRACTICE], dayOffset: 2, minutes: 50, commentCount: 0, progress: { completed: 0, total: 3 } },
  { id: 't41', title: 'Midterm review: eigenvalues', description: 'Rework lectures 9-12 exercises', tags: [MATH, PRACTICE], dayOffset: 3, minutes: 120, commentCount: 0, progress: { completed: 0, total: 4 } },
  { id: 't42', title: 'ML lecture 4 notes', description: 'Neural network basics', tags: [AI, READING], dayOffset: 3, minutes: 30, commentCount: 0, progress: { completed: 0, total: 1 } },
  { id: 't43', title: 'Mock midterm', description: 'Timed, 90 minutes', tags: [MATH, QUIZ], dayOffset: 4, minutes: 90, commentCount: 0, progress: { completed: 0, total: 1 } },
  { id: 't44', title: 'Hash map exercises', description: 'Five problems on frequency counting', tags: [CS, PRACTICE], dayOffset: 4, minutes: 45, commentCount: 0, progress: { completed: 0, total: 5 } },
  { id: 't45', title: 'Calculus quiz', description: 'Integration techniques', tags: [MATH, QUIZ], dayOffset: 4, minutes: 60, commentCount: 0, progress: { completed: 0, total: 1 } },
  { id: 't46', title: 'Paper discussion prep', description: 'Prepare three questions for the reading group', tags: [AI, PAPER], dayOffset: 4, minutes: 40, commentCount: 0, progress: { completed: 0, total: 2 } },
  { id: 't47', title: 'Error log review', description: 'Go through every mistake from this month', tags: [MATH, READING], dayOffset: 4, minutes: 60, commentCount: 0, progress: { completed: 0, total: 1 } },
  { id: 't48', title: 'Weekly review', description: 'Plan next week and update goals', tags: [AI, READING], dayOffset: 6, minutes: 60, commentCount: 0, progress: { completed: 0, total: 1 } },
]
