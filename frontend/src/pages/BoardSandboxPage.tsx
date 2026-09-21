import { useState } from 'react'
import { ChevronLeft, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { CourseAssistantInput } from '@/features/course/CourseAssistantInput'
import { CourseConversationPills } from '@/features/course/CourseConversationPills'

// [sandbox] board 的独立调试页面；右栏复用学习点页的伴学对话框形态。
export function BoardSandboxPage() {
  const [draft, setDraft] = useState('')
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <div className="flex h-svh overflow-hidden bg-zinc-100 p-2">
      <aside
        className="relative ml-auto flex w-[360px] shrink-0 flex-col rounded-xl border border-zinc-200/80 bg-zinc-50 p-3 transition-transform duration-[280ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] will-change-transform motion-reduce:transition-none"
        style={{
          // 加上页面右侧的 8px 留白，收起后仍露出 24px 的左侧边缘。
          transform: isCollapsed
            ? 'translate3d(calc(100% - 16px), 0, 0)'
            : 'translate3d(0, 0, 0)',
        }}
      >
        {isCollapsed && (
          <button
            type="button"
            aria-label="展开对话框"
            aria-controls="board-chat-content"
            aria-expanded={false}
            onClick={() => setIsCollapsed(false)}
            className="absolute left-0 top-1/2 flex h-16 w-3 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-zinc-300 bg-zinc-50 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
          >
            <ChevronLeft className="size-4 shrink-0 text-zinc-500" strokeWidth={2.25} />
          </button>
        )}
        <div
          id="board-chat-content"
          inert={isCollapsed}
          aria-hidden={isCollapsed}
          className={`flex min-h-0 flex-1 flex-col transition-opacity duration-[120ms] motion-reduce:transition-none ${isCollapsed ? 'opacity-0' : 'opacity-100'}`}
        >
          <div className="-mt-1 flex h-7 shrink-0 items-center gap-2">
            <div className="min-w-0 flex-1">
              <CourseConversationPills conversations={[]} />
            </div>
            <div className="-mr-1 ml-auto flex items-center gap-0.5">
              <Button
                type="button"
                variant="ghost"
                aria-label="Close course chat"
                className="size-6 rounded-full bg-transparent p-0 text-zinc-600 hover:bg-zinc-200/70 hover:text-zinc-900"
                onClick={() => setIsCollapsed(true)}
              >
                <X className="size-3.5" />
              </Button>
            </div>
          </div>

          <div className="scrollbar-fade -mx-1 mt-2 min-h-0 flex-1 overflow-y-auto px-1">
            <div className="flex min-h-full items-center justify-center px-4 py-10 text-center">
              <p className="text-sm text-zinc-400">No conversation yet.</p>
            </div>
          </div>

          <CourseAssistantInput
            className="mt-3 shrink-0"
            isStreaming={false}
            onSend={() => undefined}
            onStop={() => undefined}
            onValueChange={setDraft}
            placeholder="问问关于本节的任何问题…"
            value={draft}
          />
        </div>
      </aside>
    </div>
  )
}
