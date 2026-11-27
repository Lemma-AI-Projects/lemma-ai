import { cn } from '@/lib/utils'
import { type ScheduleCourse } from '../getScheduleTasks'
import { type CourseHighlight } from './scheduleCalendarShared'

// 一排课程胶囊：鼠标移到一门课上，日历里只留这门课的任务；点一下固定住，再点一下松开。
export function CalendarCoursePills({
  className,
  courses,
  highlight,
}: {
  className?: string
  courses: ScheduleCourse[]
  highlight: CourseHighlight
}) {
  return (
    <div
      role="group"
      aria-label="Highlight a course"
      className={cn('flex min-w-0 items-center gap-1.5 overflow-hidden', className)}
    >
      {courses.map((course) => (
        <button
          key={course.id}
          type="button"
          aria-pressed={highlight.pinned === course.id}
          onPointerEnter={() => highlight.setHovered(course.id)}
          onPointerLeave={() => highlight.setHovered(null)}
          onClick={() => highlight.togglePinned(course.id)}
          className={cn(
            // 描边胶囊，没有填充；突出的那门课垫一层浅灰、边线加深一档。
            'inline-flex h-7 max-w-44 shrink-0 items-center rounded-full px-2.5 text-[13.5px] leading-5 ring-1 outline-none transition-colors ring-inset focus-visible:ring-2 focus-visible:ring-zinc-400',
            highlight.active === course.id
              ? 'bg-black/[0.06] text-zinc-950 ring-zinc-300'
              : highlight.pinned === course.id
                ? // 点住了、但鼠标正停在别的课上：边线保持深色，表示它还固定着。
                  'text-zinc-950 ring-zinc-400'
                : 'text-zinc-600 ring-zinc-200'
          )}
        >
          <span className="truncate">{course.title}</span>
        </button>
      ))}
    </div>
  )
}
