import { env } from '@/lib/env'
import { supabase } from '@/lib/supabaseClient'
import type { CourseDetail } from './courseApi'

// Real search hits shown while composing (decision ②). camelCase off the wire.
export interface CourseSearchPlatformHit {
  platform: string
  count: number
}

export interface CourseSearchItem {
  platform: string
  title: string
  author: string | null
  viewCount: number | null
}

export interface CourseSearchProgress {
  platforms: CourseSearchPlatformHit[]
  items: CourseSearchItem[]
}

export class CourseOrganizeStreamError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'CourseOrganizeStreamError'
    this.code = code
  }
}

export interface StreamCourseOrganizeOptions {
  courseId: string
  signal: AbortSignal
  /** Broad search still running (no real results yet). */
  onSearching?: () => void
  /** Real search results landed (platform hit counts + top-K real videos). */
  onSearch?: (search: CourseSearchProgress) => void
  /** A compose reasoning delta (live thinking). */
  onReasoning?: (text: string) => void
}

interface SseFrame {
  event: string
  data: string
}

/**
 * SSE client for GET /api/v1/courses/{id}/organize/stream.
 *
 * Mirrors streamChat: fetch + getReader (EventSource can't send Authorization),
 * with the Supabase token attached manually. Resolves with the ready course
 * snapshot on `done`; throws CourseOrganizeStreamError on an `error` event
 * (terminal business failure, e.g. compose failed); a transport failure throws
 * the underlying error and the caller decides whether to reconnect.
 */
export async function streamCourseOrganize(
  options: StreamCourseOrganizeOptions
): Promise<CourseDetail> {
  const { courseId, signal, onSearching, onSearch, onReasoning } = options

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    throw new CourseOrganizeStreamError(
      'invalid_token',
      'No active Supabase session'
    )
  }

  const response = await fetch(
    `${env.apiBaseUrl.replace(/\/+$/, '')}/api/v1/courses/${courseId}/organize/stream`,
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
    throw new CourseOrganizeStreamError(
      'stream_interrupted',
      'Response has no readable body'
    )
  }

  return await consumeOrganizeStream(response.body, {
    onSearching,
    onSearch,
    onReasoning,
  })
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

async function toStreamError(
  response: Response
): Promise<CourseOrganizeStreamError> {
  let detail: unknown
  try {
    const body: unknown = await response.json()
    if (body !== null && typeof body === 'object' && 'detail' in body) {
      detail = (body as { detail: unknown }).detail
    }
  } catch {
    // Non-JSON response: fall back to the HTTP status.
  }

  if (typeof detail === 'string' && detail.length > 0) {
    return new CourseOrganizeStreamError(detail, detail)
  }

  return new CourseOrganizeStreamError(
    `http_${response.status}`,
    detail !== undefined ? JSON.stringify(detail) : `HTTP ${response.status}`
  )
}

async function consumeOrganizeStream(
  body: ReadableStream<Uint8Array>,
  handlers: Pick<
    StreamCourseOrganizeOptions,
    'onSearching' | 'onSearch' | 'onReasoning'
  >
): Promise<CourseDetail> {
  const reader = body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let snapshot: CourseDetail | null = null

  const handleFrame = (frame: string) => {
    const parsed = parseSseFrame(frame)
    if (!parsed) return

    switch (parsed.event) {
      case 'searching':
        handlers.onSearching?.()
        return
      case 'search':
        handlers.onSearch?.(JSON.parse(parsed.data) as CourseSearchProgress)
        return
      case 'reasoning': {
        const payload = JSON.parse(parsed.data) as { text?: string }
        if (typeof payload.text === 'string' && payload.text.length > 0) {
          handlers.onReasoning?.(payload.text)
        }
        return
      }
      case 'done':
        snapshot = JSON.parse(parsed.data) as CourseDetail
        return
      case 'error': {
        const payload = JSON.parse(parsed.data) as {
          code?: string
          message?: string
        }
        throw new CourseOrganizeStreamError(
          payload.code ?? 'course_organize_error',
          payload.message ?? 'Course organize stream failed'
        )
      }
      default:
        return
    }
  }

  try {
    while (snapshot === null) {
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
        if (snapshot !== null) break
      }
    }

    if (snapshot === null && buffer.trim().length > 0) {
      handleFrame(buffer)
    }

    if (snapshot === null) {
      throw new CourseOrganizeStreamError(
        'stream_interrupted',
        'Stream ended before done event'
      )
    }

    return snapshot
  } finally {
    void reader.cancel().catch(() => undefined)
  }
}
