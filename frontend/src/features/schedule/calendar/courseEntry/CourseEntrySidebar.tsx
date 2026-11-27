import { format } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { cn } from '@/lib/utils'
import { CalendarCourseRing } from '../CalendarCourseRing'
import { CalendarIconButton } from '../ScheduleCalendarParts'
import {
  ALL_COURSES,
  sumTallies,
  type CourseHighlight,
  type CourseSummary,
  type TaskTally,
} from '../scheduleCalendarShared'

// 侧栏里的一行：课程名（放不下折成两行），右边一个小圆环。
function CourseRow({
  label,
  onClick,
  onHoverChange,
  selected,
  tally,
}: {
  label: string
  onClick: () => void
  onHoverChange: (hovered: boolean) => void
  selected: boolean
  tally: TaskTally
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onPointerEnter={() => onHoverChange(true)}
      onPointerLeave={() => onHoverChange(false)}
      onClick={onClick}
      className={cn(
        'flex min-h-8 shrink-0 items-start gap-2 rounded-sm px-2.5 py-[7px] text-left text-[13.5px] leading-[18px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-zinc-300 focus-visible:ring-inset',
        // 选中只垫底色、不加粗：加粗会让折行的位置变来变去。
        selected
          ? 'bg-zinc-200/60 text-zinc-950'
          : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950'
      )}
    >
      <span className="line-clamp-2 min-w-0 flex-1">{label}</span>
      <CalendarCourseRing tally={tally} className="mt-0.5" />
    </button>
  )
}

// 月历左边的一栏，从上到下：年月和翻月、课程、回到今天。月历上方不再需要顶栏。
//
// 课程是一列单选：第一项是全部课程，下面一门课一行，右边的小圆环是这门课这个月做完了多少。
// 鼠标移到一门课上，日历里先只留这门课；点一下就停在这门课上。
export function CourseEntrySidebar({
  courses,
  highlight,
  month,
  onMonthStep,
  onToday,
}: {
  courses: CourseSummary[]
  highlight: CourseHighlight
  month: Date
  // 往前（-1）或往后（1）翻一个月。
  onMonthStep: (delta: number) => void
  onToday: () => void
}) {
  return (
    <div className="flex w-[176px] shrink-0 flex-col">
      <div className="flex shrink-0 items-start justify-between pt-1 pl-2.5">
        <h2 className="text-[18px] leading-6 tracking-tight">
          <span className="block font-semibold">{format(month, 'MMMM')}</span>{' '}
          <span className="block text-zinc-400 tabular-nums">
            {format(month, 'yyyy')}
          </span>
        </h2>
        <div className="flex items-center">
          <CalendarIconButton
            aria-label="Previous month"
            className="size-6 [&_svg]:size-4"
            onClick={() => onMonthStep(-1)}
          >
            <ChevronLeft />
          </CalendarIconButton>
          <CalendarIconButton
            aria-label="Next month"
            className="size-6 [&_svg]:size-4"
            onClick={() => onMonthStep(1)}
          >
            <ChevronRight />
          </CalendarIconButton>
        </div>
      </div>

      <div
        role="group"
        aria-label="Courses"
        className="scrollbar-hidden mt-3 flex min-h-0 flex-col gap-0.5 overflow-y-auto"
      >
        <CourseRow
          label="All courses"
          tally={sumTallies(courses)}
          selected={highlight.pinned === null}
          onHoverChange={(hovered) => highlight.setHovered(hovered ? ALL_COURSES : null)}
          onClick={() => highlight.setPinned(null)}
        />
        {courses.map((summary) => (
          <CourseRow
            key={summary.course.id}
            label={summary.course.title}
            tally={summary}
            selected={highlight.pinned === summary.course.id}
            onHoverChange={(hovered) =>
              highlight.setHovered(hovered ? summary.course.id : null)
            }
            onClick={() => highlight.setPinned(summary.course.id)}
          />
        ))}
      </div>

      <div className="mt-auto flex shrink-0 px-1 pt-2 pb-1">
        <button
          type="button"
          onClick={onToday}
          className="inline-flex h-7 w-full items-center justify-center rounded-full text-[13px] leading-none text-zinc-800 ring-1 ring-zinc-300 outline-none transition-colors ring-inset hover:bg-zinc-100 hover:text-zinc-950 focus-visible:ring-2 focus-visible:ring-zinc-400"
        >
          Today
        </button>
      </div>
    </div>
  )
}
