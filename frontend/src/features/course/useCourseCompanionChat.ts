import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { conversationsQueryRootKey } from '@/lib/queryKeys'
import { supabase } from '@/lib/supabaseClient'
import {
  CourseCompanionStreamError,
  streamCourseCompanionChat,
} from './streamCourseCompanionChat'

export type CourseCompanionChatStatus =
  | 'idle'
  | 'submitted'
  | 'preparing'
  | 'streaming'
  | 'error'

export interface LiveCourseCompanionMessage {
  role: 'user' | 'assistant'
  content: string
  reasoningText?: string
  createdAt: string
}

interface CourseCompanionChatState {
  status: CourseCompanionChatStatus
  liveMessages: LiveCourseCompanionMessage[]
  streamingText: string
  streamingReasoningText: string
  errorMessage: string | null
  canRetry: boolean
}

type CourseCompanionChatAction =
  | { type: 'send'; content: string; createdAt: string }
  | { type: 'preparing' }
  | { type: 'delta'; text: string }
  | { type: 'reasoning'; text: string }
  | { type: 'finalize'; createdAt: string }
  | { type: 'rollback' }
  | { type: 'failBeforeOutput'; message: string }
  | { type: 'failAfterOutput'; message: string; createdAt: string }
  | { type: 'reset' }

const initialState: CourseCompanionChatState = {
  status: 'idle',
  liveMessages: [],
  streamingText: '',
  streamingReasoningText: '',
  errorMessage: null,
  canRetry: false,
}

function withoutTrailingUserMessage(
  messages: LiveCourseCompanionMessage[]
): LiveCourseCompanionMessage[] {
  return messages.at(-1)?.role === 'user' ? messages.slice(0, -1) : messages
}

function finalizeStreamingText(
  state: CourseCompanionChatState,
  createdAt: string
): LiveCourseCompanionMessage[] {
  if (state.streamingText.length === 0) {
    return state.liveMessages
  }
  const reasoningText = state.streamingReasoningText.trim()
  return [
    ...state.liveMessages,
    {
      role: 'assistant',
      content: state.streamingText,
      ...(reasoningText ? { reasoningText: state.streamingReasoningText } : {}),
      createdAt,
    },
  ]
}

function reduce(
  state: CourseCompanionChatState,
  action: CourseCompanionChatAction
): CourseCompanionChatState {
  switch (action.type) {
    case 'send':
      return {
        status: 'submitted',
        liveMessages: [
          ...state.liveMessages,
          { role: 'user', content: action.content, createdAt: action.createdAt },
        ],
        streamingText: '',
        streamingReasoningText: '',
        errorMessage: null,
        canRetry: false,
      }
    case 'preparing': {
      const hasStreamContent =
        state.streamingText.length > 0 || state.streamingReasoningText.length > 0
      return {
        ...state,
        status: hasStreamContent ? 'streaming' : 'preparing',
        errorMessage: null,
      }
    }
    case 'delta':
      return {
        ...state,
        status: 'streaming',
        streamingText: state.streamingText + action.text,
      }
    case 'reasoning':
      return {
        ...state,
        status: 'streaming',
        streamingReasoningText: state.streamingReasoningText + action.text,
      }
    case 'finalize':
      return {
        status: 'idle',
        liveMessages: finalizeStreamingText(state, action.createdAt),
        streamingText: '',
        streamingReasoningText: '',
        errorMessage: null,
        canRetry: false,
      }
    case 'rollback':
      return {
        status: 'idle',
        liveMessages: withoutTrailingUserMessage(state.liveMessages),
        streamingText: '',
        streamingReasoningText: '',
        errorMessage: null,
        canRetry: false,
      }
    case 'failBeforeOutput':
      return {
        status: 'error',
        liveMessages: withoutTrailingUserMessage(state.liveMessages),
        streamingText: '',
        streamingReasoningText: '',
        errorMessage: action.message,
        canRetry: false,
      }
    case 'failAfterOutput':
      return {
        status: 'error',
        liveMessages: finalizeStreamingText(state, action.createdAt),
        streamingText: '',
        streamingReasoningText: '',
        errorMessage: action.message,
        canRetry: true,
      }
    case 'reset':
      return initialState
  }
}

const companionErrorMessages: Record<string, string> = {
  ai_timeout: '响应超时，请重试',
  ai_rate_limited: '请求太频繁，稍等几秒再试',
  ai_provider_error: 'AI 服务暂时不可用，请重试',
  ai_fallback_exhausted: 'AI 服务暂时不可用，请重试',
  ai_unsupported_capability: '当前 AI 配置暂不支持视频伴学',
  companion_video_preparing: '视频准备超时，请稍后重试',
  companion_video_failed: '视频解析失败，请稍后重试',
  not_found: '课程、章节或会话不存在',
  chapter_required: '请先打开一个视频章节',
  stream_interrupted: '连接中断，请重试',
}

function getCompanionErrorMessage(error: unknown): string {
  if (error instanceof CourseCompanionStreamError) {
    const message = companionErrorMessages[error.code]
    if (message) return message
    console.error('course companion stream error:', error.code, error.message)
    return '出错了，请重试'
  }
  if (error instanceof TypeError) {
    return '无法连接服务器，请重试'
  }
  console.error('course companion stream unexpected error:', error)
  return '发送失败，请重试'
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

interface UseCourseCompanionChatOptions {
  courseId: string | undefined
  chapterId: string | null
  conversationId: string | undefined
  onConversationAdopted: (conversationId: string) => void
  onRestoreDraft: (text: string) => void
  onTurnSettled?: (conversationId: string) => void
}

export function useCourseCompanionChat({
  courseId,
  chapterId,
  conversationId,
  onConversationAdopted,
  onRestoreDraft,
  onTurnSettled,
}: UseCourseCompanionChatOptions) {
  const queryClient = useQueryClient()
  const [state, setState] = useState(initialState)
  const [selfCreatedId, setSelfCreatedId] = useState<string | null>(null)

  const stateRef = useRef(initialState)
  const selfCreatedIdRef = useRef<string | null>(null)
  const controllerRef = useRef<AbortController | null>(null)
  const requestIdRef = useRef(0)
  const hasOutputRef = useRef(false)
  const pendingIdRef = useRef<string | null>(null)
  const lastUserTextRef = useRef<string | null>(null)
  const lastChapterIdRef = useRef<string | null>(null)
  const callbacksRef = useRef({
    onConversationAdopted,
    onRestoreDraft,
    onTurnSettled,
  })

  useEffect(() => {
    callbacksRef.current = { onConversationAdopted, onRestoreDraft, onTurnSettled }
  })

  const apply = (action: CourseCompanionChatAction) => {
    const next = reduce(stateRef.current, action)
    stateRef.current = next
    setState(next)
  }

  const invalidateConversationLists = () => {
    void queryClient.invalidateQueries({ queryKey: conversationsQueryRootKey })
  }

  const prevConversationIdRef = useRef(conversationId)
  useEffect(() => {
    const previousId = prevConversationIdRef.current
    if (previousId === conversationId) {
      return
    }
    prevConversationIdRef.current = conversationId

    if (conversationId && conversationId === selfCreatedIdRef.current) {
      return
    }

    requestIdRef.current += 1
    controllerRef.current?.abort()
    hasOutputRef.current = false
    pendingIdRef.current = null
    lastUserTextRef.current = null
    lastChapterIdRef.current = null
    selfCreatedIdRef.current = null
    // Conversation switch reset mirrors useConversationChat: the prev-id guard
    // prevents cascades, and the reset must stay atomic with abort/ref cleanup.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelfCreatedId(null)
    apply({ type: 'reset' })
  }, [conversationId])

  const startStream = (
    content: string,
    activeConversationId: string | undefined,
    activeChapterId: string | null
  ) => {
    if (!courseId) {
      return
    }

    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    const requestId = ++requestIdRef.current
    hasOutputRef.current = false
    pendingIdRef.current = null

    const adoptPendingId = () => {
      const pendingId = pendingIdRef.current
      if (!pendingId || activeConversationId || selfCreatedIdRef.current) {
        return
      }
      selfCreatedIdRef.current = pendingId
      setSelfCreatedId(pendingId)
      callbacksRef.current.onConversationAdopted(pendingId)
    }

    void (async () => {
      try {
        await streamCourseCompanionChat({
          courseId,
          chapterId: activeChapterId,
          message: content,
          conversationId: activeConversationId,
          signal: controller.signal,
          onConversationId: (id) => {
            if (requestIdRef.current === requestId) {
              pendingIdRef.current = id
            }
          },
          onPreparing: () => {
            if (requestIdRef.current !== requestId) return
            apply({ type: 'preparing' })
          },
          onReasoning: (text) => {
            if (requestIdRef.current !== requestId) return
            apply({ type: 'reasoning', text })
          },
          onDelta: (text) => {
            if (requestIdRef.current !== requestId) return
            if (!hasOutputRef.current) {
              hasOutputRef.current = true
              adoptPendingId()
            }
            apply({ type: 'delta', text })
          },
        })
        if (requestIdRef.current !== requestId) return
        if (hasOutputRef.current) {
          const settledConversationId =
            activeConversationId ??
            pendingIdRef.current ??
            selfCreatedIdRef.current
          adoptPendingId()
          apply({ type: 'finalize', createdAt: new Date().toISOString() })
          if (settledConversationId) {
            callbacksRef.current.onTurnSettled?.(settledConversationId)
          }
        } else {
          pendingIdRef.current = null
          apply({ type: 'rollback' })
          callbacksRef.current.onRestoreDraft(lastUserTextRef.current ?? content)
        }
        invalidateConversationLists()
      } catch (error) {
        if (requestIdRef.current !== requestId || isAbortError(error)) return
        if (
          error instanceof CourseCompanionStreamError &&
          error.code === 'invalid_token'
        ) {
          void supabase.auth.signOut({ scope: 'local' })
        }
        const message = getCompanionErrorMessage(error)
        if (hasOutputRef.current) {
          const settledConversationId =
            activeConversationId ??
            pendingIdRef.current ??
            selfCreatedIdRef.current
          apply({
            type: 'failAfterOutput',
            message,
            createdAt: new Date().toISOString(),
          })
          if (settledConversationId) {
            callbacksRef.current.onTurnSettled?.(settledConversationId)
          }
        } else {
          pendingIdRef.current = null
          apply({ type: 'failBeforeOutput', message })
          callbacksRef.current.onRestoreDraft(lastUserTextRef.current ?? content)
        }
        invalidateConversationLists()
      }
    })()
  }

  const send = (content: string) => {
    const trimmed = content.trim()
    const { status } = stateRef.current
    if (
      !trimmed ||
      !courseId ||
      !chapterId ||
      status === 'submitted' ||
      status === 'preparing' ||
      status === 'streaming'
    ) {
      return
    }

    lastUserTextRef.current = trimmed
    lastChapterIdRef.current = chapterId
    apply({ type: 'send', content: trimmed, createdAt: new Date().toISOString() })
    const activeConversationId =
      conversationId ?? selfCreatedIdRef.current ?? undefined
    startStream(trimmed, activeConversationId, chapterId)
  }

  const retry = () => {
    if (stateRef.current.status !== 'error') return
    const text = lastUserTextRef.current
    if (!text) return
    apply({ type: 'send', content: text, createdAt: new Date().toISOString() })
    const activeConversationId =
      conversationId ?? selfCreatedIdRef.current ?? undefined
    startStream(text, activeConversationId, lastChapterIdRef.current ?? chapterId)
  }

  const stop = () => {
    const { status } = stateRef.current
    if (
      status !== 'submitted' &&
      status !== 'preparing' &&
      status !== 'streaming'
    ) {
      return
    }
    requestIdRef.current += 1
    controllerRef.current?.abort()

    if (hasOutputRef.current) {
      const settledConversationId =
        conversationId ?? selfCreatedIdRef.current ?? pendingIdRef.current
      apply({ type: 'finalize', createdAt: new Date().toISOString() })
      if (settledConversationId) {
        callbacksRef.current.onTurnSettled?.(settledConversationId)
      }
    } else {
      const text = lastUserTextRef.current
      pendingIdRef.current = null
      apply({ type: 'rollback' })
      if (text) {
        callbacksRef.current.onRestoreDraft(text)
      }
    }
    invalidateConversationLists()
  }

  useEffect(() => {
    return () => {
      callbacksRef.current = {
        onConversationAdopted: () => undefined,
        onRestoreDraft: () => undefined,
        onTurnSettled: () => undefined,
      }
    }
  }, [])

  return {
    status: state.status,
    liveMessages: state.liveMessages,
    streamingText: state.streamingText,
    streamingReasoningText: state.streamingReasoningText,
    errorMessage: state.errorMessage,
    canRetry: state.canRetry,
    selfCreatedId,
    send,
    retry,
    stop,
  }
}
