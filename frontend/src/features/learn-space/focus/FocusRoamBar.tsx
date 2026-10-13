import { ChevronLeft, ChevronRight } from 'lucide-react'

export interface FocusRoamBarProps {
  /** 当前这一份在资料里的下标（页码显示的是 `index + 1`）。 */
  index: number
  count: number
  onPrev: () => void
  onNext: () => void
}

/**
 * 聚焦底部的**漫游条** —— 上一份 / 页码 / 下一份。
 *
 * 它原来挤在顶栏右侧。移到最下面，是因为顶栏那一条属于"我在哪个空间、现在在被
 * 怎么教"，而翻页是**读的节奏**：眼睛在正文底部，手也该在底部。它不跟着正文滚，
 * 钉在页面底部 —— 读到一半也能翻。
 *
 * 到头就把按钮**禁掉**：第一份的"上一份"、最后一份的"下一份"点了不该没反应。
 * 只有一份资料时**整条不出现**（不是画一个点了没用的 1/1）。
 */
export function FocusRoamBar({
  index,
  count,
  onPrev,
  onNext,
}: FocusRoamBarProps) {
  if (count <= 1) return null

  const button =
    'flex items-center gap-1 rounded-full border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900 disabled:opacity-40 disabled:hover:bg-transparent dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'

  return (
    <div
      data-focus-roam-bar
      className="flex shrink-0 items-center justify-center gap-3 border-t border-zinc-200 px-4 py-2 dark:border-zinc-800"
    >
      <button
        type="button"
        onClick={onPrev}
        disabled={index <= 0}
        aria-label="上一份资料"
        className={button}
      >
        <ChevronLeft className="size-3.5" />
        上一份
      </button>
      <span className="px-1 text-xs tabular-nums text-zinc-500">
        {index + 1} / {count}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={index >= count - 1}
        aria-label="下一份资料"
        className={button}
      >
        下一份
        <ChevronRight className="size-3.5" />
      </button>
    </div>
  )
}