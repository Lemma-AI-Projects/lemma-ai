import { env } from '@/lib/env'
import { supabase } from '@/lib/supabaseClient'

export class ChapterOverviewStreamError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'ChapterOverviewStreamError'
    this.code = code
  }
}

export interface StreamChapterOverviewOptions {
  courseId: string
  chapterId: string
  signal: AbortSignal
  /** The chapter video is uploading to Gemini before generation can start. */
  onPreparing?: () => void
  /** A reasoning delta (live thinking) ahead of the Markdown. */
  onReasoning?: (text: string) => void
  /** A Markdown delta (accumulate into the overview body). */
  onDelta: (text: string) => void
}

/**
 * SSE client for GET /api/v1/courses/{id}/chapters/{chapterId}/overview/stream.
 *
 * Mirrors streamCourseOrganize: fetch + getReader (EventSource can't send
 * Authorization), Supabase token attached manually. Resolves on `done`; throws
 * ChapterOverviewStreamError on an `error` event (terminal business failure).
 * The same chat SSE protocol as the companion (preparing/reasoning/delta/usage/
 * done/error) so a ready overview arrives as one delta + done (cache fast path).
 */
export async function streamChapterOverview(
  options: StreamChapterOverviewOptions
): Promise<void> {
  const { courseId, chapterId, signal, onPreparing, onReasoning, onDelta } =
    options

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    throw new ChapterOverviewStreamError(
      'invalid_token',
      'No active Supabase session'
    )
  }

  const response = await fetch(
    `${env.apiBaseUrl.replace(/\/+$/, '')}/api/v1/courses/${courseId}/chapters/${chapterId}/overview/stream`,
    {
      method: 'GET',
      headers: {
        Accept: 'text/event-stream',
        Authorization: `Bearer ${session.access_token}`,
      },
      signal,
    }
  )

  if (!response.ok) {
    throw await toStreamError(response)
  }

  if (!response.body) {
    throw new ChapterOverviewStreamError(
      'stream_interrupted',
      'Response has no readable body'
    )
  }

  await consumeSseStream(response.body, { onPreparing, onReasoning, onDelta })
}

async function toStreamError(
  response: Response
): Promise<ChapterOverviewStreamError> {
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
    return new ChapterOverviewStreamError(detail, detail)
  }

  return new ChapterOverviewStreamError(
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
    StreamChapterOverviewOptions,
    'onPreparing' | 'onReasoning' | 'onDelta'
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
        return
      case 'done':
        finished = true
        return
      case 'error': {
        const payload = JSON.parse(parsed.data) as {
          code?: string
          message?: string
        }
        throw new ChapterOverviewStreamError(
          payload.code ?? 'ai_error',
          payload.message ?? 'Chapter overview stream failed'
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
      throw new ChapterOverviewStreamError(
        'stream_interrupted',
        'Stream ended before done event'
      )
    }
  } finally {
    void reader.cancel().catch(() => undefined)
  }
}
