import { ChevronLeft, ChevronRight, Lasso, Maximize2, Minimize2 } from 'lucide-react'

import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { MethodStatus } from '@/features/learn-space/method/methodApi'

export interface FocusTopBarProps {
  spaceName: string
  isNameLoading?: boolean
  /**
   * 空间名后面那一行**方位**：`考到 90 分 · 还有 21 天`。
   *
   * 它是"我为什么在这个空间里花时间"的一句话，由页面算好传进来（顶栏不认识
   * "目标"这个对象）。没有目标时 `null` —— 这个位置就空着，而不是写一句
   * "还没有目标"：那是简报要说的事。
   */
  goalLine?: string | null
  /**
   * method 状态栏的四格。三态：
   *
   * - `undefined` = 还没读到（读中 / 这个页面不连后端）→ 画骨架；
   * - `null` = 读不到 → **明说读不到**，绝不用一句听起来正常的话盖过去；
   * - 对象 = 有。
   *
   * `focus` 不在里面：这一刻还没有人说话，所以"这一轮连到哪个知识点"没有答案。
   */
  methodStatus?: MethodStatus | null
  /** 页码 = 漫游位置。没有资料可漫游时传 `null`（不是画一个 1/1 的假页码）。 */
  roam?: {
    index: number
    count: number
    onPrev: () => void
    onNext: () => void
  } | null
  /** 左上角的空间名就是出去的路（点它回网格）。 */
  onExit: () => void
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
 * 中：**method 状态栏**（这一条的主位）
 * 右：**页码**（= 漫游位置）· **Mala** · **一个小 SVG 图标按钮**（对话全屏）
 *
 * `dimension` 不在这儿：它属于"空间"层级，不属于某一份资料。
 *
 * **状态栏说的是三个事实，不是一个名字**：在做什么 · 要你做什么 · 什么算完成，
 * 下面一行是"这件事和你的目标什么关系"。三条硬规矩：
 *
 * 1. **它是状态，不是选择器。** 没有下拉、没有"切换 method"菜单 —— 所以这里连
 *    点击回调都没有（以前那个 `onToggleMethod` 谁也没传，是一个点了没反应的按钮）。
 * 2. **不显示 Method 的名字。** 用户看到的是动词，不是术语。后端压根不发名字，
 *    所以这条规矩在界面这一侧是**结构上做不到违反**的。
 * 3. **四格里没有进度、没有百分比。** `completion` 是判据（什么算过），不是完成度。
 */
export function FocusTopBar({
  spaceName,
  isNameLoading = false,
  goalLine = null,
  methodStatus,
  roam = null,
  onExit,
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

      {goalLine && (
        <span
          title={goalLine}
          className="hidden max-w-56 truncate text-xs text-zinc-400 sm:block"
        >
          {goalLine}
        </span>
      )}

      <div className="mx-auto flex min-w-0 items-center">
        <MethodStatusPill status={methodStatus} />
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

/**
 * 状态栏本体。三态各有各的样子，而且**读不到就说读不到**。
 *
 * 三条事实挤在一行里，用 `·` 分开，靠语序读出来（先做什么 · 你做什么 · 什么算过）——
 * 这正是设计里给的样子（`先请你自己走一遍 · 等你写下前两步 · 连续 2 道独立做对就算过`）。
 * 第二行是"这件事和你的目标什么关系"；没有目标时那一行不存在，而不是写一句通用的。
 */
function MethodStatusPill({ status }: { status: MethodStatus | null | undefined }) {
  if (status === undefined) {
    return <Skeleton className="h-8 w-64 rounded-full" />
  }

  if (status === null) {
    return (
      <div
        title="读不到 method 状态（后端没有回应）—— 这里不会用一句听起来正常的话盖过去"
        className="rounded-full border border-dashed border-zinc-300 px-3 py-1 text-xs text-zinc-400"
      >
        现在在怎么教，读不到
      </div>
    )
  }

  const facts = [status.systemMove, status.learnerMove, status.completion]
  return (
    <div
      title={[facts.join(' · '), status.goalRelation].filter(Boolean).join('\n')}
      className="flex min-w-0 max-w-[28rem] flex-col items-center gap-0.5 rounded-2xl border border-zinc-200 px-3 py-1 dark:border-zinc-700"
    >
      <div className="flex min-w-0 items-center gap-1.5 text-xs text-zinc-700 dark:text-zinc-200">
        <span className="truncate">{status.systemMove}</span>
        <span className="shrink-0 text-zinc-300">·</span>
        <span className="truncate text-zinc-600 dark:text-zinc-300">{status.learnerMove}</span>
        <span className="shrink-0 text-zinc-300">·</span>
        <span className="truncate text-zinc-500">{status.completion}</span>
      </div>
      {status.goalRelation && (
        <p className="max-w-full truncate text-[11px] leading-4 text-zinc-400">
          {status.goalRelation}
        </p>
      )}
    </div>
  )
}
