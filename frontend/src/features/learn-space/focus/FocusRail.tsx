import { useState } from 'react'
import { Ellipsis, Pencil, Trash2 } from 'lucide-react'

import { ActionMenu, ActionMenuItem } from '@/components/ActionMenu'
import { cn } from '@/lib/utils'

export interface FocusRailProps {
  /** 空间里的资料（不含文件夹）—— 漫游用。 */
  pages: { id: string; title: string }[]
  currentPageId?: string
  onSelectPage: (pageId: string) => void
  isPagesLoading?: boolean
  /**
   * 资料项上的**重命名 / 删除**（M4）—— 两个都给才渲染那个悬停菜单。
   *
   * 聚焦以前只能读，想改个名字、删掉一份都得退回网格。这里复用网格那两个
   * mutation。只给一个的话菜单不出来：一个点了没反应的菜单项，比少一个菜单更糟。
   */
  onRenamePage?: (pageId: string, title: string) => void
  onDeletePage?: (pageId: string) => void
  className?: string
}

/**
 * 聚焦模式的左栏 —— **只有一段：空间里的资料**。
 *
 * 它回答一个问题：**我在这个空间的哪份材料里，切到下一份。**
 *
 * ⚠️ 2026-10-18 去掉的「大纲」段（原来在上半截，从正文标题派生）。
 * 理由不是它没用，是它答的是**另一个问题**（"我在这篇文档的第几节"），而这一栏
 * 是对**整个空间**的导航。语言材料（一段对话、一段语音转写）根本没有标题层级，
 * 那段永远是空的 —— 留着它等于让一栏里挂着两个不同职责。
 * 而且**这一栏现在默认收起**（`FocusView` 的 `isRailOpen` 初值是 false）：
 * 进来时屏幕应该全给内容，找材料是"要的时候才做的事"。
 *
 * 顺带：没有资料时**不显示空壳**，只说一句"还没有资料"。
 */
export function FocusRail({
  pages,
  currentPageId,
  onSelectPage,
  isPagesLoading = false,
  onRenamePage,
  onDeletePage,
  className,
}: FocusRailProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const hasMenu = Boolean(onRenamePage && onDeletePage)

  const commitRename = (pageId: string) => {
    const next = draft.trim()
    if (next) onRenamePage?.(pageId, next)
    setEditingId(null)
  }

  return (
    <aside
      className={cn(
        'flex w-56 shrink-0 flex-col gap-4 overflow-y-auto border-r border-zinc-200 px-3 py-3 dark:border-zinc-800',
        className
      )}
    >
      <section>
        <h2 className="px-1 pb-1.5 text-[11px] font-medium tracking-wide text-zinc-400">
          材料{isPagesLoading ? '' : ` · ${pages.length}`}
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
            这个空间还没有放进材料
          </p>
        ) : (
          <ul className="space-y-0.5">
            {pages.map((page) => {
              const isCurrent = page.id === currentPageId
              const label = page.title || '未命名'
              return (
                <li key={page.id} className="group relative">
                  {editingId === page.id ? (
                    <input
                      autoFocus
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') commitRename(page.id)
                        if (event.key === 'Escape') setEditingId(null)
                      }}
                      onBlur={() => setEditingId(null)}
                      className="w-full rounded border border-violet-300 bg-white px-1 py-0.5 text-[13px] outline-none dark:border-violet-700 dark:bg-zinc-900"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSelectPage(page.id)}
                      aria-current={isCurrent ? 'true' : undefined}
                      className={cn(
                        'block w-full truncate rounded px-1 py-1 text-left text-[13px] transition-colors',
                        hasMenu && 'pr-7',
                        isCurrent
                          ? 'bg-violet-50 text-violet-800 dark:bg-violet-950 dark:text-violet-200'
                          : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800'
                      )}
                    >
                      {label}
                    </button>
                  )}

                  {hasMenu && editingId !== page.id && (
                    <span className="absolute right-0.5 top-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                      <ActionMenu
                        align="end"
                        width="sm"
                        trigger={
                          <button
                            type="button"
                            data-focus-page-menu
                            aria-label={`${label} 的更多操作`}
                            className="rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-zinc-700"
                          >
                            <Ellipsis className="size-3.5" />
                          </button>
                        }
                      >
                        <ActionMenuItem
                          icon={Pencil}
                          label="重命名"
                          onSelect={() => {
                            setDraft(page.title)
                            setEditingId(page.id)
                          }}
                        />
                        <ActionMenuItem
                          icon={Trash2}
                          label="删除"
                          destructive
                          onSelect={() => onDeletePage?.(page.id)}
                        />
                      </ActionMenu>
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </aside>
  )
}