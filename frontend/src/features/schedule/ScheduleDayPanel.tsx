import { format } from 'date-fns'
import { CircleCheckBig, Ellipsis, Plus } from 'lucide-react'

import { CircularProgress } from '@/components/CircularProgress'
import { Button } from '@/components/ui/button'
import type { ScheduleTask } from './getScheduleTasks'
import { TaskCard } from './TaskCard'

/** 左栏：所选日期的任务列表。日历只画节奏，任务名都在这里读。 */
export function ScheduleDayPanel({
  date,
  isToday,
  tasks,
  onBackToToday,
}: {
  date: Date
  isToday: boolean
  tasks: readonly ScheduleTask[]
  onBackToToday: () => void
}) {
  const done = tasks.reduce((sum, task) => sum + task.progress.completed, 0)
  const total = tasks.reduce((sum, task) => sum + task.progress.total, 0)
  const percent = total > 0 ? Math.round((done / total) * 100) : 0
  const allDone = total > 0 && done === total

  return (
    <div className="flex w-82 shrink-0 flex-col rounded-md border border-zinc-200/80 bg-zinc-50 p-3">
      <div className="flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-1.5">
          {allDone ? (
            <CircleCheckBig className="size-4 text-green-500" />
          ) : (
            <CircularProgress value={percent} size={14} strokeWidth={2} />
          )}
          <span className="truncate text-sm font-medium">
            {isToday ? 'Today' : format(date, 'EEE, MMM d')}
          </span>
          {!isToday ? (
            <Button
              variant="ghost"
              size="xs"
              className="ml-1 h-6 rounded-full px-2 text-xs font-normal text-zinc-500"
              onClick={onBackToToday}
            >
              Today
            </Button>
          ) : null}
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
        {tasks.length === 0 ? (
          <p className="py-10 text-center text-sm text-zinc-400">No tasks scheduled</p>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              title={task.title}
              description={task.description}
              tags={task.tags}
              dueDate={task.dueDateLabel}
              commentCount={task.commentCount}
              progress={task.progress}
              overdue={task.overdue}
            />
          ))
        )}
      </div>
    </div>
  )
}
