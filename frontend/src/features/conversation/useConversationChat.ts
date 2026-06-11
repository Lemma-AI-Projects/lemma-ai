import { useEffect, useRef, useState } from 'react'

import { supabase } from '@/lib/supabaseClient'
import {
  ChatStreamError,
  streamChat,
  type ChatApiMessage,
} from './streamChat'

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
}

type ConversationChatAction =
  | { type: 'send'; content: string; createdAt: string }
  | { type: 'retry' }
  | { type: 'delta'; text: string }
  | { type: 'done'; createdAt: string }
  | { type: 'abort'; createdAt: string }
  | { type: 'fail'; message: string }

const initialState: ConversationChatState = {
  status: 'idle',
  liveMessages: [],
  streamingText: '',
  errorMessage: null,
}

/** 出错后用户直接发新消息时，把已生成的半截回答先定稿，避免上下文丢失。 */
function commitPartial(state: ConversationChatState, createdAt: string): LiveChatMessage[] {
  if (state.status === 'error' && state.streamingText.length > 0) {
    return [
      ...state.liveMessages,
      { role: 'assistant', content: state.streamingText, createdAt },
    ]
  }
  return state.liveMessages
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
          ...commitPartial(state, action.createdAt),
          { role: 'user', content: action.content, createdAt: action.createdAt },
        ],
        streamingText: '',
        errorMessage: null,
      }
    case 'retry':
      // 丢弃上次的半截回答，重新生成
      return { ...state, status: 'submitted', streamingText: '', errorMessage: null }
    case 'delta':
      return {
        ...state,
        status: 'streaming',
        streamingText: state.streamingText + action.text,
      }
    case 'done':
      return {
        status: 'idle',
        liveMessages:
          state.streamingText.length > 0
            ? [
                ...state.liveMessages,
                {
                  role: 'assistant',
                  content: state.streamingText,
                  createdAt: action.createdAt,
                },
              ]
            : state.liveMessages,
        streamingText: '',
        errorMessage: null,
      }
    case 'abort':
      // 停止生成：保留已收到的文字并定稿
      return {
        status: 'idle',
        liveMessages:
          state.streamingText.length > 0
            ? [
                ...state.liveMessages,
                {
                  role: 'assistant',
                  content: state.streamingText,
                  createdAt: action.createdAt,
                },
              ]
            : state.liveMessages,
        streamingText: '',
        errorMessage: null,
      }
    case 'fail':
      return { ...state, status: 'error', errorMessage: action.message }
  }
}

const chatErrorMessages: Record<string, string> = {
  ai_timeout: '响应超时，请重试',
  ai_rate_limited: '请求太频繁，稍等几秒再试',
  ai_provider_error: 'AI 服务暂时不可用，请重试',
  ai_fallback_exhausted: 'AI 服务暂时不可用，请重试',
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

function toApiMessages(
  seedMessages: ChatApiMessage[],
  liveMessages: LiveChatMessage[]
): ChatApiMessage[] {
  return [
    ...seedMessages,
    ...liveMessages.map(({ role, content }) => ({ role, content })),
  ]
}

/**
 * Phase 1 流式对话状态机：idle → submitted（等首字）→ streaming → idle | error。
 *
 * 对话历史 = seedMessages（页面已有的 mock 历史，已映射成 API 形态）+ 本轮
 * 内存中的 liveMessages，每次请求整段带上。流式过程是瞬态 UI 状态，
 * 留在组件 state，不进 TanStack Query 缓存。
 */
export function useConversationChat(seedMessages: ChatApiMessage[]) {
  const [state, setState] = useState(initialState)
  const stateRef = useRef(initialState)
  const controllerRef = useRef<AbortController | null>(null)
  const requestIdRef = useRef(0)

  const apply = (action: ConversationChatAction): ConversationChatState => {
    const next = reduce(stateRef.current, action)
    stateRef.current = next
    setState(next)
    return next
  }

  const startStream = (history: ChatApiMessage[]) => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    const requestId = ++requestIdRef.current

    void (async () => {
      try {
        await streamChat({
          messages: history,
          signal: controller.signal,
          onDelta: (text) => {
            if (requestIdRef.current === requestId) {
              apply({ type: 'delta', text })
            }
          },
        })
        if (requestIdRef.current === requestId) {
          apply({ type: 'done', createdAt: new Date().toISOString() })
        }
      } catch (error) {
        if (requestIdRef.current !== requestId || isAbortError(error)) {
          return
        }
        if (error instanceof ChatStreamError && error.code === 'invalid_token') {
          // 清掉本地会话，让 RequireAuth 守卫把用户带回登录页
          void supabase.auth.signOut()
        }
        apply({ type: 'fail', message: getChatErrorMessage(error) })
      }
    })()
  }

  const send = (content: string) => {
    const trimmed = content.trim()
    const { status } = stateRef.current
    if (!trimmed || status === 'submitted' || status === 'streaming') {
      return
    }
    const next = apply({
      type: 'send',
      content: trimmed,
      createdAt: new Date().toISOString(),
    })
    startStream(toApiMessages(seedMessages, next.liveMessages))
  }

  const retry = () => {
    if (stateRef.current.status !== 'error') {
      return
    }
    const next = apply({ type: 'retry' })
    startStream(toApiMessages(seedMessages, next.liveMessages))
  }

  const stop = () => {
    const { status } = stateRef.current
    if (status !== 'submitted' && status !== 'streaming') {
      return
    }
    requestIdRef.current += 1
    controllerRef.current?.abort()
    apply({ type: 'abort', createdAt: new Date().toISOString() })
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
    send,
    retry,
    stop,
  }
}
