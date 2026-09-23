import { env } from '@/lib/env'
import { supabase } from '@/lib/supabaseClient'

// Shared SSE plumbing for the free-course streams (build and single-lesson
// generation). Both hit the same protocol — `event:`/`data:` frames over a
// fetch body — so the parser, the error mapping and the read loop live here
// once. EventSource is not an option: it cannot attach the Supabase token.

export class FreeCourseStreamError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'FreeCourseStreamError'
    this.code = code
  }
}

export interface SseFrame {
  event: string
  data: string
}

export function parseSseFrame(frame: string): SseFrame | null {
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

export async function toStreamError(
  response: Response
): Promise<FreeCourseStreamError> {
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
    return new FreeCourseStreamError(detail, detail)
  }

  return new FreeCourseStreamError(
    `http_${response.status}`,
    detail !== undefined ? JSON.stringify(detail) : `HTTP ${response.status}`
  )
}

/** One `error` frame in wire shape (both streams send the same shape). */
export function parseErrorFrame(data: string): FreeCourseStreamError {
  const payload = JSON.parse(data) as { code?: string; message?: string }
  return new FreeCourseStreamError(
    payload.code ?? 'free_course_error',
    payload.message ?? 'Free course request failed'
  )
}

/**
 * Open an authenticated SSE request.
 *
 * Throws FreeCourseStreamError when there is no session or the response is not
 * ok; the caller owns the AbortSignal so it can cancel on unmount.
 */
export async function openSse(
  path: string,
  signal: AbortSignal
): Promise<ReadableStream<Uint8Array>> {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    throw new FreeCourseStreamError('invalid_token', 'No active Supabase session')
  }

  const response = await fetch(
    `${env.apiBaseUrl.replace(/\/+$/, '')}${path}`,
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
    throw new FreeCourseStreamError(
      'stream_interrupted',
      'Response has no readable body'
    )
  }
  return response.body
}

/**
 * Read frames until `handle` reports the stream is complete.
 *
 * `handle` returns true to stop (a terminal frame arrived) and may throw to
 * abort — the reader is cancelled either way. A stream that ends without a
 * terminal frame is the caller's problem to detect, so a silent truncation
 * cannot pass as success.
 */
export async function readSse(
  body: ReadableStream<Uint8Array>,
  handle: (frame: SseFrame) => boolean
): Promise<void> {
  const reader = body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let finished = false

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
        const parsed = parseSseFrame(frame)
        if (parsed && handle(parsed)) {
          finished = true
          break
        }
      }
    }

    if (!finished && buffer.trim().length > 0) {
      const parsed = parseSseFrame(buffer)
      if (parsed) handle(parsed)
    }
  } finally {
    void reader.cancel().catch(() => undefined)
  }
}
