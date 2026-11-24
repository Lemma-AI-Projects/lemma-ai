import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { ChevronDown } from 'lucide-react'

import { CircularProgress } from '@/components/CircularProgress'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

export interface ComposerTodayTask {
  id: string
  title: string
  // 完成度 0-100。
  progress: number
}

const RING_TRACK_COLOR = '#e4e4e7'

// 输入框左上角的「今日」入口：进度环 + 剩余项数，点开列出今天还没做完的任务。
export function ComposerTodayButton({ tasks }: { tasks: ComposerTodayTask[] }) {
  const pendingTasks = tasks.filter((task) => task.progress < 100)
  const doneCount = tasks.length - pendingTasks.length
  const overallProgress =
    tasks.length === 0 ? 0 : Math.round((doneCount / tasks.length) * 100)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex h-8 items-center gap-[7px] rounded-full pr-2 pl-[7px] text-[14.5px] leading-5 text-zinc-950 outline-none transition-colors hover:bg-zinc-200/60 focus-visible:ring-2 focus-visible:ring-zinc-300 data-[state=open]:bg-zinc-200/60"
        >
          <CircularProgress
            value={overallProgress}
            size={18}
            strokeWidth={3}
            trackColor={RING_TRACK_COLOR}
          />
          <span className="font-medium">今日</span>
          <span className="text-zinc-600">
            {pendingTasks.length > 0 ? `还剩 ${pendingTasks.length} 项` : '已完成'}
          </span>
          <ChevronDown className="size-3.5 text-zinc-400" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="top"
        sideOffset={8}
        aria-label="今日任务"
        className="w-56 rounded-lg p-1 shadow-none"
      >
        <p className="px-2 py-1 text-[11px] font-medium text-muted-foreground">
          {format(new Date(), 'M月d日 EEE', { locale: zhCN })}
        </p>
        {pendingTasks.length > 0 ? (
          <ul>
            {pendingTasks.map((task) => (
              <li
                key={task.id}
                className="flex items-center gap-2.5 px-2 py-1.5 text-[14px] leading-5 text-zinc-950"
              >
                <CircularProgress
                  value={task.progress}
                  size={16}
                  strokeWidth={2.75}
                  trackColor={RING_TRACK_COLOR}
                />
                <span className="min-w-0 flex-1 truncate">{task.title}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-2 py-1.5 text-[14px] leading-5 text-zinc-500">
            今天的任务都完成了。
          </p>
        )}
      </PopoverContent>
    </Popover>
  )
}
