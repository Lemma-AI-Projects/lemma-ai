import { env } from '@/lib/env'
import { supabase } from '@/lib/supabaseClient'

export interface ChatApiMessage {
  role: 'user' | 'assistant'
  content: string
}

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
  /** 按时间顺序的整段对话历史，最后一条必须是 user。 */
  messages: ChatApiMessage[]
  /** Phase 2 预留：后端支持会话落库后再传，本阶段不发送。 */
  conversationId?: string
  signal: AbortSignal
  onDelta: (text: string) => void
  onUsage?: (usage: ChatStreamUsage) => void
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
  const { messages, signal, onDelta, onUsage } = options

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
      body: JSON.stringify({ messages }),
      signal,
    }
  )

  if (!response.ok) {
    throw new ChatStreamError(
      response.status === 401 ? 'invalid_token' : `http_${response.status}`,
      await readErrorMessage(response)
    )
  }

  if (!response.body) {
    throw new ChatStreamError('stream_interrupted', 'Response has no readable body')
  }

  await consumeSseStream(response.body, { onDelta, onUsage })
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json()
    if (body !== null && typeof body === 'object' && 'detail' in body) {
      const { detail } = body as { detail: unknown }
      return typeof detail === 'string' ? detail : JSON.stringify(detail)
    }
  } catch {
    // 非 JSON 响应体，退回状态码描述
  }
  return `HTTP ${response.status}`
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
  handlers: Pick<StreamChatOptions, 'onDelta' | 'onUsage'>
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
      case 'usage': {
        handlers.onUsage?.(JSON.parse(parsed.data) as ChatStreamUsage)
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
        // 未知事件（如未来的 tool_call / reasoning）直接忽略
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
