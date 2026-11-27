import { CircularProgress } from '@/components/CircularProgress'
import { cn } from '@/lib/utils'
import { tallyPercent, type TaskTally } from './scheduleCalendarShared'

// 课程名旁边的小圆环：这门课这个月做完了多少。这个月没有安排时不画，但位置留着。
export function CalendarCourseRing({
  className,
  size = 14,
  tally,
}: {
  className?: string
  size?: number
  tally: TaskTally
}) {
  if (tally.total === 0) {
    return (
      <span
        aria-hidden
        className={cn('shrink-0', className)}
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <CircularProgress
      value={tallyPercent(tally)}
      size={size}
      strokeWidth={size >= 14 ? 2.5 : 2.25}
      trackColor="#d4d4d8"
      className={className}
    />
  )
}
