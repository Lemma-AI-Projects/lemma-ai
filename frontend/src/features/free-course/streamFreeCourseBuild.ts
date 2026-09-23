import {
  FreeCourseStreamError,
  openSse,
  parseErrorFrame,
  readSse,
} from './freeCourseSse'
import type {
  CourseTuningStart,
  FreeBuildStepEvent,
  FreeBuildStepKey,
  FreeBuildProgress,
  FreeCourseDetail,
  FreeCourseStreamResult,
} from './types'
import { freeBuildStepOrder } from './types'

export { FreeCourseStreamError }

export interface FreeCourseStreamOptions {
  courseId: string
  intent: string
  signal: AbortSignal
  /** Merge onto an already-accumulated progress map instead of starting empty (phase-2 resume after the questionnaire). */
  initialProgress?: FreeBuildProgress
  /** A build stage flipped state (started/running -> finished/done/payload). */
  onStep?: (progress: FreeBuildProgress) => void
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
 * Collapses the five pipeline stages into a UI progress map. Phase 1 ends on a
 * `questionnaire` frame and resolves with `{ outcome: 'questionnaire' }`; phase 2
 * resolves with `{ outcome: 'done', course }` on the `done` frame. Throws
 * FreeCourseStreamError on an `error` frame (terminal business failure).
 */
export async function streamFreeCourseBuild(
  options: FreeCourseStreamOptions
): Promise<FreeCourseStreamResult> {
  const { courseId, intent, signal, initialProgress: initialProgressOption, onStep } = options

  const body = await openSse(
    `/api/v1/free-courses/${courseId}/build/stream?intent=${encodeURIComponent(intent)}`,
    signal
  )

  let progress = initialProgressOption ?? initialProgress()
  let offer: CourseTuningStart | null = null
  let detail: FreeCourseDetail | null = null

  await readSse(body, (frame) => {
    switch (frame.event) {
      case 'step': {
        progress = applyStep(progress, JSON.parse(frame.data) as FreeBuildStepEvent)
        onStep?.(progress)
        return false
      }
      case 'questionnaire':
        offer = JSON.parse(frame.data) as CourseTuningStart
        return true
      case 'done':
        detail = JSON.parse(frame.data) as FreeCourseDetail
        return true
      case 'error':
        throw parseErrorFrame(frame.data)
      default:
        return false
    }
  })

  if (offer !== null) {
    return { outcome: 'questionnaire', offer }
  }
  if (detail === null) {
    throw new FreeCourseStreamError(
      'stream_interrupted',
      'Stream ended before a terminal event'
    )
  }
  return { outcome: 'done', course: detail }
}
