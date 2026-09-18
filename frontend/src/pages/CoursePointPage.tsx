import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Ellipsis, Pencil, Plus, Trash2 } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'

import { ActionMenu, ActionMenuItem } from '@/components/ActionMenu'
import { Button } from '@/components/ui/button'
import { ConversationMessageList } from '@/features/conversation/ConversationMessageList'
import { ConversationStreamingTurn } from '@/features/conversation/ConversationStreamingTurn'
import {
  type ConversationMessage,
  conversationMessagesQueryKey,
  useConversationMessagesQuery,
  useDeleteConversationMutation,
} from '@/features/conversation/conversationApi'
import { createConversationTurns } from '@/features/conversation/createConversationTurns'
import { RenameConversationDialog } from '@/features/conversation/RenameConversationDialog'
import { CourseAssistantInput } from '@/features/course/CourseAssistantInput'
import { CourseConversationPills } from '@/features/course/CourseConversationPills'
import { useCourseCompanionConversationsQuery } from '@/features/course/courseCompanionApi'
import { flattenPoints } from '@/features/course/courseApi'
import { CourseStatusNotice } from '@/features/course/CourseStatusNotice'
import { getCourseNoticeMessage } from '@/features/course/getCourseNoticeMessage'
import { CoursePointVideo } from '@/features/course/point/CoursePointVideo'
import {
  type LiveCourseCompanionMessage,
  useCourseCompanionChat,
} from '@/features/course/useCourseCompanionChat'
import { useCourseDetailQuery } from '@/hooks/useCourseDetail'
import { isNotFoundError } from '@/lib/apiUtils'

const HISTORY_REFETCH_DELAY_MS = 700

const courseConversationListClassName = [
  'gap-5 py-4',
  "[&_[data-role='user']]:max-w-[86%]",
  "[&_[data-slot='conversation-text-block']]:rounded-[18px]",
  "[&_[data-slot='conversation-text-block']]:px-3.5",
  "[&_[data-slot='conversation-text-block']]:py-2.5",
  "[&_[data-slot='conversation-text-block']]:text-[14.5px]",
  "[&_[data-slot='conversation-text-block']]:font-normal",
  "[&_[data-slot='conversation-text-block']]:leading-[23px]",
  "[&_[data-role='assistant']]:text-sm",
  "[&_[data-role='assistant']_p]:mt-[2px]",
  "[&_[data-role='assistant']_p]:leading-[18px]",
  "[&_[data-role='assistant']_ul]:mt-[2px]",
  "[&_[data-role='assistant']_ol]:mt-[2px]",
  "[&_[data-role='assistant']_li]:leading-[22px]",
  "[&_[data-streamdown='heading-2']]:text-xl",
  "[&_[data-streamdown='heading-3']]:text-base",
].join(' ')

function historyEndsWithLiveMessages(
  history: ConversationMessage[] | undefined,
  liveMessages: LiveCourseCompanionMessage[]
) {
  if (liveMessages.length === 0) {
    return true
  }
  if (!history || history.length < liveMessages.length) {
    return false
  }

  const historySuffix = history.slice(history.length - liveMessages.length)
  return liveMessages.every((liveMessage, index) => {
    const historyMessage = historySuffix[index]
    return (
      historyMessage.role === liveMessage.role &&
      historyMessage.content === liveMessage.content
    )
  })
}

export function CoursePointPage() {
  const { courseId, pointId } = useParams<{
    courseId: string
    pointId: string
  }>()
  const queryClient = useQueryClient()
  const courseQuery = useCourseDetailQuery(courseId)
  const points = useMemo(
    () => flattenPoints(courseQuery.data),
    [courseQuery.data]
  )
  const currentIndex = points.findIndex((point) => point.id === pointId)
  const current = currentIndex >= 0 ? points[currentIndex] : undefined
  const previousPoint = currentIndex > 0 ? points[currentIndex - 1] : undefined
  const nextPoint =
    currentIndex >= 0 && currentIndex + 1 < points.length
      ? points[currentIndex + 1]
      : undefined

  // The companion is text-first + always on; it carries the CURRENT learning
  // point so the video tool can load that video on demand. Every turn re-reads
  // it (非粘性).
  const [activeConversationId, setActiveConversationId] = useState<
    string | undefined
  >(undefined)
  const [draft, setDraft] = useState('')
  const [historySyncedConversationIds, setHistorySyncedConversationIds] =
    useState<string[]>([])
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [suppressAutoSelect, setSuppressAutoSelect] = useState(false)
  const [seenCourseId, setSeenCourseId] = useState(courseId)
  if (courseId !== seenCourseId) {
    setSeenCourseId(courseId)
    setActiveConversationId(undefined)
    setDraft('')
    setHistorySyncedConversationIds([])
    setSuppressAutoSelect(false)
  }

  const companionConversationsQuery =
    useCourseCompanionConversationsQuery(courseId)
  const companionConversations = useMemo(
    () => companionConversationsQuery.data ?? [],
    [companionConversationsQuery.data]
  )
  const deleteConversationMutation = useDeleteConversationMutation()
  const handleTurnSettled = useCallback(
    (conversationId: string) => {
      window.setTimeout(() => {
        setHistorySyncedConversationIds((current) =>
          current.includes(conversationId)
            ? current
            : [...current, conversationId]
        )
        void queryClient.invalidateQueries({
          queryKey: conversationMessagesQueryKey(conversationId),
        })
      }, HISTORY_REFETCH_DELAY_MS)
    },
    [queryClient]
  )
  const chat = useCourseCompanionChat({
    courseId,
    pointId: pointId ?? null,
    conversationId: activeConversationId,
    onConversationAdopted: (conversationId) => {
      setSuppressAutoSelect(true)
      setActiveConversationId(conversationId)
    },
    onRestoreDraft: setDraft,
    onTurnSettled: handleTurnSettled,
  })

  const autoSelectedConversationId =
    !activeConversationId &&
    !suppressAutoSelect &&
    chat.status === 'idle' &&
    companionConversations.length > 0
      ? companionConversations[0].id
      : undefined
  if (autoSelectedConversationId) {
    setActiveConversationId(autoSelectedConversationId)
  }
  const selectedConversationId =
    activeConversationId ?? autoSelectedConversationId
  const activeConversation = companionConversations.find(
    (conversation) => conversation.id === selectedConversationId
  )

  const shouldLoadPersistedMessages =
    Boolean(selectedConversationId) &&
    (selectedConversationId !== chat.selfCreatedId ||
      historySyncedConversationIds.includes(selectedConversationId))
  const messagesQuery = useConversationMessagesQuery(selectedConversationId, {
    enabled: shouldLoadPersistedMessages,
  })

  const previousConversationIdRef = useRef(activeConversationId)
  useEffect(() => {
    const previousId = previousConversationIdRef.current
    if (previousId && previousId !== selectedConversationId) {
      queryClient.removeQueries({
        queryKey: conversationMessagesQueryKey(previousId),
      })
    }
    previousConversationIdRef.current = selectedConversationId
  }, [selectedConversationId, queryClient])

  const turns = useMemo(() => {
    const liveMessagesAreHistoryBacked = historyEndsWithLiveMessages(
      messagesQuery.data,
      chat.liveMessages
    )
    const historyTurns = createConversationTurns(
      `${selectedConversationId ?? 'new'}-history`,
      (messagesQuery.data ?? []).map((message) => ({
        role: message.role,
        message: message.content,
        date: message.createdAt,
        reasoningText: message.reasoningText,
        tool: message.tool,
      }))
    )
    const liveTurns = createConversationTurns(
      `${selectedConversationId ?? 'new'}-live`,
      (liveMessagesAreHistoryBacked ? [] : chat.liveMessages).map((message) => ({
        role: message.role,
        message: message.content,
        date: message.createdAt,
        reasoningText: message.reasoningText,
        tool: message.tool,
      }))
    )
    return [...historyTurns, ...liveTurns]
  }, [selectedConversationId, messagesQuery.data, chat.liveMessages])

  const isBusy =
    chat.status === 'submitted' ||
    chat.status === 'preparing' ||
    chat.status === 'streaming'
  const isLoadingHistory =
    shouldLoadPersistedMessages &&
    messagesQuery.isPending &&
    chat.liveMessages.length === 0
  const isConversationNotFound =
    messagesQuery.isError && isNotFoundError(messagesQuery.error)
  const isHistoryLoadFailed = messagesQuery.isError && !isConversationNotFound
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (chat.status !== 'idle') {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      })
    }
  }, [chat.status, chat.streamingText, chat.streamingReasoningText])

  const messageList = useMemo(
    () =>
      turns.length > 0 ? (
        <ConversationMessageList
          turns={turns}
          className={courseConversationListClassName}
        />
      ) : null,
    [turns]
  )

  const handleNewConversation = () => {
    chat.stop()
    setSuppressAutoSelect(true)
    setActiveConversationId(undefined)
    setDraft('')
    setRenameDialogOpen(false)
  }

  const handleSelectConversation = (conversationId: string) => {
    setSuppressAutoSelect(true)
    setActiveConversationId(conversationId)
  }

  const handleDeleteConversation = () => {
    if (!activeConversationId) return
    deleteConversationMutation.mutate(
      { conversationId: activeConversationId },
      {
        onSuccess: () => {
          setSuppressAutoSelect(true)
          setActiveConversationId(undefined)
          setDraft('')
          setRenameDialogOpen(false)
        },
        onError: (error) =>
          console.error('Failed to delete course companion conversation', error),
      }
    )
  }

  const renderConversationBody = () => {
    if (isConversationNotFound) {
      return (
        <div className="flex min-h-full items-center justify-center px-4 py-10 text-center">
          <p className="text-sm text-zinc-400">会话不存在或已删除</p>
        </div>
      )
    }

    if (isHistoryLoadFailed) {
      return (
        <div className="flex min-h-full flex-col items-center justify-center gap-3 px-4 py-10 text-center">
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
        <div className="flex min-h-full items-center justify-center px-4 py-10 text-center">
          <p className="animate-pulse text-sm text-zinc-400">加载对话…</p>
        </div>
      )
    }

    return (
      <>
        {messageList ??
          (chat.status === 'idle' ? (
            <div className="flex min-h-full items-center justify-center px-4 py-10 text-center">
              <p className="text-sm text-zinc-400">
                {activeConversationId ? 'No messages yet.' : 'No conversation yet.'}
              </p>
            </div>
          ) : null)}
        <ConversationStreamingTurn
          status={chat.status}
          text={chat.streamingText}
          reasoningText={chat.streamingReasoningText}
          tool={chat.streamingTool}
          errorMessage={chat.errorMessage}
          canRetry={chat.canRetry}
          waitingMessage="正在准备本节视频…"
          onRetry={chat.retry}
        />
      </>
    )
  }

  const notice = getCourseNoticeMessage({
    isPending: courseQuery.isPending,
    isNotFound: courseQuery.isError && isNotFoundError(courseQuery.error),
    isError: courseQuery.isError,
    status: courseQuery.data?.status,
  })
  if (notice !== null) {
    return <CourseStatusNotice message={notice} />
  }
  if (!courseId || !pointId || !current) {
    return <CourseStatusNotice message="学习点不存在或已删除" />
  }

  return (
    <div className="flex h-full gap-2">
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-zinc-200/80 bg-zinc-50">
        <div className="scrollbar-fade h-full min-h-0 overflow-y-auto px-4 pb-14 pt-8">
          <article className="mx-auto w-full max-w-[1040px]">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="-ml-2 h-8 rounded-full px-2.5 text-[13px] font-normal text-zinc-500 hover:bg-zinc-200/70 hover:text-zinc-900"
            >
              <Link to={`/courses/${courseId}`}>
                <ArrowLeft className="size-3.5" />
                返回课程
              </Link>
            </Button>
            <p className="mt-3 text-[13px] leading-5 text-zinc-500">
              {current.moduleTitle} · {current.lessonTitle}
            </p>
            <h1 className="mt-1 text-[32px] font-semibold leading-10 tracking-tight text-zinc-950">
              {current.title}
            </h1>

            <CoursePointVideo
              courseId={courseId}
              pointId={pointId}
              title={current.title}
            />

            <div className="mt-6 flex items-center justify-between gap-4">
              {previousPoint ? (
                <Button
                  asChild
                  variant="outline"
                  className="h-9 rounded-full border-zinc-300 bg-transparent px-4 font-normal text-zinc-700 hover:bg-accent hover:text-accent-foreground"
                >
                  <Link to={`/courses/${courseId}/points/${previousPoint.id}`}>
                    上一个学习点
                  </Link>
                </Button>
              ) : (
                <span />
              )}
              {nextPoint ? (
                <Button
                  asChild
                  className="h-auto rounded-full bg-zinc-950 px-[16px] py-[6px] text-[15px] font-normal text-white hover:bg-zinc-800"
                >
                  <Link to={`/courses/${courseId}/points/${nextPoint.id}`}>
                    下一个学习点
                  </Link>
                </Button>
              ) : (
                <Button
                  asChild
                  variant="outline"
                  className="h-9 rounded-full border-zinc-300 bg-transparent px-4 font-normal text-zinc-700 hover:bg-accent hover:text-accent-foreground"
                >
                  <Link to={`/courses/${courseId}`}>回到课程</Link>
                </Button>
              )}
            </div>
          </article>
        </div>
      </main>
      <aside className="flex w-82 shrink-0 flex-col rounded-md border border-zinc-200/80 bg-zinc-50 p-3">
        <div className="-mt-1 flex h-7 shrink-0 items-center gap-2">
          <div className="min-w-0 flex-1">
            <CourseConversationPills
              activeConversationId={activeConversationId}
              conversations={companionConversations}
              isError={companionConversationsQuery.isError}
              isLoading={companionConversationsQuery.isPending}
              onSelectConversation={handleSelectConversation}
            />
          </div>
          <div className="-mr-1 ml-auto flex items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              aria-label="New course chat"
              className="size-6 rounded-full bg-transparent p-0 text-zinc-600 hover:bg-zinc-200/70 hover:text-zinc-900"
              onClick={handleNewConversation}
            >
              <Plus className="size-3.5" />
            </Button>
            {activeConversationId ? (
              <ActionMenu
                width="sm"
                trigger={
                  <Button
                    type="button"
                    variant="ghost"
                    aria-label="Course chat actions"
                    className="size-6 rounded-full bg-transparent p-0 text-zinc-600 hover:bg-zinc-200/70 hover:text-zinc-900"
                  >
                    <Ellipsis className="size-3.5" />
                  </Button>
                }
              >
                <ActionMenuItem
                  icon={Pencil}
                  label="Rename"
                  disabled={isBusy}
                  onSelect={() => setRenameDialogOpen(true)}
                />
                <ActionMenuItem
                  icon={Trash2}
                  label="Delete"
                  destructive
                  disabled={isBusy || deleteConversationMutation.isPending}
                  onSelect={handleDeleteConversation}
                />
              </ActionMenu>
            ) : null}
          </div>
        </div>
        <div
          ref={scrollRef}
          className="scrollbar-fade -mx-1 mt-2 min-h-0 flex-1 overflow-y-auto px-1"
        >
          {renderConversationBody()}
        </div>
        <CourseAssistantInput
          className="mt-3 shrink-0"
          isStreaming={isBusy}
          onSend={chat.send}
          onStop={chat.stop}
          onValueChange={setDraft}
          placeholder="问问关于本节的任何问题…"
          value={draft}
        />
      </aside>
      {activeConversationId ? (
        <RenameConversationDialog
          key={`${activeConversationId}-${activeConversation?.title ?? ''}`}
          open={renameDialogOpen}
          onOpenChange={setRenameDialogOpen}
          conversationId={activeConversationId}
          initialTitle={activeConversation?.title ?? ''}
        />
      ) : null}
    </div>
  )
}
