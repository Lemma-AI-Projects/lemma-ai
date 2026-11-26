import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Check, ChevronDown, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import { CircularProgress } from '@/components/CircularProgress'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export interface ComposerTodayTask {
  id: string
  title: string
  // 完成度 0-100。
  progress: number
}

// 「今日」入口的候选样式。
//
// 第一组解决「默认没有边界、比右边的模式切换单薄」，内容都是「今日 还剩 N 项」：
// - plain：现状。没有底色和边框，悬停才垫一层浅灰；
// - chip：只有一圈细描边、没有填充；
// - outline：胶囊的描边本身就是今天的进度条，不再单独放小圆环；
// - ring：不加容器，把圆环放大、剩余项数写进环里。
//
// 第二组解决「标题加一句说明太像模板，去掉说明又撑不起来」，外壳都是描边胶囊，
// 每种只放一个信息单元：
// - segments：「今日」加一排小格子，一个任务一格，按各自的完成度填色；
// - next-task：小圆环加下一件没做完的事的名字；
// - date：小圆环加今天的日期；
// - sentence：小圆环加一句完整的话。
export type ComposerTodayButtonAppearance =
  | 'plain'
  | 'chip'
  | 'outline'
  | 'ring'
  | 'segments'
  | 'next-task'
  | 'date'
  | 'sentence'

const RING_TRACK_COLOR = '#e4e4e7'
const PROGRESS_COLOR = '#10b981'

// 描边胶囊：一圈细灰边、没有填充；悬停和打开时垫一层浅灰、边线加深一档。
const OUTLINED_SHELL_CLASS_NAME =
  'ring-1 ring-zinc-200 ring-inset hover:bg-zinc-200/50 hover:ring-zinc-300 data-[state=open]:bg-zinc-200/50 data-[state=open]:ring-zinc-300'

// 以小圆环开头的描边胶囊。
const OUTLINED_WITH_RING_CLASS_NAME = cn(
  'gap-[7px] pr-2.5 pl-2',
  OUTLINED_SHELL_CLASS_NAME
)

const TRIGGER_CLASS_NAME: Record<ComposerTodayButtonAppearance, string> = {
  plain:
    'gap-[7px] pr-2 pl-[7px] hover:bg-zinc-200/60 data-[state=open]:bg-zinc-200/60',
  chip: OUTLINED_WITH_RING_CLASS_NAME,
  outline:
    'gap-[7px] pr-2.5 pl-3.5 hover:bg-zinc-200/50 data-[state=open]:bg-zinc-200/50',
  ring: 'gap-2 pr-2 pl-1 hover:bg-zinc-200/60 data-[state=open]:bg-zinc-200/60',
  segments: cn('gap-2 pr-2.5 pl-3', OUTLINED_SHELL_CLASS_NAME),
  'next-task': OUTLINED_WITH_RING_CLASS_NAME,
  date: OUTLINED_WITH_RING_CLASS_NAME,
  sentence: OUTLINED_WITH_RING_CLASS_NAME,
}

// 进度描边的线宽；灰色轨道是 1px 的细线，走在同一条中心线上。
const OUTLINE_PROGRESS_WIDTH = 2

// 沿着胶囊外沿走的进度条：从最左端出发，顺时针走过 `value`% 的周长。
// 从左端的圆弧起步，一段进度看上去是「一个环走了一截」，而不是顶边上的一道色条。
// 胶囊的宽度跟着文字变，所以用 ResizeObserver 量出实际尺寸再画。
function PillProgressOutline({ value }: { value: number }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [size, setSize] = useState<{ width: number; height: number } | null>(null)

  useLayoutEffect(() => {
    const svg = svgRef.current
    if (!svg) return undefined
    const observer = new ResizeObserver(([entry]) => {
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      })
    })
    observer.observe(svg)
    return () => observer.disconnect()
  }, [])

  const inset = OUTLINE_PROGRESS_WIDTH / 2
  const rect = size && {
    x: inset,
    y: inset,
    width: size.width - OUTLINE_PROGRESS_WIDTH,
    height: size.height - OUTLINE_PROGRESS_WIDTH,
    rx: (size.height - OUTLINE_PROGRESS_WIDTH) / 2,
  }
  const progress = Math.min(Math.max(value, 0), 100)
  // 矩形的路径从左上角的切点起笔；最左端在它之前四分之一个圆弧处。
  // 周长按 100 计（pathLength），这里算出那四分之一圆弧占多少，把虚线往回挪这么多。
  const quarterArc = rect ? (Math.PI * rect.rx) / 2 : 0
  const perimeter = rect ? 2 * (rect.width - 2 * rect.rx) + 2 * Math.PI * rect.rx : 1
  const startOffset = (quarterArc / perimeter) * 100

  return (
    <svg
      ref={svgRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 size-full"
    >
      {rect && (
        <>
          <rect {...rect} fill="none" stroke={RING_TRACK_COLOR} strokeWidth={1} />
          {progress > 0 && (
            <rect
              {...rect}
              fill="none"
              stroke={PROGRESS_COLOR}
              strokeWidth={OUTLINE_PROGRESS_WIDTH}
              strokeLinecap="round"
              pathLength={100}
              strokeDasharray={`${progress} ${100 - progress}`}
              strokeDashoffset={startOffset}
            />
          )}
        </>
      )}
    </svg>
  )
}

// 今天整体进度的小圆环。
function TodayRing({ value }: { value: number }) {
  return (
    <CircularProgress
      value={value}
      size={18}
      strokeWidth={3}
      trackColor={RING_TRACK_COLOR}
    />
  )
}

// 一格一格分开画最多画这么多个任务；再多就合成一条连续的进度条，免得把胶囊撑得太长。
const MAX_TASK_SEGMENTS = 6

function SegmentBar({ className, value }: { className: string; value: number }) {
  return (
    <span className={cn('h-1.5 overflow-hidden rounded-full bg-zinc-200', className)}>
      <span
        className="block h-full rounded-full bg-emerald-500"
        style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
      />
    </span>
  )
}

// 一个任务一格，按各自的完成度填色：有几件事、做到哪了，不用文字也看得出来。
function TaskSegments({ tasks }: { tasks: ComposerTodayTask[] }) {
  if (tasks.length > MAX_TASK_SEGMENTS) {
    const average =
      tasks.reduce((sum, task) => sum + task.progress, 0) / tasks.length
    return (
      <span aria-hidden className="flex items-center">
        <SegmentBar className="w-16" value={average} />
      </span>
    )
  }
  // 任务少的时候每格宽一些：格子太短，「做了四分之一」只剩一个小点，读不出是进度。
  const segmentWidth = tasks.length <= 4 ? 'w-5' : 'w-3.5'
  return (
    <span aria-hidden className="flex items-center gap-[3px]">
      {tasks.map((task) => (
        <SegmentBar key={task.id} className={segmentWidth} value={task.progress} />
      ))}
    </span>
  )
}

// 输入框左上角的「今日」入口：今天的进度，点开列出今天还没做完的任务。
// 卡片里只有任务，没有标题：胶囊上已经说了「今天」，日期不再重复。
// 每个任务是一行可以点的入口；任务自己的页面还没有，先都跳到日程页。
export function ComposerTodayButton({
  appearance = 'plain',
  tasks,
}: {
  appearance?: ComposerTodayButtonAppearance
  tasks: ComposerTodayTask[]
}) {
  const pendingTasks = tasks.filter((task) => task.progress < 100)
  const doneCount = tasks.length - pendingTasks.length
  const overallProgress =
    tasks.length === 0 ? 0 : Math.round((doneCount / tasks.length) * 100)
  const allDone = pendingTasks.length === 0
  const statusText = allDone ? '已完成' : `还剩 ${pendingTasks.length} 项`
  const dateText = format(new Date(), 'M月d日 EEE', { locale: zhCN })

  // 每种样式胶囊里的内容，以及看不出完整意思时给读屏用的一句话。
  let content: ReactNode
  let ariaLabel: string | undefined
  switch (appearance) {
    case 'outline':
      content = (
        <>
          <PillProgressOutline value={overallProgress} />
          <span className="font-medium">今日</span>
          <span className="text-zinc-600">{statusText}</span>
        </>
      )
      break
    case 'ring':
      ariaLabel = `今日待办，${statusText}`
      content = (
        <>
          <span className="relative inline-flex size-6 items-center justify-center">
            <CircularProgress
              value={overallProgress}
              size={24}
              strokeWidth={3}
              trackColor={RING_TRACK_COLOR}
              className="absolute inset-0"
            />
            {allDone ? (
              <Check className="relative size-3 text-emerald-600" strokeWidth={3} />
            ) : (
              <span className="relative text-[11px] leading-none font-semibold tabular-nums">
                {pendingTasks.length}
              </span>
            )}
          </span>
          <span className="font-medium">今日待办</span>
        </>
      )
      break
    case 'segments':
      ariaLabel = `今日任务，${statusText}`
      content = (
        <>
          <span className="font-medium">今日</span>
          <TaskSegments tasks={tasks} />
        </>
      )
      break
    case 'next-task':
      ariaLabel = allDone
        ? '今日任务，已完成'
        : `今日任务，下一件：${pendingTasks[0].title}`
      content = (
        <>
          <TodayRing value={overallProgress} />
          <span className="max-w-48 truncate font-medium">
            {allDone ? '今日已完成' : pendingTasks[0].title}
          </span>
        </>
      )
      break
    case 'date':
      ariaLabel = `今日任务，${statusText}`
      content = (
        <>
          <TodayRing value={overallProgress} />
          <span className="font-medium tabular-nums">{dateText}</span>
        </>
      )
      break
    case 'sentence':
      content = (
        <>
          <TodayRing value={overallProgress} />
          <span className="font-medium">
            {allDone ? '今天的事都做完了' : `今天还有 ${pendingTasks.length} 件事`}
          </span>
        </>
      )
      break
    default:
      content = (
        <>
          <TodayRing value={overallProgress} />
          <span className="font-medium">今日</span>
          <span className="text-zinc-600">{statusText}</span>
        </>
      )
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          className={cn(
            'relative inline-flex h-8 items-center rounded-full text-[14.5px] leading-5 text-zinc-950 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-zinc-300',
            TRIGGER_CLASS_NAME[appearance]
          )}
        >
          {content}
          <ChevronDown className="size-3.5 shrink-0 text-zinc-400" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="top"
        sideOffset={8}
        aria-label="今日任务"
        // 宽度跟着最长的任务名走，不再固定成一张宽卡片；名字太长时到上限截断。
        className="w-fit max-w-52 min-w-40 rounded-lg p-1 shadow-none"
      >
        {allDone ? (
          <p className="px-2 py-1.5 text-[14px] leading-5 text-zinc-500">
            今天的任务都完成了。
          </p>
        ) : (
          <ul>
            {pendingTasks.map((task) => (
              <li key={task.id}>
                <Link
                  to="/schedule"
                  className="group flex items-center gap-2.5 rounded-sm px-2 py-1.5 text-[14px] leading-5 text-zinc-950 outline-hidden transition-colors hover:bg-accent focus-visible:bg-accent"
                >
                  <CircularProgress
                    value={task.progress}
                    size={16}
                    strokeWidth={2.75}
                    trackColor={RING_TRACK_COLOR}
                  />
                  <span className="min-w-0 flex-1 truncate">{task.title}</span>
                  <ChevronRight className="size-3.5 shrink-0 text-zinc-400 transition-colors group-hover:text-zinc-600 group-focus-visible:text-zinc-600" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  )
}
