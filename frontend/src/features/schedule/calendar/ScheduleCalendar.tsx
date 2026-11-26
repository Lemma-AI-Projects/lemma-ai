import { AgendaCalendar } from './AgendaCalendar'
import { type ScheduleCalendarViewProps } from './calendarTasks'
import { FocusWeekCalendar } from './FocusWeekCalendar'
import { RingMonthCalendar, type RingMonthMark } from './RingMonthCalendar'
import { TitleMonthCalendar } from './TitleMonthCalendar'

// 日程页右侧日历的候选方案，每一种都是一整套设计：
// - rings：日环月历。左边一栏月份、没有顶栏；格子里只有一圈圆环，看节奏；
// - titles：任务月历。格子里直接写任务名；顶栏是月份、课程和翻月；
// - focus-week：聚焦周。整月收成一行行圆环，只有一周展开列出任务名；顶栏是一条月份；
// - agenda：日程流。不是格子，是一条连着滚的日程，一天一行。
export type ScheduleCalendarVariant = 'rings' | 'titles' | 'focus-week' | 'agenda'

// 日程页右侧的日历，具体长什么样由 `variant` 决定。
// `ringMark` 只对「日环月历」生效：格子里画圆环还是圆点。
export function ScheduleCalendar({
  ringMark,
  variant,
  ...props
}: ScheduleCalendarViewProps & {
  ringMark?: RingMonthMark
  variant: ScheduleCalendarVariant
}) {
  if (variant === 'titles') {
    return <TitleMonthCalendar {...props} />
  }
  if (variant === 'focus-week') {
    return <FocusWeekCalendar {...props} />
  }
  if (variant === 'agenda') {
    return <AgendaCalendar {...props} />
  }
  return <RingMonthCalendar mark={ringMark} {...props} />
}
