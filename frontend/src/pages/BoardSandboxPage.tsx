import { Fragment, useState } from 'react'
import { ChevronLeft, LogOut, Settings, Volume2, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { BoardCanvas } from '@/features/board/BoardCanvas'
import { CourseAssistantInput } from '@/features/course/CourseAssistantInput'
import { CourseConversationPills } from '@/features/course/CourseConversationPills'
import { CourseDashboardProgressMarker } from '@/features/course/dashboard/CourseDashboardProgressMarker'

const PROGRESS_PREVIEW_VALUES = [100, 100, 40, 0, 0]
const CHAT_SLIDE_CLASS_NAME =
  'transition-transform duration-[280ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] will-change-transform motion-reduce:transition-none'

// [sandbox] Board 的独立调试页面；右栏复用学习点页的伴学对话框形态。
export function BoardSandboxPage() {
  const [draft, setDraft] = useState('')
  const [isCollapsed, setIsCollapsed] = useState(false)
  // 顶部按钮与对话框共用位移，保持按钮到对话框左边缘的间距。
  const chatSlideStyle = {
    transform: isCollapsed
      ? 'translate3d(calc(var(--board-chat-width) - 16px), 0, 0)'
      : 'translate3d(0, 0, 0)',
  }

  return (
    <div className="relative isolate flex h-svh overflow-hidden bg-zinc-100 p-2 [--board-chat-width:360px]">
      <BoardCanvas />
      <div className="pointer-events-none relative z-10 flex min-w-0 flex-1 flex-col items-start self-stretch pt-6">
        <div className="pointer-events-auto flex w-full items-center gap-3 px-6">
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            aria-label="退出"
            className="size-11 rounded-full border-zinc-200/80 bg-zinc-50 hover:bg-zinc-100"
          >
            <LogOut className="size-5 -scale-x-100" />
          </Button>
          <div className="flex h-11 w-fit items-center rounded-full border border-zinc-200/80 bg-zinc-50 px-5">
            <span className="whitespace-nowrap text-lg font-medium leading-none text-zinc-900">
              Python为何是编程入门优选？
            </span>
          </div>
          <div
            className={`ml-auto flex shrink-0 items-center gap-3 ${CHAT_SLIDE_CLASS_NAME}`}
            style={chatSlideStyle}
          >
            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              aria-label="声音"
              className="size-11 rounded-full border-zinc-200/80 bg-zinc-50 hover:bg-zinc-100"
            >
              <Volume2 className="size-5" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              aria-label="设置"
              className="size-11 rounded-full border-zinc-200/80 bg-zinc-50 hover:bg-zinc-100"
            >
              <Settings className="size-5" />
            </Button>
          </div>
        </div>
        <div className="pointer-events-auto mt-6 ml-6 flex w-11 flex-col items-center" aria-label="学习进度预览">
          {PROGRESS_PREVIEW_VALUES.map((progress, index) => (
            <Fragment key={index}>
              {index > 0 && (
                <div aria-hidden="true" className="h-6 w-px bg-zinc-300" />
              )}
              <CourseDashboardProgressMarker
                label={String(index + 1)}
                progress={progress}
              />
            </Fragment>
          ))}
        </div>
      </div>
      <aside
        className={`relative z-20 ml-auto flex w-[var(--board-chat-width)] shrink-0 flex-col rounded-xl border border-zinc-200/80 bg-zinc-50 p-3 ${CHAT_SLIDE_CLASS_NAME}`}
        style={chatSlideStyle}
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
              <CourseConversationPills
                conversations={[]}
                emptyLabel="Python为何适合编程入门"
              />
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
