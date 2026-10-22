import { useEffect, useRef, useState } from 'react'
import { ArrowUp } from 'lucide-react'

import { cn } from '@/lib/utils'

export interface ChatMessage {
  id: string
  role: 'user' | 'agent'
  text: string
}

/**
 * 右栏对话 —— **次要交互面**，但要是真的。
 *
 * 三条规矩：
 * 1. **每条 Agent 消息都标"模拟回复"**。不标，评审就会以为这里接了一个真模型，
 *    然后把讨论从"交互模型"带到"回答质量"上去。
 * 2. 回复文案里**不出现"你的问题很好"这类假装理解的话**。原型不知道你问了什么。
 * 3. 发送 → 700ms 后回复，中间显示三个点。这个延迟不是装饰：它让人看到"发出去了、
 *    在等"，而不是"点了没反应"。
 *
 * ⚠️ 不做：流式、正在思考的过程、引用来源、重试。原型不验这些。
 */
export function ChatPanel({
  messages,
  pending,
  onSend,
}: {
  messages: ChatMessage[]
  pending: boolean
  onSend: (text: string) => void
}) {
  const [draft, setDraft] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  /* 新消息进来滚到底。依赖 `pending` 也滚一次 —— 否则"三个点"会停在折线下方。 */
  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages.length, pending])

  const submit = () => {
    const text = draft.trim()
    if (!text || pending) return
    onSend(text)
    setDraft('')
  }

  return (
    <div
      id="activity-chat-panel"
      data-slot="activity-chat-panel"
      className="flex h-full w-full flex-col border-l border-zinc-200/70"
    >
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-zinc-200/70 px-4">
        <span className="text-[12px] text-zinc-500">对话</span>
        <span className="rounded-full bg-zinc-100 px-1.5 py-px text-[10px] text-zinc-500">
          模拟
        </span>
      </div>

      <div ref={listRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.map((message) => (
          <MessageRow key={message.id} message={message} />
        ))}
        {pending ? <TypingDots /> : null}
      </div>

      <div className="shrink-0 border-t border-zinc-200/70 p-3">
        <div className="flex items-end gap-2 rounded-xl border border-zinc-200 bg-white px-2.5 py-2 focus-within:border-zinc-300">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                submit()
              }
            }}
            rows={1}
            placeholder="问一句，或换个方向…"
            aria-label="对话输入"
            className="max-h-24 min-h-5 flex-1 resize-none bg-transparent text-[13px] leading-5 text-zinc-800 outline-none placeholder:text-zinc-400"
          />
          <button
            type="button"
            onClick={submit}
            disabled={!draft.trim() || pending}
            aria-label="发送"
            className={cn(
              'mb-0.5 flex size-6 shrink-0 items-center justify-center rounded-full transition-colors',
              draft.trim() && !pending
                ? 'bg-zinc-900 text-white hover:bg-zinc-700'
                : 'bg-zinc-100 text-zinc-400'
            )}
          >
            <ArrowUp className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

function MessageRow({ message }: { message: ChatMessage }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap rounded-[14px] bg-zinc-100 px-3 py-2 text-[13px] leading-6 text-zinc-800">
          {message.text}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {/* 标注在上方而不是下方：读之前就该知道这是模拟的，而不是读完才发现。 */}
      <p className="text-[10px] tracking-[0.06em] text-zinc-400">模拟回复</p>
      <p className="whitespace-pre-wrap text-[13px] leading-6 text-zinc-700">{message.text}</p>
    </div>
  )
}

function TypingDots() {
  return (
    <div className="flex gap-1" aria-label="正在回复">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 animate-pulse rounded-full bg-zinc-300"
          style={{ animationDelay: `${i * 120}ms` }}
        />
      ))}
    </div>
  )
}
