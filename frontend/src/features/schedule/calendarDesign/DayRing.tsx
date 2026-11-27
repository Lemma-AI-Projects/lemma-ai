import { type ReactNode } from 'react'

import { cn } from '@/lib/utils'
import {
  calendarTaskProgress,
  calendarTaskStatus,
  type CalendarTask,
} from './calendarTasks'

const DONE_COLOR = '#10b981'
// 一圈最多分这么多段；再多就一段一段分不开了，合成一整圈。
const MAX_SEGMENTS = 8
// 还没到日子的任务画成细线。
const PLANNED_STROKE_WIDTH = 1.5

interface RingSegment {
  key: string
  // 0..1
  progress: number
  planned: boolean
}

function toSegments(tasks: readonly CalendarTask[], today: Date): RingSegment[] {
  if (tasks.length <= MAX_SEGMENTS) {
    return tasks.map((task) => ({
      key: task.id,
      progress: calendarTaskProgress(task),
      planned: calendarTaskStatus(task, today) === 'planned',
    }))
  }
  const total = tasks.reduce((sum, task) => sum + calendarTaskProgress(task), 0)
  return [
    {
      key: 'all',
      progress: total / tasks.length,
      planned: tasks.every((task) => calendarTaskStatus(task, today) === 'planned'),
    },
  ]
}

// 一天的圆环：这天有几件事，圆环就分成几段；每一段里绿色走了多少，就是那件事做了多少。
// - 粗的灰段：到今天为止该做、还没做完的部分；
// - 细的灰段：排在今天之后、还没到的事；
// - 这天没有任务就不画圆环，只剩中间的内容。
// 日期数字等内容作为 children 放在圆环中间。
export function DayRing({
  children,
  className,
  plannedColor = '#a1a1aa',
  size = 36,
  strokeWidth = 3,
  tasks,
  today,
  trackColor = '#d4d4d8',
}: {
  children?: ReactNode
  className?: string
  plannedColor?: string
  size?: number
  strokeWidth?: number
  tasks: readonly CalendarTask[]
  today: Date
  trackColor?: string
}) {
  const segments = toSegments(tasks, today)
  const center = size / 2
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const slot = segments.length > 0 ? circumference / segments.length : circumference
  // 线头是圆的，两头各多出半个线宽，所以空隙要先留出一个线宽，再加上真正看得见的 2.5px。
  const gap = segments.length > 1 ? strokeWidth + 2.5 : 0
  const length = slot - gap

  return (
    <span
      className={cn('relative inline-flex shrink-0 items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      {segments.length > 0 && (
        <svg
          aria-hidden
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          // 从正上方起笔，顺时针走。
          className="absolute inset-0 -rotate-90"
        >
          {segments.map((segment, index) => {
            const offset = -(index * slot + gap / 2)
            const filled = length * segment.progress

            return (
              <g key={segment.key} fill="none" strokeLinecap="round">
                {segment.progress < 1 && (
                  <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    stroke={segment.planned ? plannedColor : trackColor}
                    strokeWidth={segment.planned ? PLANNED_STROKE_WIDTH : strokeWidth}
                    strokeDasharray={`${length} ${circumference - length}`}
                    strokeDashoffset={offset}
                  />
                )}
                {segment.progress > 0 && (
                  <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    stroke={DONE_COLOR}
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${filled} ${circumference - filled}`}
                    strokeDashoffset={offset}
                  />
                )}
              </g>
            )
          })}
        </svg>
      )}
      {children}
    </span>
  )
}
