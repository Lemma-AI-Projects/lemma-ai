import { ChevronLeft, ChevronRight, Lasso, Maximize2, Minimize2 } from 'lucide-react'

import { cn } from '@/lib/utils'

export interface FocusTopBarProps {
  spaceName: string
  isNameLoading?: boolean
  /**
   * 这一轮的 method 状态。**今天只是占位** —— method 的流程还没实装，
   * 所以这里显示的是后端 METHODS 里真实存在的那个名字（`socratic`），
   * 后面挂一个 `（mock）` 明说它不是真在跑，而不是编一个好听的状态。
   */
  method?: string
  /** 页码 = 漫游位置。没有资料可漫游时传 `null`（不是画一个 1/1 的假页码）。 */
  roam?: {
    index: number
    count: number
    onPrev: () => void
    onNext: () => void
  } | null
  /** 左上角的空间名就是出去的路（点它回网格）。 */
  onExit: () => void
  onToggleMethod?: () => void
  /** Mala 这一轮还没接上投送 —— 传了原因就渲染成禁用并写清楚为什么。 */
  malaDisabledReason?: string
  onTogglePanel: () => void
  isPanelFull: boolean
  className?: string
}

/**
 * 聚焦模式的顶栏 ——四段，按用户 09-29 给的版式。
 *
 * 左：**空间名 + 「聚焦」标识**（空间名本身就是出去的路，所以没有返回箭头）
 * 中：**method 状态栏**（这一条的主位，形状留够给将来的流程）
 * 右：**页码**（= 漫游位置）· **Mala** · **一个小 SVG 图标按钮**（对话全屏）
 *
 * `dimension` 不在这儿：它属于"空间"层级，不属于某一份资料。
 */
export function FocusTopBar({
  spaceName,
  isNameLoading = false,
  method = 'socratic（mock）',
  roam = null,
  onExit,
  onToggleMethod,
  malaDisabledReason,
  onTogglePanel,
  isPanelFull,
  className,
}: FocusTopBarProps) {
  const iconButton =
    'rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-zinc-900/10 disabled:opacity-40 disabled:hover:bg-transparent'

  return (
    <header
      className={cn(
        'flex h-12 shrink-0 items-center gap-2 border-b border-zinc-200 px-3 dark:border-zinc-800',
        className
      )}
    >
      <button
        type="button"
        onClick={onExit}
        title="回到这个空间"
        className="max-w-56 truncate rounded px-1 py-1 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-zinc-900/10 dark:text-zinc-100"
      >
        {isNameLoading ? '读取中…' : spaceName || '这个空间'}
      </button>
      <span className="shrink-0 rounded-md bg-violet-50 px-1.5 py-0.5 text-[11px] font-medium text-violet-700 ring-1 ring-violet-200">
        聚焦
      </span>

      <div className="mx-auto flex items-center">
        <button
          type="button"
          onClick={onToggleMethod}
          title="method 的状态位：流程还没实装，值是占位的"
          className="flex items-center gap-1.5 rounded-full border border-zinc-200 px-2.5 py-1 text-xs text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200"
        >
          <span className="size-1.5 rounded-full bg-zinc-300" />
          <span className="text-zinc-400">method</span>
          <span className="tabular-nums">{method}</span>
        </button>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {roam && roam.count > 1 && (
          <div className="flex items-center rounded-full border border-zinc-200 px-0.5 dark:border-zinc-700">
            <button
              type="button"
              onClick={roam.onPrev}
              aria-label="上一份资料"
              className="rounded-full p-1 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-40"
            >
              <ChevronLeft className="size-3.5" />
            </button>
            <span className="px-1 text-xs tabular-nums text-zinc-600 dark:text-zinc-300">
              {roam.index + 1} / {roam.count}
            </span>
            <button
              type="button"
              onClick={roam.onNext}
              aria-label="下一份资料"
              className="rounded-full p-1 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-40"
            >
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        )}

        <button
          type="button"
          disabled={Boolean(malaDisabledReason)}
          title={malaDisabledReason ?? 'Mala：圈出你要交给 Agent 的部分'}
          className="flex items-center gap-1 rounded-full px-2.5 py-1 text-sm text-violet-700 ring-1 ring-violet-200 transition-colors hover:bg-violet-50 disabled:text-zinc-400 disabled:ring-zinc-200 disabled:hover:bg-transparent"
        >
          <Lasso className="size-4" />
          <span>Mala</span>
        </button>

        <button
          type="button"
          onClick={onTogglePanel}
          aria-label={isPanelFull ? '收起全屏对话' : '对话全屏'}
          title={isPanelFull ? '收起全屏对话' : '对话全屏'}
          className={iconButton}
        >
          {isPanelFull ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
        </button>
      </div>
    </header>
  )
}
