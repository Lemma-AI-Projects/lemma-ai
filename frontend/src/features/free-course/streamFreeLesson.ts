import {
  FreeCourseStreamError,
  openSse,
  parseErrorFrame,
  readSse,
} from './freeCourseSse'
import type {
  FreeBuildStepEvent,
  FreeLessonContent,
  FreeLessonProgress,
  FreeLessonStepKey,
} from './types'
import { freeLessonStepOrder } from './types'

export interface FreeLessonStreamOptions {
  courseId: string
  chapterId: string
  signal: AbortSignal
  /** Regenerate even though the lesson already has content. */
  force?: boolean
  onStep?: (progress: FreeLessonProgress) => void
}

function initialProgress(): FreeLessonProgress {
  return Object.fromEntries(
    freeLessonStepOrder.map((step) => [
      step,
      { status: 'pending', detail: null, payload: null },
    ])
  ) as FreeLessonProgress
}

/**
 * SSE client for GET /{id}/chapters/{chapterId}/lesson/stream.
 *
 * The same two steps as the build's tail (blueprint -> content) but for one
 * lesson, so it reuses the step frame shape and the progress map. Resolves with
 * the stored lesson on `done` — which is also what an already-generated lesson
 * returns immediately, without a model call.
 */
export async function streamFreeLesson(
  options: FreeLessonStreamOptions
): Promise<FreeLessonContent> {
  const { courseId, chapterId, signal, force, onStep } = options

  const body = await openSse(
    `/api/v1/free-courses/${courseId}/chapters/${chapterId}/lesson/stream${
      force ? '?force=true' : ''
    }`,
    signal
  )

  let progress = initialProgress()
  let lesson: FreeLessonContent | null = null

  await readSse(body, (frame) => {
    switch (frame.event) {
      case 'step': {
        const parsed = JSON.parse(frame.data) as FreeBuildStepEvent
        const key = parsed.step as FreeLessonStepKey
        if (key in progress) {
          const status =
            parsed.status === 'started'
              ? 'running'
              : parsed.status === 'failed'
                ? 'failed'
                : 'done'
          progress = {
            ...progress,
            [key]: {
              status,
              detail: parsed.detail ?? progress[key].detail,
              payload: parsed.payload ?? progress[key].payload,
            },
          }
          onStep?.(progress)
        }
        return false
      }
      case 'done':
        lesson = JSON.parse(frame.data) as FreeLessonContent
        return true
      case 'error':
        throw parseErrorFrame(frame.data)
      default:
        return false
    }
  })

  if (lesson === null) {
    throw new FreeCourseStreamError(
      'stream_interrupted',
      'Stream ended before done event'
    )
  }
  return lesson
}
