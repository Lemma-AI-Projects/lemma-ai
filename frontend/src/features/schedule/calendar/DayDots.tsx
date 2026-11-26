import { cn } from '@/lib/utils'
import {
  calendarTaskStatus,
  type CalendarTask,
  type CalendarTaskStatus,
} from './calendarTasks'

// 最多画这么多个点；再多就画少一个，剩下的写成「+N」。
const MAX_DOTS = 5

const DOT_CLASS_NAME: Record<CalendarTaskStatus, string> = {
  done: 'bg-emerald-500',
  started: 'ring-[1.5px] ring-emerald-500 ring-inset',
  todo: 'bg-zinc-400',
  planned: 'ring-[1.5px] ring-zinc-400 ring-inset',
}

// 一天的圆点：一件事一个点。实心绿是做完了，空心绿是做了一部分，
// 实心灰是该做还没做，空心灰是还没到日子。
// 没有任务时也占着同样的高度，各个格子里的日期数字才能对齐。
export function DayDots({
  className,
  tasks,
  today,
}: {
  className?: string
  tasks: readonly CalendarTask[]
  today: Date
}) {
  const shown = tasks.length > MAX_DOTS ? tasks.slice(0, MAX_DOTS - 1) : tasks
  const hiddenCount = tasks.length - shown.length

  return (
    <span
      aria-hidden
      className={cn('flex h-2 items-center justify-center gap-[3px]', className)}
    >
      {shown.map((task) => (
        <span
          key={task.id}
          className={cn(
            'size-1.5 rounded-full',
            DOT_CLASS_NAME[calendarTaskStatus(task, today)]
          )}
        />
      ))}
      {hiddenCount > 0 && (
        <span className="text-[10px] leading-none text-zinc-500 tabular-nums">
          +{hiddenCount}
        </span>
      )}
    </span>
  )
}
