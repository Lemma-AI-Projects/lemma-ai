import { useState, type ComponentProps, type ReactElement } from 'react'
import { format } from 'date-fns'
import { Check } from 'lucide-react'
import { ToggleGroup as ToggleGroupPrimitive, Tooltip as TooltipPrimitive } from 'radix-ui'

import { CircularProgress } from '@/components/CircularProgress'
import { cn } from '@/lib/utils'
import { dayKey, type ScheduleTask } from '../getScheduleTasks'
import {
  CALENDAR_DONE_COLOR,
  CALENDAR_OVERDUE_COLOR,
  getTaskStatus,
} from './scheduleCalendarShared'

// 日历顶栏里的圆形图标按钮（翻页的箭头）。
export function CalendarIconButton({
  className,
  ...props
}: ComponentProps<'button'>) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        'inline-flex size-7 shrink-0 items-center justify-center rounded-full text-zinc-600 outline-none transition-colors hover:bg-black/[0.05] hover:text-zinc-950 focus-visible:ring-2 focus-visible:ring-zinc-300 [&_svg]:size-[18px]',
        className
      )}
    />
  )
}

// 日历顶栏里的文字胶囊（回到今天）。
export function CalendarTextButton({
  className,
  ...props
}: ComponentProps<'button'>) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        'inline-flex h-7 shrink-0 items-center rounded-full px-2.5 text-[14px] leading-5 text-zinc-700 outline-none transition-colors hover:bg-black/[0.05] hover:text-zinc-950 focus-visible:ring-2 focus-visible:ring-zinc-300',
        className
      )}
    />
  )
}

// 一条浅灰轨道加一块会滑动的白片：在几个并列的时间段之间切换（十二个月、一个月里的几周）。
// 和输入框右上角的模式切换是同一种做法。`emphasized` 的那一项是「现在」所在的那一段，字深一档。
export function CalendarTrack({
  'aria-label': ariaLabel,
  className,
  items,
  onValueChange,
  value,
}: {
  'aria-label': string
  className?: string
  items: { value: string; label: string; emphasized?: boolean }[]
  onValueChange: (value: string) => void
  value: string
}) {
  const index = Math.max(
    items.findIndex((item) => item.value === value),
    0
  )

  return (
    <ToggleGroupPrimitive.Root
      type="single"
      value={value}
      onValueChange={(next) => {
        // 再点一次已选中的那一项不取消选中。
        if (next !== '') {
          onValueChange(next)
        }
      }}
      aria-label={ariaLabel}
      className={cn(
        'relative grid h-8 rounded-full bg-zinc-200/60 p-[3px]',
        className
      )}
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-[3px] left-[3px] rounded-full bg-white transition-[transform,width] duration-[360ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
        style={{
          width: `calc((100% - 6px) / ${items.length})`,
          transform: `translateX(${index * 100}%)`,
        }}
      />
      {items.map((item) => (
        <ToggleGroupPrimitive.Item
          key={item.value}
          value={item.value}
          className={cn(
            'relative z-10 h-[26px] min-w-0 rounded-full text-[13px] leading-none whitespace-nowrap tabular-nums outline-none transition-colors focus-visible:ring-2 focus-visible:ring-zinc-300',
            item.value === value
              ? 'font-medium text-zinc-950'
              : item.emphasized
                ? 'text-zinc-950 hover:text-zinc-950'
                : 'text-zinc-500 hover:text-zinc-900'
          )}
        >
          {item.label}
        </ToggleGroupPrimitive.Item>
      ))}
    </ToggleGroupPrimitive.Root>
  )
}

// 星期那一行（Mon … Sun）。`align` 跟着格子里日期数字的位置走。
export function CalendarWeekdayRow({
  align = 'center',
  className,
  days,
}: {
  align?: 'center' | 'start'
  className?: string
  // 任意一周的七天，只用来取星期的名字。
  days: Date[]
}) {
  return (
    <div role="row" className={cn('grid shrink-0 grid-cols-7', className)}>
      {days.map((day) => (
        <div
          key={day.getDay()}
          role="columnheader"
          className={cn(
            'flex items-center text-xs leading-4 text-zinc-500',
            align === 'center' ? 'justify-center' : 'justify-start'
          )}
        >
          {format(day, 'EEE')}
        </div>
      ))}
    </div>
  )
}

// 格子里的日期数字。
// 今天默认是深色圆底白字（`todayStyle="disc"`）；传 `plain` 就不垫圆底，
// 由调用的地方自己标今天（例如数字下面一个小圆点）。
export function CalendarDayNumber({
  className,
  day,
  isToday,
  label,
  todayStyle = 'disc',
}: {
  className?: string
  day: Date
  isToday: boolean
  // 默认只写几号；连续滚动的日历在每月一号写成「Dec 1」。
  label?: string
  todayStyle?: 'disc' | 'plain'
}) {
  const text = label ?? format(day, 'd')
  const disc = isToday && todayStyle === 'disc'

  return (
    <time
      dateTime={dayKey(day)}
      aria-current={isToday ? 'date' : undefined}
      className={cn(
        'inline-flex h-[22px] min-w-[22px] shrink-0 items-center justify-center rounded-full text-[13px] leading-none font-medium whitespace-nowrap tabular-nums',
        disc && 'bg-zinc-900 text-white',
        disc && text.length > 2 && 'px-2',
        className
      )}
    >
      {text}
    </time>
  )
}

// 一个任务的小状态图标：做完是绿色实心对勾，没做完是一圈进度环；
// 过了日子还没做完的，环的底色是浅红。
// `quiet`：做完的只画一个细对勾、不垫实心圆。任务一多（整张月历），一排排实心绿圆太抢眼。
export function TaskStatusGlyph({
  className,
  quiet = false,
  size = 12,
  task,
}: {
  className?: string
  quiet?: boolean
  size?: number
  task: ScheduleTask
}) {
  if (getTaskStatus(task) === 'done') {
    if (quiet) {
      return (
        <Check
          aria-hidden
          strokeWidth={3}
          className={cn('shrink-0 text-emerald-500', className)}
          style={{ width: size, height: size }}
        />
      )
    }
    return (
      <svg
        aria-hidden
        width={size}
        height={size}
        viewBox="0 0 12 12"
        className={cn('shrink-0', className)}
      >
        <circle cx="6" cy="6" r="6" fill={CALENDAR_DONE_COLOR} />
        <path
          d="M3.5 6.2 5.2 7.9 8.5 4.4"
          fill="none"
          stroke="#fff"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  return (
    <CircularProgress
      value={task.progressRatio * 100}
      size={size}
      strokeWidth={size * 0.19}
      trackColor={task.overdue ? CALENDAR_OVERDUE_COLOR : '#d4d4d8'}
      className={className}
    />
  )
}

// 鼠标在某一天上停一下，浮出这一天的任务名。给格子里只画图形、不写任务名的方案用：
// 不用点进去、不改变选中的日期，就能看一眼这天有什么。
// 没有任务的日子、或者 `disabled` 时不浮。
// 不管浮不浮，包在外面的结构都一样：格子不会因为「有没有任务」变了而被重新创建，
// 它身上的过渡动画（展开、收起、换底色）才接得上。
// 用它的日历外面要包一层 CalendarDayPeekProvider。
export function CalendarDayPeek({
  children,
  disabled = false,
  tasks,
}: {
  children: ReactElement
  disabled?: boolean
  tasks: readonly ScheduleTask[]
}) {
  const [open, setOpen] = useState(false)
  const inactive = disabled || tasks.length === 0

  return (
    <TooltipPrimitive.Root open={open && !inactive} onOpenChange={setOpen}>
      <TooltipPrimitive.Trigger
        asChild
        // 不该浮的时候，连「准备浮出来」这一步也拦掉：
        // 不然它一准备，格子里面别的浮层（任务的全名和课程）就会被它关掉。
        onPointerMove={inactive ? (event) => event.preventDefault() : undefined}
      >
        {children}
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side="top"
          sideOffset={6}
          collisionPadding={8}
          className="z-50 w-fit max-w-60 min-w-40 origin-(--radix-tooltip-content-transform-origin) animate-in rounded-lg border bg-popover p-1 text-popover-foreground fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
        >
          <ul>
            {tasks.map((task) => (
              <li
                key={task.id}
                className="flex items-center gap-2.5 px-2 py-1.5 text-[14px] leading-5 text-zinc-950"
              >
                <TaskStatusGlyph task={task} size={14} />
                <span className="min-w-0 flex-1 truncate">{task.title}</span>
              </li>
            ))}
          </ul>
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}

// 鼠标在一个任务上停一下，浮出它的全名和它属于哪门课。
// 给「鼠标移到任务上就突出这门课」的做法用：日历上不另外放课程，课程的名字在这里看。
export function CalendarTaskHint({
  children,
  task,
}: {
  children: ReactElement
  task: ScheduleTask
}) {
  return (
    <TooltipPrimitive.Root delayDuration={250}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side="top"
          align="start"
          sideOffset={6}
          collisionPadding={8}
          className="z-50 max-w-64 origin-(--radix-tooltip-content-transform-origin) animate-in rounded-lg border bg-popover px-3 py-2 text-[13.5px] leading-5 text-popover-foreground fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
        >
          <p className="font-medium text-zinc-950">{task.title}</p>
          <p className="text-zinc-600">{task.course.title}</p>
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}

// 停一小会儿才浮出来；已经浮出一个之后，移到旁边的日子马上换。
export function CalendarDayPeekProvider(
  props: ComponentProps<typeof TooltipPrimitive.Provider>
) {
  return <TooltipPrimitive.Provider delayDuration={350} skipDelayDuration={200} {...props} />
}
