import { Fragment } from 'react'

import { cn } from '@/lib/utils'
import type { ScheduleTask } from '../getScheduleTasks'
import {
  CALENDAR_DONE_COLOR,
  CALENDAR_OVERDUE_COLOR,
  CALENDAR_TRACK_COLOR,
} from './scheduleCalendarShared'

// 一天的任务画成一圈分段的环：一个任务一段，从正上方起顺时针排。
// 每段按这个任务的完成度填绿色，没做的部分是浅灰；过了日子还没做完的，没做的部分是浅红。
// 有几件事、做到哪了，看环就知道，不需要文字；没有任务的日子不画环。
export function DayRing({
  className,
  size,
  strokeWidth = 3.5,
  tasks,
  trackColor = CALENDAR_TRACK_COLOR,
}: {
  className?: string
  size: number
  strokeWidth?: number
  tasks: readonly ScheduleTask[]
  // 没做的部分的颜色；环下面垫了底色时要传深一档的。
  trackColor?: string
}) {
  if (tasks.length === 0) {
    return null
  }

  const center = size / 2
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const slot = circumference / tasks.length
  // 圆头会往两边各多画半个线宽，段与段之间把这部分让出来，再留一点缝。
  const gap = tasks.length > 1 ? strokeWidth + 2.5 : 0
  const arc = slot - gap

  return (
    <svg
      aria-hidden
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn('shrink-0', className)}
    >
      <g
        fill="none"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        transform={`rotate(-90 ${center} ${center})`}
      >
        {tasks.map((task, index) => {
          const start = index * slot + gap / 2
          const filled = arc * Math.min(Math.max(task.progressRatio, 0), 1)

          return (
            <Fragment key={task.id}>
              <circle
                cx={center}
                cy={center}
                r={radius}
                stroke={task.overdue ? CALENDAR_OVERDUE_COLOR : trackColor}
                strokeDasharray={`${arc} ${circumference - arc}`}
                strokeDashoffset={-start}
              />
              {filled > 0 && (
                <circle
                  cx={center}
                  cy={center}
                  r={radius}
                  stroke={CALENDAR_DONE_COLOR}
                  strokeDasharray={`${filled} ${circumference - filled}`}
                  strokeDashoffset={-start}
                />
              )}
            </Fragment>
          )
        })}
      </g>
    </svg>
  )
}
