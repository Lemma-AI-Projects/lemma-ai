import { CircleCheckBig, Ellipsis, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CircularProgress } from '@/components/CircularProgress'
import { ScheduleTimeline } from '@/features/schedule/ScheduleTimeline'
import { TaskCard } from '@/features/schedule/TaskCard'

const tasks = [
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

const overallDone = tasks.reduce((sum, t) => sum + t.progress.completed, 0)
const overallTotal = tasks.reduce((sum, t) => sum + t.progress.total, 0)
const overallPercent = overallTotal > 0 ? Math.round((overallDone / overallTotal) * 100) : 0

export function SchedulePage() {
  return (
    <div className="flex h-full gap-2">
      <div className="flex w-82 shrink-0 flex-col rounded-md border border-zinc-200/80 bg-zinc-50 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {overallDone === overallTotal && overallTotal > 0 ? (
              <CircleCheckBig className="size-4 text-green-500" />
            ) : (
              <CircularProgress value={overallPercent} size={14} strokeWidth={2} />
            )}
            <span className="text-sm font-medium">Today</span>
          </div>
          <div className="flex items-center">
            <Button variant="ghost" size="icon-xs" aria-label="Add task">
              <Plus className="size-4" />
            </Button>
            <Button variant="ghost" size="icon-xs" aria-label="More options">
              <Ellipsis className="size-4" />
            </Button>
          </div>
        </div>
        <div className="scrollbar-hidden mt-2 flex flex-1 flex-col gap-3 overflow-y-auto">
          {tasks.map((task) => (
            <TaskCard key={task.title} {...task} />
          ))}
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-zinc-200/80 bg-zinc-50">
        <ScheduleTimeline />
      </div>
    </div>
  )
}
