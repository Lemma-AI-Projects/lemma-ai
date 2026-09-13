import { env } from '@/lib/env'
import { supabase } from '@/lib/supabaseClient'
import type {
  FreeBuildStepEvent,
  FreeBuildStepKey,
  FreeBuildProgress,
  FreeCourseDetail,
} from './types'
import { freeBuildStepOrder } from './types'

export class FreeCourseStreamError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'FreeCourseStreamError'
    this.code = code
  }
}

export interface FreeCourseStreamOptions {
  courseId: string
  intent: string
  signal: AbortSignal
  /** A build stage flipped state (started/running -> finished/done/payload). */
  onStep?: (progress: FreeBuildProgress) => void
}

interface SseFrame {
  event: string
  data: string
}

function initialProgress(): FreeBuildProgress {
  return Object.fromEntries(
    freeBuildStepOrder.map((step) => [
      step,
      { status: 'pending', detail: null, payload: null },
    ])
  ) as FreeBuildProgress
}

function applyStep(
  progress: FreeBuildProgress,
  frame: FreeBuildStepEvent
): FreeBuildProgress {
  const key = frame.step as FreeBuildStepKey
  if (!(key in progress)) {
    return progress
  }

  const status =
    frame.status === 'started'
      ? 'running'
      : frame.status === 'failed'
        ? 'failed'
        : 'done'

  return {
    ...progress,
    [key]: {
      status,
      detail: frame.detail ?? progress[key].detail,
      payload: frame.payload ?? progress[key].payload,
    },
  }
}

/**
 * SSE client for GET /api/v1/free-courses/{id}/build/stream.
 *
 * Mirrors streamCourseOrganize (fetch + getReader — EventSource can't attach
 * the Supabase token) and collapses the five pipeline stages into a UI progress
 * map. Resolves with the ready course detail on `done`; throws
 * FreeCourseStreamError on an `error` frame (terminal business failure).
 */
export async function streamFreeCourseBuild(
  options: FreeCourseStreamOptions
): Promise<FreeCourseDetail> {
  const { courseId, intent, signal, onStep } = options

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    throw new FreeCourseStreamError('invalid_token', 'No active Supabase session')
  }

  const response = await fetch(
    `${env.apiBaseUrl.replace(/\/+$/, '')}/api/v1/free-courses/${courseId}/build/stream?intent=${encodeURIComponent(intent)}`,
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

  return await consumeFreeCourseStream(response.body, { courseId, onStep })
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

async function consumeFreeCourseStream(
  body: ReadableStream<Uint8Array>,
  { courseId, onStep }: Pick<FreeCourseStreamOptions, 'courseId' | 'onStep'>
): Promise<FreeCourseDetail> {
  void courseId
  const reader = body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let progress = initialProgress()
  let detail: FreeCourseDetail | null = null

  const handleFrame = (frame: string) => {
    const parsed = parseSseFrame(frame)
    if (!parsed) return

    switch (parsed.event) {
      case 'step': {
        const frameBody = JSON.parse(parsed.data) as FreeBuildStepEvent
        progress = applyStep(progress, frameBody)
        onStep?.(progress)
        return
      }
      case 'done':
        detail = JSON.parse(parsed.data) as FreeCourseDetail
        return
      case 'error': {
        const payload = JSON.parse(parsed.data) as {
          code?: string
          message?: string
        }
        throw new FreeCourseStreamError(
          payload.code ?? 'free_course_error',
          payload.message ?? 'Free course build failed'
        )
      }
      default:
        return
    }
  }

  try {
    while (detail === null) {
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
        if (detail !== null) break
      }
    }

    if (detail === null && buffer.trim().length > 0) {
      handleFrame(buffer)
    }

    if (detail === null) {
      throw new FreeCourseStreamError(
        'stream_interrupted',
        'Stream ended before done event'
      )
    }

    return detail
  } finally {
    void reader.cancel().catch(() => undefined)
  }
}