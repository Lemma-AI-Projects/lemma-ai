import { useEffect, useMemo, useRef, useState } from 'react'
import { Share2 } from 'lucide-react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ConversationInput } from '@/features/conversation/ConversationInput'
import { ConversationMessageList } from '@/features/conversation/ConversationMessageList'
import { ConversationMoreMenu } from '@/features/conversation/ConversationMoreMenu'
import { ConversationStreamingTurn } from '@/features/conversation/ConversationStreamingTurn'
import { useConversationMessagesQuery } from '@/features/conversation/conversationApi'
import { useProjectsQuery } from '@/features/project/projectApi'
import { isNotFoundError } from '@/lib/apiUtils'
import { createConversationTurns } from '@/features/conversation/createConversationTurns'
import { useConversationChat } from '@/features/conversation/useConversationChat'

interface ConversationLocationState {
  initialMessage?: string
  messageKey?: string
  /** 项目页发起的新会话：直接诞生在该项目里。 */
  projectId?: string
  /** 首页/项目页开启 Course Planning 后带入：本条消息走工具回合。 */
  tool?: 'course_planning'
}

// 模块级防重：StrictMode 双挂载与重渲染下，同一条首页带入的消息只发送一次
let consumedInitialMessageKey: string | null = null

export function ConversationPage() {
  // 可选参数路由 chat/:id?：/chat（新会话态）与 /chat/{id} 共用本组件。
  // 采纳预生成 id 时仅 replace URL，组件不 remount，进行中的流不中断；
  // 切换到其他会话时由 useConversationChat 内部检测 id 变化并重置。
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const [draft, setDraft] = useState('')
  // One-shot per the design: toggling Course Planning applies to the next send,
  // then resets. Page-local UI state (rules 第四章), not server data.
  const [coursePlanningEnabled, setCoursePlanningEnabled] = useState(false)

  const chat = useConversationChat({
    conversationId: id,
    onConversationAdopted: (conversationId) =>
      navigate(`/chat/${conversationId}`, { replace: true }),
    onRestoreDraft: setDraft,
  })

  // 首页输入框带入的初始消息：进入新会话态后自动发出。发送由首页的
  // 点击/回车触发，这里只是跨页面接力；发出前清掉浏览器 history state
  // （绕过 React Router，不触发本组件更新），防止刷新后重发。
  const { send } = chat
  useEffect(() => {
    if (id) return
    const state = location.state as ConversationLocationState | null
    const text = state?.initialMessage?.trim()
    const messageKey = state?.messageKey
    if (!text || !messageKey || consumedInitialMessageKey === messageKey) return
    consumedInitialMessageKey = messageKey
    window.history.replaceState(
      { ...window.history.state, usr: undefined },
      '',
      window.location.href
    )
    send(text, { projectId: state?.projectId, tool: state?.tool })
  }, [id, location.state, send])

  // 本轮自建的会话内存态即完整历史，不启用回填；带 id 进入/刷新时才拉
  const isPersistedConversation = Boolean(id) && id !== chat.selfCreatedId
  const messagesQuery = useConversationMessagesQuery(id, {
    enabled: isPersistedConversation,
  })
  // 「Move to Project」子菜单的目标项目，页面层注入（feature 间不直接引用）
  const projectsQuery = useProjectsQuery()

  // 历史快照与本轮内存增量分别构造 turns 后拼接（不混合排序，
  // 避免服务端与本地时钟偏差导致顺序错乱）
  const turns = useMemo(() => {
    const historyTurns = createConversationTurns(
      `${id ?? 'new'}-history`,
      (messagesQuery.data ?? []).map((message) => ({
        role: message.role,
        message: message.content,
        date: message.createdAt,
        reasoningText: message.reasoningText,
        tool: message.tool,
      }))
    )
    const liveTurns = createConversationTurns(
      `${id ?? 'new'}-live`,
      chat.liveMessages.map((message) => ({
        role: message.role,
        message: message.content,
        date: message.createdAt,
        reasoningText: message.reasoningText,
        tool: message.tool,
      }))
    )
    return [...historyTurns, ...liveTurns]
  }, [id, messagesQuery.data, chat.liveMessages])

  const handleSend = (text: string) => {
    chat.send(
      text,
      coursePlanningEnabled ? { tool: 'course_planning' } : undefined
    )
    // One-shot: the tool applies to this message only.
    if (coursePlanningEnabled) {
      setCoursePlanningEnabled(false)
    }
  }

  const isBusy = chat.status === 'submitted' || chat.status === 'streaming'
  const isLoadingHistory = isPersistedConversation && messagesQuery.isPending
  const isNotFound = messagesQuery.isError && isNotFoundError(messagesQuery.error)
  const isLoadFailed = messagesQuery.isError && !isNotFound

  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (chat.status === 'submitted') {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      })
    }
  }, [chat.status])

  // 流式增量只影响 ConversationStreamingTurn；已定稿的列表不随 delta 重渲染
  const messageList = useMemo(
    () => (turns.length > 0 ? <ConversationMessageList turns={turns} /> : null),
    [turns]
  )

  const renderBody = () => {
    if (isNotFound) {
      return (
        <div className="flex flex-1 items-center justify-center py-10">
          <p className="text-sm text-zinc-400">会话不存在或已删除</p>
        </div>
      )
    }

    if (isLoadFailed) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-10">
          <p className="text-sm text-zinc-400">加载对话失败</p>
          <Button
            type="button"
            variant="outline"
            size="xs"
            className="rounded-full bg-transparent"
            onClick={() => void messagesQuery.refetch()}
          >
            重试
          </Button>
        </div>
      )
    }

    if (isLoadingHistory) {
      return (
        <div className="flex flex-1 items-center justify-center py-10">
          <p className="animate-pulse text-sm text-zinc-400">加载对话…</p>
        </div>
      )
    }

    return (
      <>
        {messageList ?? (
          <div className="flex flex-1 items-center justify-center py-10">
            <p className="text-sm text-zinc-400">No messages yet.</p>
          </div>
        )}
        <ConversationStreamingTurn
          status={chat.status}
          text={chat.streamingText}
          reasoningText={chat.streamingReasoningText}
          errorMessage={chat.errorMessage}
          canRetry={chat.canRetry}
          onRetry={chat.retry}
        />
      </>
    )
  }

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
        <ConversationMoreMenu
          conversationId={id}
          projects={projectsQuery.data ?? []}
          onDeleted={() => navigate('/home')}
        />
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col pt-16">
        <div ref={scrollRef} className="scrollbar-fade min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex min-h-full w-full max-w-[55rem] flex-col px-6 pb-40">
            {renderBody()}
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col">
          <div className="pointer-events-auto relative z-10 px-6">
            <ConversationInput
              className="mx-auto w-full max-w-[52rem]"
              value={draft}
              onValueChange={setDraft}
              isStreaming={isBusy}
              onSend={handleSend}
              onStop={chat.stop}
              coursePlanningEnabled={coursePlanningEnabled}
              onCoursePlanningChange={setCoursePlanningEnabled}
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
