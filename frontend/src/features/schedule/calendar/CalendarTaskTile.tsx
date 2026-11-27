import { format } from 'date-fns'

import { cn } from '@/lib/utils'
import { type ScheduleTask } from '../getScheduleTasks'
import { calendarTileClassName } from './calendarTileStyles'
import { CalendarDayNumber, TaskStatusGlyph } from './ScheduleCalendarParts'
import { describeDay, getTaskStatus } from './scheduleCalendarShared'

// 片里的一个任务：一行文字，前面一个小状态图标。
// 放不下的任务名以省略号结尾，鼠标停一下用浏览器自带的提示看全名。
function TaskRow({ task }: { task: ScheduleTask }) {
  return (
    <li className="flex h-[18px] min-w-0 items-center gap-1.5">
      <TaskStatusGlyph task={task} size={10} quiet />
      <span
        title={task.title}
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
}

// 把任务名写在里面的日期片：左上角是日期数字，下面是这一天的任务，一个一行。
// 第五轮的「任务月历 4」和「清单 3」共用。
//
// - `tasks` 是已经按顶栏的筛选留下来的任务。
// - 片的高度是定死的，最多写 `maxRows` 行；写不下的不写，右上角标出还有几件（+N）。
// - 今天：数字旁边一个小圆点；
// - `inMonth` 为 false（不是正在看的那个月）：没有底色，内容淡一档。
export function CalendarTaskTile({
  day,
  inMonth,
  isToday,
  maxRows,
  onSelect,
  selected,
  tasks,
}: {
  day: Date
  inMonth: boolean
  isToday: boolean
  maxRows: number
  onSelect: () => void
  selected: boolean
  tasks: readonly ScheduleTask[]
}) {
  const visible = tasks.slice(0, maxRows)
  const hiddenCount = tasks.length - visible.length

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
              : tasks.length > 0
                ? 'text-zinc-950'
                : 'font-normal text-zinc-400'
          )}
        />
        {/* 今天：数字旁边一个小圆点。 */}
        {isToday && <span aria-hidden className="size-1 rounded-full bg-zinc-950" />}
        {/* 没写出来的还有几件。 */}
        {hiddenCount > 0 && (
          <span
            aria-hidden
            className="ml-auto text-[12px] leading-none text-zinc-500 tabular-nums"
          >
            +{hiddenCount}
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
            <TaskRow key={task.id} task={task} />
          ))}
        </ul>
      )}
    </button>
  )
}
