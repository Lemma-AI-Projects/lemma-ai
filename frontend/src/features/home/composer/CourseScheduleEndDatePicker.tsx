import { useRef, useState, type ComponentProps } from 'react'
import {
  addDays,
  format,
  isSameMonth,
  max,
  parseISO,
  startOfMonth,
  subMonths,
} from 'date-fns'
import { CalendarDays } from 'lucide-react'
import { zhCN } from 'react-day-picker/locale'

import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

// 月历弹层的宽度：七格 × 28px，加上月历内边距、弹层内边距和边框。
const CALENDAR_WIDTH = 218
// 判断菜单哪一侧放得下月历时，给视口边缘留的余量。
const VIEWPORT_MARGIN = 8

// 胶囊所在的排期菜单：月历贴着它弹出，并挂在它的定位层里。
interface HostMenu {
  // 菜单本体，月历对齐它的边（Radix 的锚点要的是 ref 的形状）。
  anchor: { current: HTMLElement }
  // 菜单的定位层（Radix 给弹层套的那层），页面滚动时移动的就是它。
  layer: HTMLElement
  side: 'left' | 'right'
}

function findHostMenu(trigger: HTMLElement | null): HostMenu | null {
  const menu = trigger?.closest<HTMLElement>('[data-slot="popover-content"]')
  const layer = menu?.parentElement
  if (!menu || !layer) {
    return null
  }
  const rect = menu.getBoundingClientRect()
  const fitsRight =
    window.innerWidth - rect.right >= CALENDAR_WIDTH + VIEWPORT_MARGIN
  const fitsLeft = rect.left >= CALENDAR_WIDTH + VIEWPORT_MARGIN
  return {
    anchor: { current: menu },
    layer,
    side: fitsRight || !fitsLeft ? 'right' : 'left',
  }
}

// 最早的那个月不能再往前翻：「上个月」按钮保持原样，只是点不了。
function LockedPreviousMonthButton(props: ComponentProps<'button'>) {
  return <button {...props} tabIndex={-1} aria-disabled onClick={undefined} />
}

// 排期「到某天」的截止日：一枚白色胶囊，点开后月历紧贴在排期菜单旁边。
// 只能选明天及以后的日子；`value` 是 yyyy-MM-dd，没选时是空串。
//
// 月历不是独立漂在页面上的弹层：它挂在排期菜单的定位层里，位置相对菜单固定，
// 所以页面滚动时和菜单一起动，不会各走各的，也不会为了躲视口边缘而滑开。
export function CourseScheduleEndDatePicker({
  'aria-describedby': ariaDescribedBy,
  className,
  invalid,
  onValueChange,
  value,
}: {
  'aria-describedby'?: string
  className?: string
  invalid: boolean
  onValueChange: (value: string) => void
  value: string
}) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [host, setHost] = useState<HostMenu | null>(null)
  const selected = value === '' ? undefined : parseISO(value)
  const tomorrow = addDays(new Date(), 1)
  // 能翻到的最早一个月：明天所在的月份。
  const firstMonth = startOfMonth(tomorrow)
  const [month, setMonth] = useState(firstMonth)

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setHost(findHostMenu(triggerRef.current))
      // 每次打开都回到已选日期所在的月份，没选过就从最早的月份开始。
      setMonth(max([startOfMonth(selected ?? tomorrow), firstMonth]))
    }
    setOpen(next)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      {host && <PopoverAnchor virtualRef={host.anchor} />}
      <PopoverTrigger asChild>
        <button
          ref={triggerRef}
          type="button"
          aria-invalid={invalid}
          aria-describedby={ariaDescribedBy}
          className={cn(
            'flex h-7 w-full items-center gap-1.5 rounded-full bg-white pr-2.5 pl-3 text-xs ring-1 ring-zinc-200 outline-none transition-shadow ring-inset',
            'hover:ring-zinc-300 focus-visible:ring-2 focus-visible:ring-zinc-300 data-[state=open]:ring-zinc-300',
            invalid && 'ring-destructive/40 hover:ring-destructive/50',
            className
          )}
        >
          <span className="text-zinc-500">截止到</span>
          <span
            className={cn(
              'ml-auto tabular-nums',
              selected ? 'text-zinc-950' : 'text-zinc-400'
            )}
          >
            {selected ? format(selected, 'yyyy年M月d日') : '选择日期'}
          </span>
          <CalendarDays aria-hidden className="size-3.5 shrink-0 text-zinc-400" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        // 在排期菜单里：顶边对齐菜单，侧边压住菜单 1px 的边框，两块之间没有缝。
        // 不在任何菜单里时退回普通弹层，贴着胶囊弹出。
        {...(host
          ? {
              container: host.layer,
              side: host.side,
              sideOffset: -1,
              avoidCollisions: false,
            }
          : { side: 'bottom', sideOffset: 6 })}
        align="start"
        aria-label="选择截止日期"
        className="w-auto rounded-lg p-1 shadow-none"
      >
        <Calendar
          mode="single"
          locale={zhCN}
          weekStartsOn={1}
          // 每个月都铺满六行，前后用邻月的日子补齐：格子是完整的一块，翻月时高度也不跳。
          fixedWeeks
          selected={selected}
          month={month}
          onMonthChange={(next) => setMonth(max([next, firstMonth]))}
          // 月历本身放开到再往前一个月，这样最早那个月的第一行也能用上个月的日子补齐
          // （否则会空着）；往前翻由上面的 firstMonth 和锁住的按钮拦住。
          startMonth={subMonths(firstMonth, 1)}
          components={
            isSameMonth(month, firstMonth)
              ? { PreviousMonthButton: LockedPreviousMonthButton }
              : undefined
          }
          disabled={{ before: tomorrow }}
          onSelect={(date) => {
            if (date) {
              onValueChange(format(date, 'yyyy-MM-dd'))
              setOpen(false)
            }
          }}
          // 顶部内边距和月份到星期的间距是照着旁边的菜单定的：年月和「排进日程」同一行，
          // 星期那行和「学习日」同一行。
          className="px-1.5 pt-0.5 pb-1.5 [--cell-size:--spacing(7)]"
          classNames={{ month: 'flex w-full flex-col gap-[15px]' }}
        />
      </PopoverContent>
    </Popover>
  )
}
