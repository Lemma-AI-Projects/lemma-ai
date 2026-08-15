import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Ellipsis, Pencil, Plus, Trash2 } from 'lucide-react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
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
import { CourseMainContent } from '@/features/course/CourseMainContent'
import { useCourseCompanionConversationsQuery } from '@/features/course/courseCompanionApi'
import {
  mapLearningCourseToCourseItem,
  useLearningCourseQuery,
} from '@/features/course/courseLearningApi'
import { resolveCourseContent } from '@/features/course/resolveCourseContent'
import {
  type LiveCourseCompanionMessage,
  useCourseCompanionChat,
} from '@/features/course/useCourseCompanionChat'
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

export function CoursePage() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const courseQuery = useLearningCourseQuery(id)
  // Bridge the real course tree onto the existing course-page contract; only the
  // chapter video is backend-backed this step (see courseLearningApi adapter).
  const course = useMemo(
    () =>
      courseQuery.data
        ? mapLearningCourseToCourseItem(courseQuery.data)
        : undefined,
    [courseQuery.data]
  )
  const content = useMemo(
    () => resolveCourseContent(course, location.hash),
    [course, location.hash]
  )
  // Companion is text-first + always on; it carries the CURRENT content node's
  // chapter (any chapter-scoped node: video/overview/quiz/assignment) so the
  // video tool can load that chapter on demand. Unit-scoped nodes -> null (the
  // companion answers text-only). Every turn re-reads it (非粘性).
  const activeChapterId = content?.chapter?.id ?? null
  const [activeConversationId, setActiveConversationId] = useState<
    string | undefined
  >(undefined)
  const [draft, setDraft] = useState('')
  const [historySyncedConversationIds, setHistorySyncedConversationIds] =
    useState<string[]>([])
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [suppressAutoSelect, setSuppressAutoSelect] = useState(false)
  const [seenCourseId, setSeenCourseId] = useState(id)
  if (id !== seenCourseId) {
    setSeenCourseId(id)
    setActiveConversationId(undefined)
    setDraft('')
    setHistorySyncedConversationIds([])
    setSuppressAutoSelect(false)
  }

  const companionConversationsQuery = useCourseCompanionConversationsQuery(id)
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
    courseId: id,
    chapterId: activeChapterId,
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
  // Always available on a course page (text-first); the video is pulled in by
  // the model on demand only when the question needs it.
  const canUseCompanion = Boolean(id)
  const inputPlaceholder = activeChapterId
    ? '问问关于本章的任何问题…'
    : '问问关于本课程的任何问题…'
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
          errorCode={chat.errorCode}
          canRetry={chat.canRetry}
          waitingMessage="正在准备本章视频…"
          onRetry={chat.retry}
          onTopUp={() => navigate('/gotopay')}
        />
      </>
    )
  }

  return (
    <div className="flex h-full gap-2">
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-zinc-200/80 bg-zinc-50">
        {courseQuery.isPending ? (
          <div className="flex h-full items-center justify-center px-4 text-center text-sm text-zinc-400">
            正在加载课程…
          </div>
        ) : courseQuery.isError ? (
          <div className="flex h-full items-center justify-center px-4 text-center text-sm text-zinc-400">
            加载课程失败，请稍后重试
          </div>
        ) : courseQuery.data && courseQuery.data.status !== 'ready' ? (
          // 物料化门禁: a course is only enterable once fully materialized. Non-ready
          // courses are hidden from the sidebar, so this guards direct-URL access.
          <div className="flex h-full items-center justify-center px-4 text-center text-sm text-zinc-400">
            {courseQuery.data.status === 'failed'
              ? '课程准备失败，请重新生成'
              : '课程正在准备中，请稍候…'}
          </div>
        ) : (
          <CourseMainContent course={course} content={content} />
        )}
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
          disabled={!canUseCompanion}
          isStreaming={isBusy}
          onSend={chat.send}
          onStop={chat.stop}
          onValueChange={setDraft}
          placeholder={inputPlaceholder}
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
