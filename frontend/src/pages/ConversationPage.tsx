import { useEffect, useMemo, useRef } from 'react'
import { Share2 } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ConversationInput } from '@/features/conversation/ConversationInput'
import { ConversationMessageList } from '@/features/conversation/ConversationMessageList'
import { ConversationMoreMenu } from '@/features/conversation/ConversationMoreMenu'
import { ConversationStreamingTurn } from '@/features/conversation/ConversationStreamingTurn'
import { createConversationTurns } from '@/features/conversation/createConversationTurns'
import { getConversationTurns } from '@/features/conversation/getConversationTurns'
import { useConversationChat } from '@/features/conversation/useConversationChat'
import type { ChatApiMessage } from '@/features/conversation/streamChat'
import { chatItems } from '@/mock/chatItems'
import { chatMessages } from '@/mock/chatMessages'

export function ConversationPage() {
  const { id } = useParams<{ id: string }>()

  // key 让切换会话时重置本轮内存中的对话状态（Phase 1 无持久化）
  return <ConversationView key={id ?? 'new'} chatId={id} />
}

function ConversationView({ chatId }: { chatId?: string }) {
  // mock 历史映射成 API 契约形态（message → content，丢弃 date/attachments），
  // 作为本轮对话的种子上下文一并发给后端。
  const seedApiMessages = useMemo<ChatApiMessage[]>(
    () =>
      (chatId ? chatMessages[chatId] ?? [] : []).map((message) => ({
        role: message.role,
        content: message.message,
      })),
    [chatId]
  )

  const { status, liveMessages, streamingText, errorMessage, send, retry, stop } =
    useConversationChat(seedApiMessages)

  const turns = useMemo(() => {
    const mockTurns = getConversationTurns(chatId)
    const liveTurns = createConversationTurns(
      `${chatId ?? 'new'}-live`,
      liveMessages.map((message) => ({
        role: message.role,
        message: message.content,
        date: message.createdAt,
      }))
    )
    return [...mockTurns, ...liveTurns]
  }, [chatId, liveMessages])

  const conversationExists = Boolean(
    chatId && (chatItems.some((item) => item.id === chatId) || turns.length > 0)
  )
  const isBusy = status === 'submitted' || status === 'streaming'

  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (status === 'submitted') {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      })
    }
  }, [status])

  // 流式增量只影响 ConversationStreamingTurn；已定稿的列表不随 delta 重渲染
  const messageList = useMemo(
    () => (turns.length > 0 ? <ConversationMessageList turns={turns} /> : null),
    [turns]
  )

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
        <ConversationMoreMenu />
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col pt-16">
        <div ref={scrollRef} className="scrollbar-fade min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex min-h-full w-full max-w-[55rem] flex-col px-6 pb-40">
            {messageList ?? (
              <div className="flex flex-1 items-center justify-center py-10">
                <p className="text-sm text-zinc-400">
                  {conversationExists
                    ? 'No messages yet.'
                    : `Conversation not found${chatId ? `: ${chatId}` : '.'}`}
                </p>
              </div>
            )}
            <ConversationStreamingTurn
              status={status}
              text={streamingText}
              errorMessage={errorMessage}
              onRetry={retry}
            />
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col">
          <div className="pointer-events-auto relative z-10 px-6">
            <ConversationInput
              className="mx-auto w-full max-w-[52rem]"
              isStreaming={isBusy}
              onSend={send}
              onStop={stop}
            />
          </div>
          {/* Mask sits one layer below the input and is pulled up by the input's
              corner radius (rounded-3xl = 24px), so it fills the transparent
              triangular gaps at the input's bottom-left/right corners while the
              input's white shape still renders the rounded edge on top. */}
          <div aria-hidden className="relative z-0 -mt-6 px-6">
            <div className="mx-auto h-12 w-full max-w-[52rem] bg-zinc-50" />
          </div>
        </div>
      </div>
    </div>
  )
}
