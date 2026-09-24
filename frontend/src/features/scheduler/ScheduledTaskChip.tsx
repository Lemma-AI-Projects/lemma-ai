import { format, parseISO } from 'date-fns'
import { Clock, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { ScheduledTask } from './types'

/**
 * A scheduled task as a chip in a calendar day cell — the "Scheduled" item of
 * the Feed, next to (and visually different from) notifications.
 *
 * Three deliberate differences from a notification chip:
 *
 *   - it shows the **time** (`19:00`), because a future event's whole content is
 *     "when", and "tomorrow" is already said by the cell it sits in;
 *   - it has a **dashed border**: dashed is the universal "not yet real". A solid
 *     chip is something that happened;
 *   - it can be **cancelled** (the × on hover) — a promise you can still take
 *     back, unlike a notification, which is a record.
 *
 * The chip is the Calendar's only Scheduler affordance; there is no Scheduler
 * page, and there will be no second list of the same tasks.
 */
export function ScheduledTaskChip({
  task,
  onCancel,
}: {
  task: ScheduledTask
  onCancel?: (id: string) => void
}) {
  const when = parseISO(task.runAt)
  const clock = Number.isNaN(when.getTime()) ? '' : format(when, 'HH:mm')
  const full = [format(when, 'MMM d, HH:mm'), task.payload.title, task.payload.body]
    .filter(Boolean)
    .join(' — ')

  return (
    <div
      data-scheduled-task-id={task.id}
      data-scheduled-task-status={task.status}
      title={`${full} (click × to cancel)`}
      className={cn(
        'group relative flex select-none items-center gap-1 rounded-[6px] border border-dashed px-1 py-[3px]',
        'border-violet-300 bg-violet-50/70'
      )}
    >
      <Clock className="size-2.5 shrink-0 text-violet-600" />
      <span className="shrink-0 text-[10px] font-semibold leading-4 tabular-nums text-violet-700">
        {clock}
      </span>
      <span className="min-w-0 flex-1 truncate text-[10px] font-medium leading-4 text-zinc-800">
        {task.payload.title}
      </span>
      {onCancel && (
        <button
          type="button"
          aria-label={`Cancel ${task.payload.title}`}
          onClick={(event) => {
            // The chip lives inside a grid cell; neither the click nor its
            // default should travel any further.
            event.stopPropagation()
            onCancel(task.id)
          }}
          className="absolute right-[3px] top-1/2 hidden size-3 -translate-y-1/2 items-center justify-center rounded-sm bg-violet-100 text-violet-700 hover:bg-violet-200 group-hover:flex"
        >
          <X className="size-2.5" />
        </button>
      )}
    </div>
  )
}
