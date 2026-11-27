import { cn } from '@/lib/utils'
import { CalendarCourseRing } from '../CalendarCourseRing'
import { type CourseHighlight, type CourseSummary } from '../scheduleCalendarShared'

// 月历下方的一行课程图例：每门课一个小圆环（这个月做完了多少）加名字，没有边框。
// 鼠标移到一门课上，日历里只留这门课的任务；点一下固定住（垫一层浅灰），再点一下松开。
// 课程名长了一行放不下时，这一行可以左右滑。
export function CourseEntryLegend({
  className,
  courses,
  highlight,
}: {
  className?: string
  courses: CourseSummary[]
  highlight: CourseHighlight
}) {
  return (
    <div
      role="group"
      aria-label="Highlight a course"
      className={cn(
        'scrollbar-hidden flex min-w-0 items-center gap-1 overflow-x-auto',
        className
      )}
    >
      {courses.map((summary) => {
        const { id, title } = summary.course
        const pinned = highlight.pinned === id

        return (
          <button
            key={id}
            type="button"
            aria-pressed={pinned}
            onPointerEnter={() => highlight.setHovered(id)}
            onPointerLeave={() => highlight.setHovered(null)}
            onClick={() => highlight.togglePinned(id)}
            className={cn(
              'inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full pr-2.5 pl-2 text-[13px] leading-4 whitespace-nowrap outline-none transition-colors focus-visible:ring-2 focus-visible:ring-zinc-300 focus-visible:ring-inset',
              pinned && 'bg-black/[0.05]',
              // 正在看的那门课是深色；看着别的课时，其余的再退一档。
              highlight.active === id || pinned
                ? 'text-zinc-950'
                : highlight.active !== null
                  ? 'text-zinc-400'
                  : 'text-zinc-600'
            )}
          >
            <CalendarCourseRing tally={summary} size={12} />
            {title}
          </button>
        )
      })}
    </div>
  )
}
