import { Check, ChevronDown } from 'lucide-react'

import { InputMenu, InputMenuItem } from '@/components/InputMenu'
import { cn } from '@/lib/utils'
import { CalendarCourseRing } from '../CalendarCourseRing'
import {
  ALL_COURSES,
  sumTallies,
  type CourseHighlight,
  type CourseSummary,
  type TaskTally,
} from '../scheduleCalendarShared'

// 菜单里的一项：小圆环、课程名，正停在这一项上时右边一个对勾。
function CourseMenuItem({
  label,
  onPreview,
  onSelect,
  selected,
  tally,
}: {
  label: string
  onPreview: () => void
  onSelect: () => void
  selected: boolean
  tally: TaskTally
}) {
  return (
    // 鼠标移到一项上、或者用方向键移到一项上，这一项都会得到焦点。
    <InputMenuItem onFocus={onPreview} onSelect={onSelect}>
      <CalendarCourseRing tally={tally} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {selected && <Check className="size-4 shrink-0" />}
    </InputMenuItem>
  )
}

// 选课程的下拉，跟在年月标题后面，只占一个词的地方：平时写着「All courses」，
// 选了一门课就写这门课的名字。
// 菜单打开时，鼠标移到哪门课上，后面的日历就先只留这门课，不用选了才知道是什么样。
export function CourseEntryMenu({
  courses,
  highlight,
}: {
  courses: CourseSummary[]
  highlight: CourseHighlight
}) {
  const pinned = courses.find((summary) => summary.course.id === highlight.pinned)

  return (
    <InputMenu
      side="bottom"
      sideOffset={6}
      contentClassName="max-w-80"
      onOpenChange={(open) => {
        // 菜单关了，预览也跟着结束。
        if (!open) {
          highlight.setHovered(null)
        }
      }}
      trigger={
        <button
          type="button"
          aria-label="Course"
          className={cn(
            'inline-flex h-7 min-w-0 items-center gap-1.5 rounded-full pr-1.5 pl-2.5 text-[13.5px] leading-5 outline-none transition-colors hover:bg-black/[0.05] hover:text-zinc-950 focus-visible:ring-2 focus-visible:ring-zinc-300 data-[state=open]:bg-black/[0.05] data-[state=open]:text-zinc-950',
            pinned ? 'text-zinc-950' : 'text-zinc-600'
          )}
        >
          {pinned && <CalendarCourseRing tally={pinned} />}
          <span className="truncate">{pinned ? pinned.course.title : 'All courses'}</span>
          <ChevronDown className="size-4 shrink-0 text-zinc-400" />
        </button>
      }
    >
      <CourseMenuItem
        label="All courses"
        tally={sumTallies(courses)}
        selected={highlight.pinned === null}
        onPreview={() => highlight.setHovered(ALL_COURSES)}
        onSelect={() => highlight.setPinned(null)}
      />
      {courses.map((summary) => (
        <CourseMenuItem
          key={summary.course.id}
          label={summary.course.title}
          tally={summary}
          selected={highlight.pinned === summary.course.id}
          onPreview={() => highlight.setHovered(summary.course.id)}
          onSelect={() => highlight.setPinned(summary.course.id)}
        />
      ))}
    </InputMenu>
  )
}
