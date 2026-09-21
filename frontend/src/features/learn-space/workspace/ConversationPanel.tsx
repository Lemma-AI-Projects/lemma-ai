import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'

import { ConversationInput } from '@/features/conversation/ConversationInput'
import { ConversationMessageList } from '@/features/conversation/ConversationMessageList'
import { ConversationStreamingTurn } from '@/features/conversation/ConversationStreamingTurn'
import { useConversationMessagesQuery } from '@/features/conversation/conversationApi'
import { createConversationTurns } from '@/features/conversation/createConversationTurns'
import { useConversationChat } from '@/features/conversation/useConversationChat'
import { cn } from '@/lib/utils'

export interface ConversationPanelProps {
  /**
   * 当前 learn space（新会话诞生在它里面）。
   * 可选：`/preview/` 下的纯 mock 预览页没有真实空间，那里聊天不可用 ——
   * 输入框保持禁用并写明原因，而不是给一个发不出去的框。
   */
  projectId?: string
  /** 用于欢迎语里的空间名。 */
  spaceName: string
  /**
   * 面板当前对话的 id；`null` = 新对话。由调用方持有，因为 Space Context
   * 面板（同一屏的左侧）也要知道「现在这轮在哪段对话里」。
   */
  conversationId: string | null
  onConversationChange: (conversationId: string | null) => void
  onClose: () => void
  className?: string
}

/**
 * 右侧对话面板 —— **真的在跑对话**（参考稿里那一版只是把输入接力到 /chat）。
 *
 * 它和 /chat 页面共用同一条链路：`useConversationChat` + `streamChat` + 同一组
 * Conversation* 组件。没有第二套实现，所以「工作台里看到的」和「对话页看到的」
 * 不可能是两回事 —— 包括每条回答下面那条 Agent Context。
 *
 * 空间归属靠 `projectId`：新会话诞生在当前空间里，于是服务端算 Space Context
 * 时不需要任何人额外传话。
 */
export function ConversationPanel({
  projectId,
  spaceName,
  conversationId,
  onConversationChange,
  onClose,
  className,
}: ConversationPanelProps) {
  const [draft, setDraft] = useState('')

  const chat = useConversationChat({
    conversationId: conversationId ?? undefined,
    onConversationAdopted: (id) => onConversationChange(id),
    onRestoreDraft: setDraft,
  })

  // 本轮自建的会话内存态即完整历史，不启用回填；带 id 进来时才拉历史快照。
  const isPersistedConversation =
    Boolean(conversationId) && conversationId !== chat.selfCreatedId
  const messagesQuery = useConversationMessagesQuery(conversationId ?? undefined, {
    enabled: isPersistedConversation,
  })

  const turns = useMemo(() => {
    const historyTurns = createConversationTurns(
      `${conversationId ?? 'new'}-history`,
      (messagesQuery.data ?? []).map((message) => ({
        role: message.role,
        message: message.content,
        date: message.createdAt,
        reasoningText: message.reasoningText,
        tool: message.tool,
        agentContext: message.agentContext,
      }))
    )
    const liveTurns = createConversationTurns(
      `${conversationId ?? 'new'}-live`,
      chat.liveMessages.map((message) => ({
        role: message.role,
        message: message.content,
        date: message.createdAt,
        reasoningText: message.reasoningText,
        tool: message.tool,
        agentContext: message.agentContext,
      }))
    )
    return [...historyTurns, ...liveTurns]
  }, [conversationId, messagesQuery.data, chat.liveMessages])

  const isBusy = chat.status === 'submitted' || chat.status === 'streaming'
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (chat.status === 'submitted') {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      })
    }
  }, [chat.status])

  const handleSend = (text: string) => {
    chat.send(text, { projectId })
  }

  const handleNewConversation = () => {
    chat.stop()
    setDraft('')
    onConversationChange(null)
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
          Global Agent
          <span className="ml-2 text-xs font-normal text-zinc-400">
            在「{spaceName}」里
          </span>
        </h2>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={handleNewConversation}
            aria-label="新对话"
            title="新对话"
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
          >
            <Plus className="size-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-zinc-900/10"
          >
            <X className="size-4" />
          </button>
        </div>
      </header>

      <div ref={scrollRef} className="scrollbar-fade min-h-0 flex-1 overflow-y-auto px-4 pb-2">
        {turns.length === 0 && !isBusy ? (
          <div className="px-1 py-4">
            <p className="text-sm leading-6 text-zinc-800">
              {`我是这个空间的 Global Agent。我能读到「${spaceName}」里的资料，也会在每条回答下面告诉你我看到了什么。`}
            </p>
            <ul className="mt-3 space-y-1.5 text-xs leading-5 text-zinc-500">
              {[
                '这个空间里有哪些资料？',
                '根据我的资料，我现在最应该关注什么？',
                '把这个空间里的内容整理成一个复习顺序。',
              ].map((example) => (
                <li key={example}>
                  <button
                    type="button"
                    onClick={() => handleSend(example)}
                    className="rounded-full border border-zinc-200 px-2.5 py-1 text-left transition-colors hover:bg-zinc-50"
                  >
                    {example}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <ConversationMessageList turns={turns} />
        )}

        <ConversationStreamingTurn
          status={chat.status}
          text={chat.streamingText}
          reasoningText={chat.streamingReasoningText}
          tool={chat.streamingTool}
          errorMessage={chat.errorMessage}
          canRetry={chat.canRetry}
          onRetry={chat.retry}
        />
      </div>

      <div className="shrink-0 p-3">
        {projectId ? (
          <ConversationInput
            value={draft}
            onValueChange={setDraft}
            isStreaming={isBusy}
            onSend={handleSend}
            onStop={chat.stop}
          />
        ) : (
          <div className="flex h-11 items-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-3 text-xs text-zinc-500">
            预览页没有真实空间，聊天不可用。
          </div>
        )}
      </div>
    </aside>
  )
}
