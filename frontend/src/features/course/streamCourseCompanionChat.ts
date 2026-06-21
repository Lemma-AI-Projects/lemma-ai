import { env } from '@/lib/env'
import { supabase } from '@/lib/supabaseClient'

export interface CourseCompanionStreamUsage {
  inputTokens: number | null
  outputTokens: number | null
  totalTokens: number | null
}

export class CourseCompanionStreamError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'CourseCompanionStreamError'
    this.code = code
  }
}

export interface StreamCourseCompanionChatOptions {
  courseId: string
  /** Current watched chapter. Nullable here so a future text-only mode can relax it. */
  chapterId: string | null
  message: string
  conversationId?: string
  signal: AbortSignal
  onConversationId?: (id: string) => void
  onPreparing?: () => void
  onDelta: (text: string) => void
  onReasoning?: (text: string) => void
  onUsage?: (usage: CourseCompanionStreamUsage) => void
}

export async function streamCourseCompanionChat(
  options: StreamCourseCompanionChatOptions
): Promise<void> {
  const {
    courseId,
    chapterId,
    message,
    conversationId,
    signal,
    onConversationId,
    onPreparing,
    onDelta,
    onReasoning,
    onUsage,
  } = options

  if (!chapterId) {
    throw new CourseCompanionStreamError(
      'chapter_required',
      'Current chapter is required'
    )
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    throw new CourseCompanionStreamError(
      'invalid_token',
      'No active Supabase session'
    )
  }

  const response = await fetch(
    `${env.apiBaseUrl.replace(/\/+$/, '')}/api/v1/courses/${courseId}/companion/chat`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        ...(conversationId ? { conversationId } : {}),
        chapterId,
        message,
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
    throw new CourseCompanionStreamError(
      'stream_interrupted',
      'Response has no readable body'
    )
  }

  await consumeSseStream(response.body, {
    onPreparing,
    onDelta,
    onReasoning,
    onUsage,
  })
}

async function toStreamError(
  response: Response
): Promise<CourseCompanionStreamError> {
  let detail: unknown
  try {
    const body: unknown = await response.json()
    if (body !== null && typeof body === 'object' && 'detail' in body) {
      detail = (body as { detail: unknown }).detail
    }
  } catch {
    // Non-JSON response: fall back to HTTP status.
  }

  if (typeof detail === 'string' && detail.length > 0) {
    return new CourseCompanionStreamError(detail, detail)
  }

  return new CourseCompanionStreamError(
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
    StreamCourseCompanionChatOptions,
    'onPreparing' | 'onDelta' | 'onReasoning' | 'onUsage'
  >
): Promise<void> {
  const reader = body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let finished = false

  const handleFrame = (frame: string) => {
    const parsed = parseSseFrame(frame)
    if (!parsed) return

    switch (parsed.event) {
      case 'preparing':
        handlers.onPreparing?.()
        return
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
      case 'usage':
        handlers.onUsage?.(JSON.parse(parsed.data) as CourseCompanionStreamUsage)
        return
      case 'done':
        finished = true
        return
      case 'error': {
        const payload = JSON.parse(parsed.data) as {
          code?: string
          message?: string
        }
        throw new CourseCompanionStreamError(
          payload.code ?? 'ai_error',
          payload.message ?? 'AI companion stream failed'
        )
      }
      default:
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
      throw new CourseCompanionStreamError(
        'stream_interrupted',
        'Stream ended before done event'
      )
    }
  } finally {
    void reader.cancel().catch(() => undefined)
  }
}
