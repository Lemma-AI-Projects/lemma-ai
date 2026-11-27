import { ScheduleTimeline } from '../ScheduleTimeline'
import { type CalendarLayout } from './CalendarFrame'
import { type CalendarCourseEntry } from './courseEntry/calendarCourseEntry'
import { CourseEntryFocusWeekCalendar } from './courseEntry/CourseEntryFocusWeekCalendar'
import { CourseEntryPlannerTileCalendar } from './courseEntry/CourseEntryPlannerTileCalendar'
import { CourseEntryRingMonthCalendar } from './courseEntry/CourseEntryRingMonthCalendar'
import { CourseEntryTaskTileCalendar } from './courseEntry/CourseEntryTaskTileCalendar'
import { ScheduleFocusWeekCalendar } from './ScheduleFocusWeekCalendar'
import { ScheduleMonthBoardCalendar } from './ScheduleMonthBoardCalendar'
import { SchedulePlannerCalendar } from './SchedulePlannerCalendar'
import { SchedulePlannerTileCalendar } from './SchedulePlannerTileCalendar'
import { ScheduleRingCalendar } from './ScheduleRingCalendar'
import { ScheduleRingMonthCalendar } from './ScheduleRingMonthCalendar'
import { ScheduleRingOutlineCalendar } from './ScheduleRingOutlineCalendar'
import { ScheduleRingRailCalendar } from './ScheduleRingRailCalendar'
import { ScheduleRingTileCalendar } from './ScheduleRingTileCalendar'
import { ScheduleTaskMonthCalendar } from './ScheduleTaskMonthCalendar'
import { ScheduleTaskTileCalendar } from './ScheduleTaskTileCalendar'
import { ScheduleTrayCalendar } from './ScheduleTrayCalendar'
import { ScheduleWeekList } from './ScheduleWeekList'
import { type ScheduleCalendarProps } from './scheduleCalendarShared'

// 日程页右侧日历的候选方案。
//
// 第五轮（在第四轮上改：课程和「做完没有」是两枚筛选胶囊，筛了就只留符合的任务；
// 侧栏只放月份，不再有「一次跳一年」；固定排六周，片不会被拉成竖长条）。
// 外框由 `layout` 决定（见 CalendarFrame）：左边一栏月份，或者上面一条顶栏。
// - ring-month：日环月历 5；
// - task-tile：任务月历 4；
// - planner-tile：清单 3；
// - focus-week：聚焦周 3。
//
// 第四轮（沿两条路走：格子里只画图形的，和把任务名直接写在月历上的，外加两者的结合）。
// 四套共用同一种日期片：浅灰圆角片，没有分割线和边框，悬停、选中只是底色深一档；
// 今天是一个小圆点；片的高度是定死的，写不下的任务不写、标出还有几件。
// 课程放在哪由 `courseEntry` 决定（见 courseEntry/calendarCourseEntry.ts）：
// - entry-ring-month：日环月历 4。格子里一圈分段的进度环；
// - entry-task-tile：任务月历 3。任务名写在片里，一次看一个月；
// - entry-planner-tile：清单 2。和任务月历 3 同一种片，所有的周连成一长卷，上下滚动就是翻月；
// - entry-focus-week：聚焦周 2。整个月都是进度环，只有选中的那一周展开、列出任务名。
//
// 第三轮：
// - ring-tile：日环月历 3。「日环月历 2」加上浅灰的日期片和一排课程胶囊；
// - ring-outline：环 2。每一天都是一个环，没有任务的日子是一圈细线。
//
// 第二轮：
// - task-month：任务月历 2。任务名全部写在格子里，行高跟着最忙的那天走；
// - month-board：月历加周栏。上面一张紧凑的月历，下面把所选那一周的任务完整列出来；
// - ring-rail：日环月历 2。「日环月历」只调比例：数字加大、圆环变细。
//
// 第一轮：
// - current：现状。带边框的格子加节律条，顶栏只有右上角的翻月；
// - rings：环。每天一圈分段的进度环，顶栏是十二个月的轨道；
// - planner：清单。一直往下滚的周历表，任务名写在格子里；
// - tray：托盘。整张日历是一块浅灰托盘，每天一排小圆点；
// - week：周。一次看一周，七天排成七行，任务是写着名字的胶囊。
//
// 除了「现状」，都不再用长短表示「要花多久」：格子里只说有几件事、做完没有。
export type ScheduleCalendarVariant =
  | 'ring-month'
  | 'task-tile'
  | 'planner-tile'
  | 'focus-week'
  | 'entry-ring-month'
  | 'entry-task-tile'
  | 'entry-planner-tile'
  | 'entry-focus-week'
  | 'ring-tile'
  | 'ring-outline'
  | 'task-month'
  | 'month-board'
  | 'ring-rail'
  | 'current'
  | 'rings'
  | 'planner'
  | 'tray'
  | 'week'

// 日程页右侧的日历，具体长什么样由 `variant` 决定。
export function ScheduleCalendar({
  courseEntry,
  layout,
  variant,
  ...props
}: ScheduleCalendarProps & {
  // 只对第四轮的四套起作用。
  courseEntry?: CalendarCourseEntry
  // 只对第五轮的四套起作用。
  layout?: CalendarLayout
  variant: ScheduleCalendarVariant
}) {
  switch (variant) {
    case 'ring-month':
      return <ScheduleRingMonthCalendar {...props} layout={layout} />
    case 'task-tile':
      return <ScheduleTaskTileCalendar {...props} layout={layout} />
    case 'planner-tile':
      return <SchedulePlannerTileCalendar {...props} layout={layout} />
    case 'focus-week':
      return <ScheduleFocusWeekCalendar {...props} layout={layout} />
    case 'entry-ring-month':
      return <CourseEntryRingMonthCalendar {...props} courseEntry={courseEntry} />
    case 'entry-task-tile':
      return <CourseEntryTaskTileCalendar {...props} courseEntry={courseEntry} />
    case 'entry-planner-tile':
      return <CourseEntryPlannerTileCalendar {...props} courseEntry={courseEntry} />
    case 'entry-focus-week':
      return <CourseEntryFocusWeekCalendar {...props} courseEntry={courseEntry} />
    case 'ring-tile':
      return <ScheduleRingTileCalendar {...props} />
    case 'ring-outline':
      return <ScheduleRingOutlineCalendar {...props} />
    case 'task-month':
      return <ScheduleTaskMonthCalendar {...props} />
    case 'month-board':
      return <ScheduleMonthBoardCalendar {...props} />
    case 'ring-rail':
      return <ScheduleRingRailCalendar {...props} />
    case 'rings':
      return <ScheduleRingCalendar {...props} />
    case 'planner':
      return <SchedulePlannerCalendar {...props} />
    case 'tray':
      return <ScheduleTrayCalendar {...props} />
    case 'week':
      return <ScheduleWeekList {...props} />
    default:
      return (
        <ScheduleTimeline
          tasksByDay={props.tasksByDay}
          selectedDate={props.selectedDate}
          onSelectDate={props.onSelectDate}
        />
      )
  }
}
