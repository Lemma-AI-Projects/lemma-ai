import { env } from '@/lib/env'
import { supabase } from '@/lib/supabaseClient'
import type { ConversationToolRef } from './types'

export interface ChatStreamUsage {
  inputTokens: number | null
  outputTokens: number | null
  totalTokens: number | null
}

export class ChatStreamError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'ChatStreamError'
    this.code = code
  }
}

export interface StreamChatOptions {
  /** 最新一条 user 消息。历史由服务端按 conversationId 从库中重建。 */
  content: string
  /** 续聊时携带；新会话整个字段省略（不要传 null）。 */
  conversationId?: string
  /** 新会话直接诞生在该项目里；conversationId 存在时无意义，不发送。 */
  projectId?: string
  /** 本轮启用的工具（输入菜单开关）；省略则是普通文本回合。 */
  tool?: ConversationToolRef['type']
  signal: AbortSignal
  /**
   * 新会话时后端通过响应头 X-Conversation-Id 返回预生成 id，
   * 在消费流之前触发。是否采纳由调用方按首字规则决定。
   */
  onConversationId?: (id: string) => void
  onDelta: (text: string) => void
  onReasoning?: (text: string) => void
  onUsage?: (usage: ChatStreamUsage) => void
  /** 工具回合：引导语流式输出后，后端发来一个 tool 事件挂载工具卡片。 */
  onTool?: (tool: ConversationToolRef) => void
}

/**
 * POST /api/v1/chat 的 SSE 流式客户端。
 *
 * 此接口不能走 lib/apiClient（axios 拿不到流式增量），也不能用
 * EventSource（仅支持 GET 且无法带 Authorization 头），因此单独用
 * fetch + getReader 实现。普通 JSON 接口仍一律走 apiClient。
 *
 * 正常返回即收到 done 事件；error 事件抛 ChatStreamError；
 * 调用方 abort 时抛 AbortError。
 */
export async function streamChat(options: StreamChatOptions): Promise<void> {
  const {
    content,
    conversationId,
    projectId,
    tool,
    signal,
    onConversationId,
    onDelta,
    onReasoning,
    onUsage,
    onTool,
  } = options

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    throw new ChatStreamError('invalid_token', 'No active Supabase session')
  }

  // 路径精确为 /api/v1/chat，结尾不加斜杠（避免 307 重定向丢请求头）。
  const response = await fetch(
    `${env.apiBaseUrl.replace(/\/+$/, '')}/api/v1/chat`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        ...(conversationId ? { conversationId } : {}),
        ...(!conversationId && projectId ? { projectId } : {}),
        ...(tool ? { tool } : {}),
        messages: [{ role: 'user', content }],
      }),
      signal,
    }
  )

  if (!response.ok) {
    throw await toStreamError(response)
  }

  const headerConversationId = response.headers.get('X-Conversation-Id')
  if (headerConversationId) {
    onConversationId?.(headerConversationId)
  }

  if (!response.body) {
    throw new ChatStreamError('stream_interrupted', 'Response has no readable body')
  }

  await consumeSseStream(response.body, { onDelta, onReasoning, onUsage, onTool })
}

/**
 * 业务错误（invalid_token / conversation_not_found）以 detail 字符串
 * 承载，直接作为错误码；其余（如 422 校验数组）归为 http_<status>。
 */
async function toStreamError(response: Response): Promise<ChatStreamError> {
  let detail: unknown
  try {
    const body: unknown = await response.json()
    if (body !== null && typeof body === 'object' && 'detail' in body) {
      detail = (body as { detail: unknown }).detail
    }
  } catch {
    // 非 JSON 响应体，退回状态码描述
  }

  if (typeof detail === 'string' && detail.length > 0) {
    return new ChatStreamError(detail, detail)
  }

  return new ChatStreamError(
    `http_${response.status}`,
    detail !== undefined ? JSON.stringify(detail) : `HTTP ${response.status}`
  )
}

interface SseFrame {
  event: string
  data: string
}

function parseSseFrame(frame: string): SseFrame | null {
  let event = 'message'
  const dataLines: string[] = []

  for (const line of frame.split(/\r?\n/)) {
    if (line.startsWith(':')) continue
    if (line.startsWith('event:')) {
      event = line.slice('event:'.length).trim()
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice('data:'.length).trimStart())
    }
  }

  if (dataLines.length === 0) {
    return null
  }

  return { event, data: dataLines.join('\n') }
}

async function consumeSseStream(
  body: ReadableStream<Uint8Array>,
  handlers: Pick<
    StreamChatOptions,
    'onDelta' | 'onReasoning' | 'onUsage' | 'onTool'
  >
): Promise<void> {
  const reader = body.getReader()
  // 中文等多字节字符可能被网络分块从中间切断，必须用 stream 模式增量解码。
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let finished = false

  const handleFrame = (frame: string) => {
    const parsed = parseSseFrame(frame)
    if (!parsed) return

    switch (parsed.event) {
      case 'delta': {
        const payload = JSON.parse(parsed.data) as { text?: string }
        if (typeof payload.text === 'string' && payload.text.length > 0) {
          handlers.onDelta(payload.text)
        }
        return
      }
      case 'reasoning': {
        const payload = JSON.parse(parsed.data) as { text?: string }
        if (typeof payload.text === 'string' && payload.text.length > 0) {
          handlers.onReasoning?.(payload.text)
        }
        return
      }
      case 'usage': {
        handlers.onUsage?.(JSON.parse(parsed.data) as ChatStreamUsage)
        return
      }
      case 'tool': {
        handlers.onTool?.(JSON.parse(parsed.data) as ConversationToolRef)
        return
      }
      case 'done': {
        finished = true
        return
      }
      case 'error': {
        const payload = JSON.parse(parsed.data) as {
          code?: string
          message?: string
        }
        throw new ChatStreamError(
          payload.code ?? 'ai_error',
          payload.message ?? 'AI stream failed'
        )
      }
      default:
        // 未知事件（如未来的 tool_call）直接忽略
        return
    }
  }

  try {
    while (!finished) {
      const { done, value } = await reader.read()

      if (done) {
        buffer += decoder.decode()
        break
      }

      buffer += decoder.decode(value, { stream: true })

      // SSE 事件块之间以空行分隔；最后一段可能不完整，留在 buffer 等下一块。
      const frames = buffer.split(/\r?\n\r?\n/)
      buffer = frames.pop() ?? ''

      for (const frame of frames) {
        handleFrame(frame)
        if (finished) break
      }
    }

    if (!finished && buffer.trim().length > 0) {
      handleFrame(buffer)
    }

    if (!finished) {
      // 没等到 done/error 流就断了（如后端进程被杀）
      throw new ChatStreamError('stream_interrupted', 'Stream ended before done event')
    }
  } finally {
    void reader.cancel().catch(() => undefined)
  }
}
