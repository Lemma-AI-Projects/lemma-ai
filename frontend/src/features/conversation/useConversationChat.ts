import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { supabase } from '@/lib/supabaseClient'
import {
  conversationMessagesQueryKey,
  conversationsQueryKey,
} from './conversationApi'
import { ChatStreamError, streamChat } from './streamChat'

export type ConversationChatStatus = 'idle' | 'submitted' | 'streaming' | 'error'

export interface LiveChatMessage {
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

interface ConversationChatState {
  status: ConversationChatStatus
  liveMessages: LiveChatMessage[]
  streamingText: string
  errorMessage: string | null
  /** 仅首字后出错可一键重试；首字前失败草稿已还原，用户重新发送即重试。 */
  canRetry: boolean
}

type ConversationChatAction =
  | { type: 'send'; content: string; createdAt: string }
  | { type: 'delta'; text: string }
  /** done 与首字后停止共用：已生成内容就是这条消息的最终内容（后端已落库）。 */
  | { type: 'finalize'; createdAt: string }
  /** 首字前停止：整轮未落库，回滚乐观渲染的 user 气泡。 */
  | { type: 'rollback' }
  | { type: 'failBeforeOutput'; message: string }
  | { type: 'failAfterOutput'; message: string; createdAt: string }
  | { type: 'reset' }

const initialState: ConversationChatState = {
  status: 'idle',
  liveMessages: [],
  streamingText: '',
  errorMessage: null,
  canRetry: false,
}

function withoutTrailingUserMessage(messages: LiveChatMessage[]): LiveChatMessage[] {
  return messages.at(-1)?.role === 'user' ? messages.slice(0, -1) : messages
}

function finalizeStreamingText(
  state: ConversationChatState,
  createdAt: string
): LiveChatMessage[] {
  if (state.streamingText.length === 0) {
    return state.liveMessages
  }
  return [
    ...state.liveMessages,
    { role: 'assistant', content: state.streamingText, createdAt },
  ]
}

function reduce(
  state: ConversationChatState,
  action: ConversationChatAction
): ConversationChatState {
  switch (action.type) {
    case 'send':
      return {
        status: 'submitted',
        liveMessages: [
          ...state.liveMessages,
          { role: 'user', content: action.content, createdAt: action.createdAt },
        ],
        streamingText: '',
        errorMessage: null,
        canRetry: false,
      }
    case 'delta':
      return {
        ...state,
        status: 'streaming',
        streamingText: state.streamingText + action.text,
      }
    case 'finalize':
      return {
        status: 'idle',
        liveMessages: finalizeStreamingText(state, action.createdAt),
        streamingText: '',
        errorMessage: null,
        canRetry: false,
      }
    case 'rollback':
      return {
        status: 'idle',
        liveMessages: withoutTrailingUserMessage(state.liveMessages),
        streamingText: '',
        errorMessage: null,
        canRetry: false,
      }
    case 'failBeforeOutput':
      return {
        status: 'error',
        liveMessages: withoutTrailingUserMessage(state.liveMessages),
        streamingText: '',
        errorMessage: action.message,
        canRetry: false,
      }
    case 'failAfterOutput':
      return {
        status: 'error',
        liveMessages: finalizeStreamingText(state, action.createdAt),
        streamingText: '',
        errorMessage: action.message,
        canRetry: true,
      }
    case 'reset':
      return initialState
  }
}

const chatErrorMessages: Record<string, string> = {
  ai_timeout: '响应超时，请重试',
  ai_rate_limited: '请求太频繁，稍等几秒再试',
  ai_provider_error: 'AI 服务暂时不可用，请重试',
  ai_fallback_exhausted: 'AI 服务暂时不可用，请重试',
  conversation_not_found: '会话不存在或已删除',
  stream_interrupted: '连接中断，请重试',
}

function getChatErrorMessage(error: unknown): string {
  if (error instanceof ChatStreamError) {
    const message = chatErrorMessages[error.code]
    if (message) return message
    console.error('chat stream error:', error.code, error.message)
    return '出错了，请重试'
  }
  // fetch 本身失败（后端未启动 / 断网）抛 TypeError
  if (error instanceof TypeError) {
    return '无法连接服务器，请重试'
  }
  console.error('chat stream unexpected error:', error)
  return '发送失败，请重试'
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

interface UseConversationChatOptions {
  /** URL 中的会话 id；新会话态（/chat）为 undefined。 */
  conversationId: string | undefined
  /** 新会话预生成 id 被采纳时触发，调用方应 navigate 替换 URL（不 remount）。 */
  onConversationAdopted: (conversationId: string) => void
  /** 首字前失败/停止时触发，调用方应把文本还原到输入框。 */
  onRestoreDraft: (text: string) => void
}

/**
 * Phase 2 流式对话编排：idle → submitted（等首字）→ streaming → idle | error。
 *
 * - 每次请求只发最新一条 user 消息，历史由服务端按 conversationId 重建。
 * - 新会话：响应头预生成 id 在收到首个 delta（或 done）时采纳；
 *   首字前失败/停止则丢弃该 id（该会话从未存在过），重试不带 id。
 * - 首字后停止/出错：已生成内容后端已落库，定稿为最终消息，不丢弃。
 * - 流式过程是瞬态 UI 状态，留在组件 state；持久数据归 TanStack Query。
 */
export function useConversationChat({
  conversationId,
  onConversationAdopted,
  onRestoreDraft,
}: UseConversationChatOptions) {
  const queryClient = useQueryClient()
  const [state, setState] = useState(initialState)
  /** 本组件生命周期内自建的会话 id；该会话历史就是内存态，不启用回填查询。 */
  const [selfCreatedId, setSelfCreatedId] = useState<string | null>(null)

  const stateRef = useRef(initialState)
  const selfCreatedIdRef = useRef<string | null>(null)
  const controllerRef = useRef<AbortController | null>(null)
  const requestIdRef = useRef(0)
  const hasOutputRef = useRef(false)
  const pendingIdRef = useRef<string | null>(null)
  const lastUserTextRef = useRef<string | null>(null)

  // 流回调跨多次渲染存活，经 ref 始终调用最新的页面回调
  const callbacksRef = useRef({ onConversationAdopted, onRestoreDraft })
  useEffect(() => {
    callbacksRef.current = { onConversationAdopted, onRestoreDraft }
  })

  const apply = (action: ConversationChatAction) => {
    const next = reduce(stateRef.current, action)
    stateRef.current = next
    setState(next)
  }

  const invalidateConversations = () => {
    void queryClient.invalidateQueries({ queryKey: conversationsQueryKey })
  }

  // 会话切换（点侧边栏其他会话 / 回到新会话态）时中止流并重置内存。
  // 采纳跳转（/chat → /chat/{selfCreatedId}）除外：同一轮对话继续。
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
    selfCreatedIdRef.current = null
    // 路由驱动的一次性重置（prev 守卫保证不级联），且必须与上面的
    // abort、下面的缓存清理原子完成，属于该规则的已知误报场景
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelfCreatedId(null)
    // 离开的会话下次进入时重新拉历史快照（本 session 增量只存在于内存）
    if (previousId) {
      queryClient.removeQueries({
        queryKey: conversationMessagesQueryKey(previousId),
      })
    }
    apply({ type: 'reset' })
  }, [conversationId, queryClient])

  const startStream = (content: string, activeConversationId: string | undefined) => {
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
        await streamChat({
          content,
          conversationId: activeConversationId,
          signal: controller.signal,
          onConversationId: (id) => {
            if (requestIdRef.current === requestId) {
              pendingIdRef.current = id
            }
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
        // done 必然意味着本轮已产出内容（后端不变式），保险起见此处也采纳
        adoptPendingId()
        apply({ type: 'finalize', createdAt: new Date().toISOString() })
        invalidateConversations()
      } catch (error) {
        if (requestIdRef.current !== requestId || isAbortError(error)) return
        if (error instanceof ChatStreamError && error.code === 'invalid_token') {
          // 清掉本地会话，让 RequireAuth 守卫把用户带回登录页
          void supabase.auth.signOut()
        }
        const message = getChatErrorMessage(error)
        if (hasOutputRef.current) {
          // 部分回答后端已落库，就是这条消息的最终内容
          apply({
            type: 'failAfterOutput',
            message,
            createdAt: new Date().toISOString(),
          })
        } else {
          // 整轮未落库：回滚 user 气泡、丢弃预生成 id、草稿还原到输入框
          pendingIdRef.current = null
          apply({ type: 'failBeforeOutput', message })
          callbacksRef.current.onRestoreDraft(lastUserTextRef.current ?? content)
        }
        invalidateConversations()
      }
    })()
  }

  const send = (content: string) => {
    const trimmed = content.trim()
    const { status } = stateRef.current
    if (!trimmed || status === 'submitted' || status === 'streaming') {
      return
    }
    lastUserTextRef.current = trimmed
    apply({ type: 'send', content: trimmed, createdAt: new Date().toISOString() })
    startStream(trimmed, conversationId ?? selfCreatedIdRef.current ?? undefined)
  }

  /** 重试 = 同文本的普通新消息（首字后出错场景；上一轮半截已定稿保留）。 */
  const retry = () => {
    if (stateRef.current.status !== 'error') return
    const text = lastUserTextRef.current
    if (!text) return
    send(text)
  }

  const stop = () => {
    const { status } = stateRef.current
    if (status !== 'submitted' && status !== 'streaming') {
      return
    }
    requestIdRef.current += 1
    controllerRef.current?.abort()

    if (hasOutputRef.current) {
      // 吐过首字：会话与半截回答已落库，定稿保留
      apply({ type: 'finalize', createdAt: new Date().toISOString() })
    } else {
      // 首字前停止：后端整轮不落库，回滚气泡、丢弃 id、还原草稿
      const text = lastUserTextRef.current
      pendingIdRef.current = null
      apply({ type: 'rollback' })
      if (text) {
        callbacksRef.current.onRestoreDraft(text)
      }
    }
    invalidateConversations()
  }

  useEffect(() => {
    return () => {
      requestIdRef.current += 1
      controllerRef.current?.abort()
    }
  }, [])

  return {
    status: state.status,
    liveMessages: state.liveMessages,
    streamingText: state.streamingText,
    errorMessage: state.errorMessage,
    canRetry: state.canRetry,
    selfCreatedId,
    send,
    retry,
    stop,
  }
}
