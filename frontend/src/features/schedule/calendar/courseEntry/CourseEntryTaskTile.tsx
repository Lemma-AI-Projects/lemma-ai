import { format } from 'date-fns'

import { cn } from '@/lib/utils'
import { type ScheduleTask } from '../../getScheduleTasks'
import { calendarTileClassName } from '../calendarTileStyles'
import {
  CalendarDayNumber,
  CalendarTaskHint,
  TaskStatusGlyph,
} from '../ScheduleCalendarParts'
import {
  describeDay,
  getTaskStatus,
  isTaskDimmed,
  type CourseHighlight,
} from '../scheduleCalendarShared'

// 片里的一个任务：一行文字，前面一个小状态图标。放不下的任务名以省略号结尾。
function TaskRow({
  highlight,
  task,
  taskHover,
}: {
  highlight: CourseHighlight
  task: ScheduleTask
  taskHover: boolean
}) {
  const row = (
    <li
      // 鼠标移到任务上，就突出它所属的那门课。
      onPointerEnter={
        taskHover ? () => highlight.setHoveredSoon(task.course.id) : undefined
      }
      onPointerLeave={taskHover ? () => highlight.setHoveredSoon(null) : undefined}
      className={cn(
        'flex h-[18px] min-w-0 items-center gap-1.5 transition-opacity duration-150',
        isTaskDimmed(task, highlight) && 'opacity-25'
      )}
    >
      <TaskStatusGlyph task={task} size={10} quiet />
      <span
        // 没有浮层时，鼠标停一下用浏览器自带的提示看全名。
        title={taskHover ? undefined : task.title}
        className={cn(
          'min-w-0 truncate text-[12.5px] leading-none',
          // 做完的退后一档；还深着的就是没做完的。
          getTaskStatus(task) === 'done' ? 'text-zinc-500' : 'text-zinc-950'
        )}
      >
        {task.title}
      </span>
    </li>
  )

  return taskHover ? <CalendarTaskHint task={task}>{row}</CalendarTaskHint> : row
}

// 把任务名写在里面的日期片：左上角是日期数字，下面是这一天的任务，一个一行。
// 第四轮的「任务月历 3」和「清单 2」共用。
//
// - 片的高度是定死的，最多写 `maxRows` 行；写不下的不写，右上角标出还有几件（+N）。
// - 今天：数字旁边一个小圆点；
// - `inMonth` 为 false（不是正在看的那个月）：没有底色，内容淡一档；
// - 突出某门课时，其它课的任务淡下去；这一天没有这门课的任务，日期数字也退后。
// - `taskHover`：鼠标移到一个任务上，就突出它所属的那门课，并浮出任务的全名和课程名。
//   用它的日历外面要包一层 CalendarDayPeekProvider。
export function CourseEntryTaskTile({
  day,
  highlight,
  inMonth,
  isToday,
  maxRows,
  onSelect,
  selected,
  taskHover = false,
  tasks,
}: {
  day: Date
  highlight: CourseHighlight
  inMonth: boolean
  isToday: boolean
  maxRows: number
  onSelect: () => void
  selected: boolean
  taskHover?: boolean
  tasks: readonly ScheduleTask[]
}) {
  const visible = tasks.slice(0, maxRows)
  const hidden = tasks.slice(maxRows)
  // 这一天有没有要突出的那门课的任务（没有突出任何课时，有任务就算）。
  const relevant = tasks.some((task) => !isTaskDimmed(task, highlight))

  return (
    <button
      type="button"
      aria-label={describeDay(day, tasks.length)}
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        'flex min-w-0 flex-1 flex-col gap-0.5 overflow-hidden px-2 pt-[5px] pb-1.5 text-left',
        calendarTileClassName({ inMonth, selected })
      )}
    >
      <span
        className={cn(
          'flex h-5 shrink-0 items-center gap-1.5 px-0.5 transition-opacity duration-200',
          !inMonth && 'opacity-45'
        )}
      >
        <CalendarDayNumber
          day={day}
          isToday={isToday}
          todayStyle="plain"
          label={day.getDate() === 1 ? format(day, 'MMM d') : undefined}
          className={cn(
            'h-5 min-w-0 justify-start text-[14px] transition-colors',
            isToday
              ? 'font-semibold text-zinc-950'
              : relevant
                ? 'text-zinc-950'
                : 'font-normal text-zinc-400'
          )}
        />
        {/* 今天：数字旁边一个小圆点。 */}
        {isToday && <span aria-hidden className="size-1 rounded-full bg-zinc-950" />}
        {/* 没写出来的还有几件。里面没有要突出的那门课时，跟着淡下去。 */}
        {hidden.length > 0 && (
          <span
            aria-hidden
            className={cn(
              'ml-auto text-[12px] leading-none text-zinc-500 tabular-nums transition-opacity duration-150',
              hidden.every((task) => isTaskDimmed(task, highlight)) && 'opacity-25'
            )}
          >
            +{hidden.length}
          </span>
        )}
      </span>
      {visible.length > 0 && (
        <ul
          className={cn(
            'flex min-w-0 flex-col px-0.5 transition-opacity duration-200',
            !inMonth && 'opacity-45'
          )}
        >
          {visible.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              highlight={highlight}
              taskHover={taskHover}
            />
          ))}
        </ul>
      )}
    </button>
  )
}
