import { useState } from 'react'

import { cn } from '@/lib/utils'

/**
 * 聚焦页那个标题 —— 原来只是一行只读的 `h1`（`FocusView.tsx:911`）。
 *
 * ## 为什么现在能改
 *
 * 用户新建一条笔记之后，第一件事就是给它起个名字。原来只能退回网格去改
 * （`FocusRail` 的悬停菜单里那个「重命名」），于是"写下想法"被打断成
 * "先给它取个名，请去另一个地方"。
 *
 * ## 为什么不做成「第一行就是标题」
 *
 * Apple Notes 的标题和正文是同一个文本流，这里的 `pages.title` 和 `blocks`
 * 是两套东西（`doc_service.update_page` 与 `save_page_blocks` 是两条路）。
 * 硬把它们装成一体，会在"第一行按回车"这类边界上撕裂。
 * ⇒ **标题就是标题这一栏**，只是长得像笔记：没有边框、点一下就能写。
 *
 * ## 三个小决定
 *
 * 1. **始终是 input，不是"点一下变成输入框"**。少一次状态切换，也少一次
 *    "我以为能打字其实不能"的误判。
 * 2. **空了就回退**。一条没有名字的笔记比一段默认名字更难找 —— 所以清空后
 *    离开，恢复原标题，而不是存一个空串。
 * 3. **Esc 取消、Enter 提交**。这两个是所有输入框的肌肉记忆，不值得另立规矩。
 *
 * ## 换页靠 `key`
 *
 * 组件内部不同步外部值（没有 effect）—— 父组件用 `key={pageId}` 让它在新的一页
 * 重新挂载，草稿自然重置。这样**不会在用户打字时被后台刷新覆盖**。
 */
export function TitleField({
  value,
  onCommit,
  disabled = false,
  className,
}: {
  value: string
  onCommit: (next: string) => void
  disabled?: boolean
  className?: string
}) {
  const [draft, setDraft] = useState(value)

  const commit = () => {
    const next = draft.trim()
    if (!next || next === value) {
      setDraft(value) // 空标题不成笔记，回退
      return
    }
    onCommit(next)
  }

  return (
    <input
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.currentTarget.blur()
        }
        if (event.key === 'Escape') {
          setDraft(value)
          event.currentTarget.blur()
        }
      }}
      disabled={disabled}
      aria-label="标题"
      spellCheck={false}
      className={cn(
        'min-w-0 flex-1 truncate rounded-sm border-0 bg-transparent px-0 py-0 text-base font-medium',
        'outline-none transition-colors',
        /* U5 · 安静：平时完全没有框，只有拿住光标时才有一点底。
           保存提示在右边，这里不再加任何东西。 */
        'hover:bg-black/[0.02] focus:bg-black/[0.03] focus:outline-none',
        disabled && 'cursor-default hover:bg-transparent',
        className
      )}
    />
  )
}
