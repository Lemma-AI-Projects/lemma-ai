import { useMemo, useState } from 'react'
import { isSameDay, startOfDay } from 'date-fns'

import { dayKey, getScheduleTasks, groupTasksByDay } from '@/features/schedule/getScheduleTasks'
import { ScheduleDayPanel } from '@/features/schedule/ScheduleDayPanel'
import { ScheduleTimeline } from '@/features/schedule/ScheduleTimeline'

export function SchedulePage() {
  const [today] = useState(() => startOfDay(new Date()))
  const [selectedDate, setSelectedDate] = useState(today)
  const tasksByDay = useMemo(() => groupTasksByDay(getScheduleTasks(today)), [today])

  return (
    <div className="flex h-full gap-2">
      <ScheduleDayPanel
        date={selectedDate}
        isToday={isSameDay(selectedDate, today)}
        tasks={tasksByDay.get(dayKey(selectedDate)) ?? []}
        onBackToToday={() => setSelectedDate(today)}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-zinc-200/80 bg-zinc-50">
        <ScheduleTimeline
          tasksByDay={tasksByDay}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />
      </div>
    </div>
  )
}
