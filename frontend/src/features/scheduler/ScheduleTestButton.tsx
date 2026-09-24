import { useState } from 'react'
import { addDays, format, setHours, setMinutes, setSeconds } from 'date-fns'
import { AlarmClockPlus, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useScheduleTask } from './schedulerApi'

/**
 * The dev-only entry point: create a real scheduled task without a Global Agent.
 *
 * The whole point is that it is NOT a mock. It calls the same
 * `POST /api/v1/scheduled-tasks` a future agent will call, stores a real row, and
 * the API's own clock fires it — so "wait thirty seconds and watch it happen" is
 * the acceptance test, and it exercises persistence, the claim and the sender.
 *
 * The delay list is deliberately tiny and honest: V0 schedules one-shot tasks,
 * and "tomorrow at 19:00" is the smallest thing that proves the clock survives a
 * page close (`runAt` is stored, not a timer).
 */

const DELAYS = [
  { value: '30', label: '30 seconds from now' },
  { value: '120', label: '2 minutes from now' },
  { value: '1800', label: '30 minutes from now' },
  { value: 'tomorrow', label: 'Tomorrow at 19:00' },
] as const

type Delay = (typeof DELAYS)[number]['value']

/** Tomorrow 19:00 in the learner's own clock, serialised with an offset — the
 *  API refuses a timestamp that does not say which clock it means. */
function tomorrowAt(hour: number): Date {
  return setSeconds(setMinutes(setHours(addDays(new Date(), 1), hour), 0), 0)
}

function runAtFor(delay: Delay): Date {
  return delay === 'tomorrow'
    ? tomorrowAt(19)
    : new Date(Date.now() + Number(delay) * 1000)
}

export function ScheduleTestButton() {
  const [delay, setDelay] = useState<Delay>('30')
  const [scheduledFor, setScheduledFor] = useState<Date | null>(null)
  const schedule = useScheduleTask()

  async function handleClick() {
    const runAt = runAtFor(delay)
    setScheduledFor(null)
    try {
      await schedule.mutateAsync({
        runAt: runAt.toISOString(),
        type: 'notification',
        payload: {
          title: 'Review reminder',
          body: 'Time to review the Eigenvector proof.',
          metadata: { source: 'manual_test' },
        },
      })
      setScheduledFor(runAt)
    } catch {
      // The error line below is the feedback; a failed schedule must not look
      // like a successful one.
      setScheduledFor(null)
    }
  }

  return (
    <div>
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={handleClick}
        disabled={schedule.isPending}
      >
        {schedule.isPending ? <Loader2 className="animate-spin" /> : <AlarmClockPlus />}
        Schedule test notification
      </Button>
      <div className="mt-1.5 flex items-center gap-1.5">
        <span className="shrink-0 text-[10px] font-medium text-zinc-500">
          Run at:
        </span>
        <Select
          value={delay}
          onValueChange={(value) => setDelay(value as Delay)}
        >
          <SelectTrigger size="sm" className="w-full text-[10px] shadow-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DELAYS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {scheduledFor && (
        <p className="mt-1.5 text-[10px] text-zinc-500">
          Scheduled for {format(scheduledFor, 'MMM d, HH:mm:ss')} — it appears on
          the calendar now and fires on its own.
        </p>
      )}
      {schedule.isError && (
        <p className="mt-1.5 text-[10px] text-red-600">
          Could not schedule — nothing was created.
        </p>
      )}
    </div>
  )
}
