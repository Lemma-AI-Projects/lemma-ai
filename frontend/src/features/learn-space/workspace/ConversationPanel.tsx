import { useState, type FormEvent } from 'react'
import { ArrowUp, Mic, Pencil, Plus, X } from 'lucide-react'

import { cn } from '@/lib/utils'

export interface ConversationPanelProps {
  /** 用于欢迎语里的空间名。 */
  spaceName: string
  onClose: () => void
  /** 送出一句话：接的是「带初始消息进 /chat」的既有接力流程。 */
  onSubmit: (text: string) => void
  className?: string
}

/**
 * 右侧对话面板（参考稿右侧栏）。
 *
 * 面板里的输入框不是空壳：提交后走与项目页完全相同的接力路径
 * （/chat + initialMessage + projectId），会话会诞生在当前空间里。
 */
export function ConversationPanel({
  spaceName,
  onClose,
  onSubmit,
  className,
}: ConversationPanelProps) {
  const [draft, setDraft] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const text = draft.trim()
    if (!text) return
    setDraft('')
    onSubmit(text)
  }

  return (
    <aside
      className={cn(
        'flex shrink-0 flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white',
        className
      )}
    >
      <header className="flex h-11 shrink-0 items-center justify-between pl-5 pr-2">
        <h2 className="text-sm font-medium text-zinc-900">
          对话
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="关闭"
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-zinc-900/10"
        >
          <X className="size-4" />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-2">
        <p className="flex items-center gap-2 text-sm text-zinc-900">
          <Pencil className="size-4 shrink-0 text-zinc-500" />
          草稿
        </p>

        <p className="mt-5 text-sm leading-6 text-zinc-800">
          {`欢迎来到「${spaceName}」。在这里你能看到该空间下的全部文件、笔记与白板；也可以开启一段新对话，或把已有的对话纳入进来。旅程从这里开始。`}
        </p>

        {/* 参考稿里的状态占位：本轮没有任何流在跑，所以只作为静态提示。 */}
        <p className="mt-6 flex items-center gap-2 text-sm text-zinc-300">
          <span aria-hidden className="tracking-[0.2em]">
            ···
          </span>
          模型正在解释
        </p>
      </div>

      <div className="shrink-0 p-3">
        <form
          onSubmit={handleSubmit}
          className="flex h-11 items-center gap-1.5 rounded-2xl border border-zinc-200/80 bg-zinc-50 pl-1.5 pr-1"
        >
          {/* 附件与语音：能力未接，禁用而不是做成点了没反应的按钮。 */}
          <button
            type="button"
            disabled
            aria-label="添加附件"
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 disabled:cursor-default disabled:hover:bg-transparent"
          >
            <Plus className="size-4" />
          </button>

          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="走向未知"
            aria-label="走向未知"
            className="min-w-0 flex-1 bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
          />

          <button
            type="button"
            disabled
            aria-label="语音输入"
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-200 disabled:cursor-default disabled:hover:bg-transparent"
          >
            <Mic className="size-4" />
          </button>

          <button
            type="submit"
            disabled={draft.trim().length === 0}
            aria-label="发送"
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-white transition-colors hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-zinc-900/20 disabled:cursor-default disabled:bg-zinc-200 disabled:text-zinc-400"
          >
            <ArrowUp className="size-4" />
          </button>
        </form>
      </div>
    </aside>
  )
}
