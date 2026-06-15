import { useMemo, useRef, useState } from 'react'
import { Ellipsis, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConversationInput } from '@/features/conversation/ConversationInput'
import { ConversationMessageList } from '@/features/conversation/ConversationMessageList'
import { ConversationStreamingTurn } from '@/features/conversation/ConversationStreamingTurn'
import { createConversationTurns } from '@/features/conversation/createConversationTurns'
import type { ConversationTurn } from '@/features/conversation/types'
import { conversationSandboxMessages } from '@/mock/conversationSandbox'

const sandboxToolTurn: ConversationTurn = {
  id: 'conversation-sandbox-tool',
  role: 'assistant',
  createdAt: '2026-06-15T09:00:01.000Z',
  attachments: [],
  blocks: [
    {
      id: 'conversation-sandbox-tool-block',
      type: 'tool',
      title: '微积分入门课程',
      progress: 24,
      units: [
        {
          id: 'calculus-foundations',
          title: '单元一：函数、极限与连续',
          status: 'completed',
          progress: 100,
          chapters: [
            {
              id: 'functions-and-graphs',
              title: '函数与图像',
              status: 'completed',
              progress: 100,
            },
            {
              id: 'limits-and-continuity',
              title: '极限与连续性的直观理解',
              status: 'completed',
              progress: 100,
            },
          ],
        },
        {
          id: 'calculus-derivatives',
          title: '单元二：导数与变化率',
          status: 'in-progress',
          progress: 50,
          chapters: [
            {
              id: 'derivative-definition',
              title: '导数的定义与几何意义',
              status: 'completed',
              progress: 100,
            },
            {
              id: 'derivative-rules',
              title: '常见函数的求导法则',
              status: 'in-progress',
              progress: 50,
            },
          ],
        },
        {
          id: 'calculus-integrals',
          title: '单元三：积分与累积',
          status: 'not-started',
          progress: 0,
          chapters: [
            {
              id: 'definite-integrals',
              title: '定积分与面积',
              status: 'not-started',
              progress: 0,
            },
            {
              id: 'fundamental-theorem',
              title: '微积分基本定理',
              status: 'not-started',
              progress: 0,
            },
          ],
        },
      ],
    },
  ],
}

// [sandbox] 临时会话组件调试页，开发完成后可删除本文件及对应 mock、路由和侧边栏入口。
export function ConversationSandboxPage() {
  const [draft, setDraft] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const turns = useMemo(
    () => [
      ...createConversationTurns(
        'conversation-sandbox',
        conversationSandboxMessages
      ),
      sandboxToolTurn,
    ],
    []
  )
  const messageList = useMemo(
    () => <ConversationMessageList turns={turns} />,
    [turns]
  )

  // [sandbox] 仅保留真实会话输入框的交互外壳，不请求、不流式、不持久化。
  const handleSend = () => undefined
  const handleStop = () => undefined

  return (
    <div className="relative flex h-full flex-col rounded-md border border-zinc-200/80 bg-zinc-50">
      <div className="absolute right-3.75 top-3.75 z-10 flex items-center gap-2.75">
        <Button
          variant="outline"
          aria-label="Share conversation"
          className="size-[34px] rounded-full bg-transparent p-0 hover:bg-muted"
        >
          <Share2 className="size-4" />
        </Button>
        <Button
          variant="outline"
          aria-label="More actions"
          className="size-[34px] rounded-full bg-transparent p-0 hover:bg-muted"
        >
          <Ellipsis className="size-4" />
        </Button>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col pt-16">
        <div
          ref={scrollRef}
          className="scrollbar-fade min-h-0 flex-1 overflow-y-auto"
        >
          <div className="mx-auto flex min-h-full w-full max-w-[55rem] flex-col px-6 pb-40">
            {messageList}
            <ConversationStreamingTurn
              status="idle"
              text=""
              errorMessage={null}
              canRetry={false}
              onRetry={handleSend}
            />
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col">
          <div className="pointer-events-auto relative z-10 px-6">
            <ConversationInput
              className="mx-auto w-full max-w-[52rem]"
              value={draft}
              onValueChange={setDraft}
              isStreaming={false}
              onSend={handleSend}
              onStop={handleStop}
            />
          </div>
          {/* [sandbox] 与真实会话页一致的输入框底部遮罩，删除沙盒时一并移除。 */}
          <div aria-hidden className="relative z-0 -mt-6 px-6">
            <div className="mx-auto h-12 w-full max-w-[52rem] bg-zinc-50" />
          </div>
        </div>
      </div>
    </div>
  )
}
