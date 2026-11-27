import { type ComponentProps } from 'react'

import { CircularProgress } from '@/components/CircularProgress'
import { cn } from '@/lib/utils'
import { type CalendarTaskStatus } from './calendarTasks'

// 几种日历方案共用的小零件。

const TRACK_COLOR = '#e4e4e7'
const PLANNED_COLOR = '#a1a1aa'

// 一项任务前面的小圆环，和「今日」入口里的是同一种：绿色走了多少就是做了多少。
// 还没到日子的任务是一圈虚线（和课表里「还没开始」的虚线圆环同一种节奏）。
export function CalendarTaskMark({
  className,
  progress,
  size = 12,
  status,
  trackColor = TRACK_COLOR,
}: {
  className?: string
  // 0..1
  progress: number
  size?: number
  status: CalendarTaskStatus
  trackColor?: string
}) {
  const strokeWidth = size >= 14 ? 2.5 : 2

  if (status === 'planned') {
    const radius = (size - strokeWidth) / 2
    const circumference = 2 * Math.PI * radius
    // 一段虚线加一段空隙约 3.14px，取整数段，接缝处不会多出半段。
    const dashCount = Math.max(6, Math.round(circumference / 3.14))
    const period = circumference / dashCount

    return (
      <svg
        aria-hidden
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className={cn('shrink-0', className)}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={PLANNED_COLOR}
          strokeWidth={strokeWidth}
          strokeDasharray={`${period * 0.45} ${period * 0.55}`}
        />
      </svg>
    )
  }

  return (
    <CircularProgress
      value={progress * 100}
      size={size}
      strokeWidth={strokeWidth}
      trackColor={trackColor}
      className={className}
    />
  )
}

// 「今天」按钮：一枚描边胶囊，点一下回到今天。
export function CalendarTodayButton({ className, ...props }: ComponentProps<'button'>) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        'inline-flex h-7 shrink-0 items-center rounded-full px-3 text-[13px] leading-none text-zinc-800 ring-1 ring-zinc-300 outline-none transition-colors ring-inset hover:bg-zinc-100 hover:text-zinc-950 focus-visible:ring-2 focus-visible:ring-zinc-400',
        className
      )}
    >
      今天
    </button>
  )
}

// 圆形的图标按钮（翻月、翻年）。
export function CalendarIconButton({ className, ...props }: ComponentProps<'button'>) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        'inline-flex size-6 shrink-0 items-center justify-center rounded-full text-zinc-500 outline-none transition-colors hover:bg-zinc-200/60 hover:text-zinc-950 focus-visible:ring-2 focus-visible:ring-zinc-400 [&_svg]:size-4',
        className
      )}
    />
  )
}
