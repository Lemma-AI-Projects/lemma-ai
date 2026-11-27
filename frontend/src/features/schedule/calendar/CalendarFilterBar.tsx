import { CalendarCourseRing } from './CalendarCourseRing'
import { CalendarFilterMenu, type CalendarFilterOption } from './CalendarFilterMenu'
import { type CalendarFilters, type TaskStatusFilter } from './calendarFilters'
import { sumTallies, type CourseSummary } from './scheduleCalendarShared'

const STATUS_OPTIONS: CalendarFilterOption<TaskStatusFilter>[] = [
  { value: 'all', label: 'All tasks' },
  { value: 'todo', label: 'To do' },
  { value: 'done', label: 'Done' },
]

// 顶栏里的两枚筛选胶囊：哪门课、做完没有。
// 课程菜单里每门课前面的小圆环，是这门课这个月做完了多少。
export function CalendarFilterBar({
  courses,
  filters,
}: {
  courses: CourseSummary[]
  filters: CalendarFilters
}) {
  const courseOptions: CalendarFilterOption<string | null>[] = [
    {
      value: null,
      label: 'All courses',
      leading: <CalendarCourseRing tally={sumTallies(courses)} />,
    },
    ...courses.map((summary) => ({
      value: summary.course.id,
      label: summary.course.title,
      leading: <CalendarCourseRing tally={summary} />,
    })),
  ]

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <CalendarFilterMenu
        label="Course"
        menuClassName="max-w-80"
        options={courseOptions}
        value={filters.selectedCourse}
        onPreview={filters.previewCourse}
        onSelect={filters.selectCourse}
      />
      <CalendarFilterMenu
        label="Status"
        menuClassName="min-w-36"
        options={STATUS_OPTIONS}
        value={filters.selectedStatus}
        onPreview={filters.previewStatus}
        onSelect={filters.selectStatus}
      />
    </div>
  )
}
