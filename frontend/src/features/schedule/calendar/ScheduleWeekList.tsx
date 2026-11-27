import { addDays, format, isSameDay, isSameMonth, startOfMonth } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { cn } from '@/lib/utils'
import { dayKey } from '../getScheduleTasks'
import {
  CalendarDayNumber,
  CalendarIconButton,
  CalendarTrack,
  TaskStatusGlyph,
} from './ScheduleCalendarParts'
import {
  describeDay,
  getTaskStatus,
  getWeeks,
  startOfCalendarWeek,
  useFollowSelectedDate,
  type ScheduleCalendarProps,
} from './scheduleCalendarShared'

// 轨道上每一周占的宽度。
const TRACK_ITEM_WIDTH = 76

// 一周算在它周四所在的那个月里。
function monthOfWeek(weekStart: Date): Date {
  return startOfMonth(addDays(weekStart, 3))
}

// 一个月里的那几周（四周或五周）的周一。
function getWeekStartsOfMonth(month: Date): Date[] {
  return getWeeks(startOfCalendarWeek(month), 6)
    .map((week) => week[0])
    .filter((weekStart) => isSameMonth(monthOfWeek(weekStart), month))
}

// 日历方案「周」：不画月历格子，一次只看一周，七天从上到下排成七行，
// 每天的任务是一排写着任务名的胶囊。换来的是任务名能完整读出来，代价是看不到整个月。
//
// - 顶栏：左边是年月，右边一条轨道列出这个月的几周，白片停在当前看的那一周上；
//   轨道两端的箭头一次翻一周，翻出这个月时标题和轨道跟着换。
// - 每一行：左边是星期和日期，右边是这天的任务。行与行之间没有线。
// - 状态：悬停和选中都只是给这一行垫一块圆角底色；今天的数字是深色圆底。
export function ScheduleWeekList({
  onSelectDate,
  selectedDate,
  tasksByDay,
  today,
}: ScheduleCalendarProps) {
  const [weekStart, setWeekStart] = useFollowSelectedDate(
    selectedDate,
    startOfCalendarWeek
  )
  const month = monthOfWeek(weekStart)
  const weekStarts = getWeekStartsOfMonth(month)
  const days = getWeeks(weekStart, 1)[0]
  const currentWeekKey = dayKey(startOfCalendarWeek(today))

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-[60px] shrink-0 items-center justify-between gap-4 pr-3 pl-5">
        <h2 className="truncate text-[20px] leading-none font-semibold tracking-tight">
          {format(month, 'MMMM yyyy')}
        </h2>
        <div className="flex shrink-0 items-center gap-1">
          <CalendarIconButton
            aria-label="Previous week"
            onClick={() => setWeekStart((current) => addDays(current, -7))}
          >
            <ChevronLeft />
          </CalendarIconButton>
          {/* 每一周的宽度固定：这个月有四周还是五周，轨道就是四格还是五格宽。 */}
          <div
            className="transition-[width] duration-[360ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
            style={{ width: weekStarts.length * TRACK_ITEM_WIDTH + 6 }}
          >
            <CalendarTrack
              aria-label="Week"
              className="w-full"
              value={dayKey(weekStart)}
              onValueChange={(next) => {
                const target = weekStarts.find((start) => dayKey(start) === next)
                if (target) {
                  setWeekStart(target)
                }
              }}
              items={weekStarts.map((start) => ({
                value: dayKey(start),
                label: `${format(start, 'd')} – ${format(addDays(start, 6), 'd')}`,
                emphasized: dayKey(start) === currentWeekKey,
              }))}
            />
          </div>
          <CalendarIconButton
            aria-label="Next week"
            onClick={() => setWeekStart((current) => addDays(current, 7))}
          >
            <ChevronRight />
          </CalendarIconButton>
        </div>
      </div>

      <div className="scrollbar-hidden flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-2">
        {days.map((day) => {
          const tasks = tasksByDay.get(dayKey(day)) ?? []
          const selected = isSameDay(day, selectedDate)

          return (
            <button
              key={dayKey(day)}
              type="button"
              aria-label={describeDay(day, tasks.length)}
              aria-pressed={selected}
              onClick={() => onSelectDate(day)}
              className={cn(
                // 每行先按自己的内容定高（任务多、折了行就高一些），剩下的高度七行平分。
                'flex shrink-0 grow items-start gap-2 rounded-2xl px-3 py-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-zinc-300',
                selected ? 'bg-black/[0.06]' : 'hover:bg-black/[0.035]'
              )}
            >
              <span className="flex h-7 w-[76px] shrink-0 items-center gap-2 text-[14px] leading-5">
                <span className="w-8 text-zinc-500">{format(day, 'EEE')}</span>
                <CalendarDayNumber
                  day={day}
                  isToday={isSameDay(day, today)}
                  className="text-[14px]"
                />
              </span>
              <span className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                {tasks.map((task) => (
                  <span
                    key={task.id}
                    className="inline-flex h-7 max-w-full items-center gap-1.5 rounded-full border border-zinc-200 bg-white pr-2.5 pl-2 text-[13px] leading-5"
                  >
                    <TaskStatusGlyph task={task} size={12} />
                    <span
                      className={cn(
                        'min-w-0 truncate',
                        getTaskStatus(task) === 'done' ? 'text-zinc-400' : 'text-zinc-900'
                      )}
                    >
                      {task.title}
                    </span>
                  </span>
                ))}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
