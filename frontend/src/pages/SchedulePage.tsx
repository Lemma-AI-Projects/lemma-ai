import { CircleCheckBig, Ellipsis, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CircularProgress } from '@/components/CircularProgress'
import { ScheduleTimeline } from '@/features/schedule/ScheduleTimeline'
import { TaskCard } from '@/features/schedule/TaskCard'
import { tasks } from '@/mock/scheduleTasks'

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
