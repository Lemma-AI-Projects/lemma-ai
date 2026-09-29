import { cn } from '@/lib/utils'
import type { OutlineRow } from './blockOps'

export interface FocusRailProps {
  /** 这份资料的大纲 —— 从正文的标题派生（`outlineOf`，纯函数）。 */
  outline: OutlineRow[]
  onJump: (index: number) => void
  /** 空间里的资料（不含文件夹）—— 漫游用。 */
  pages: { id: string; title: string }[]
  currentPageId?: string
  onSelectPage: (pageId: string) => void
  isPagesLoading?: boolean
  className?: string
}

/**
 * 聚焦模式的左栏 —— 两段，回答两个不同的问题：
 *
 * - 上：**这份资料的大纲**（我在这份材料里的位置）
 * - 下：**空间里的资料**（我在整个空间里的位置）
 *
 * 它们不是一回事，所以不合并成一个列表；漫游到底走哪一份，看的是下面那一段。
 *
 * 没有大纲时**不显示空壳**：一份 PDF、一份没有标题的资料，本来就没有大纲，
 * 画一个"大纲"标题下面是空的，只会让人以为是加载失败。
 */
export function FocusRail({
  outline,
  onJump,
  pages,
  currentPageId,
  onSelectPage,
  isPagesLoading = false,
  className,
}: FocusRailProps) {
  return (
    <aside
      className={cn(
        'flex w-56 shrink-0 flex-col gap-4 overflow-y-auto border-r border-zinc-200 px-3 py-3 dark:border-zinc-800',
        className
      )}
    >
      {outline.length > 0 && (
        <section>
          <h2 className="px-1 pb-1.5 text-[11px] font-medium tracking-wide text-zinc-400">
            大纲
          </h2>
          <ul className="space-y-0.5">
            {outline.map((row) => (
              <li key={row.key}>
                <button
                  type="button"
                  onClick={() => onJump(row.index)}
                  style={{ paddingLeft: `${(row.level - 1) * 10 + 4}px` }}
                  className="block w-full truncate rounded py-1 pr-1 text-left text-[13px] text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  {row.text}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="px-1 pb-1.5 text-[11px] font-medium tracking-wide text-zinc-400">
          空间资料{isPagesLoading ? '' : ` · ${pages.length}`}
        </h2>
        {isPagesLoading ? (
          <div className="space-y-1.5 px-1">
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                className="h-3.5 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800"
              />
            ))}
          </div>
        ) : pages.length === 0 ? (
          <p className="px-1 text-[12px] leading-5 text-zinc-400">
            这个空间还没有资料
          </p>
        ) : (
          <ul className="space-y-0.5">
            {pages.map((page) => {
              const isCurrent = page.id === currentPageId
              return (
                <li key={page.id}>
                  <button
                    type="button"
                    onClick={() => onSelectPage(page.id)}
                    aria-current={isCurrent ? 'true' : undefined}
                    className={cn(
                      'block w-full truncate rounded px-1 py-1 text-left text-[13px] transition-colors',
                      isCurrent
                        ? 'bg-violet-50 text-violet-800 dark:bg-violet-950 dark:text-violet-200'
                        : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800'
                    )}
                  >
                    {page.title || '未命名'}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </aside>
  )
}
