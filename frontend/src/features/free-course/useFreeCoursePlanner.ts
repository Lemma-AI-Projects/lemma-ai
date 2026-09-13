import { useEffect, useRef, useState } from 'react'

import { useFreeCourseDetail } from './freeCourseApi'
import {
  FreeCourseStreamError,
  streamFreeCourseBuild,
} from './streamFreeCourseBuild'
import type { FreeBuildProgress, FreeCourseDetail } from './types'

export type FreeCoursePlannerStage =
  | { status: 'loading' }
  | { status: 'building'; courseId: string; intent: string }
  | { status: 'ready'; course: FreeCourseDetail }

export interface FreeCoursePlannerView {
  stage: FreeCoursePlannerStage
  /** Live build progress (intent -> content). Empty until the first step lands. */
  buildProgress: FreeBuildProgress | null
  isBuilding: boolean
  errorMessage: string | null
  /** Re-run the build after a transient failure. */
  retry: () => void
}

/**
 * Drives the free-course build in the conversation tool card.
 *
 * A freshly-created course is `building`: we open /build/stream (mirroring how
 * the video tool card consumes /organize/stream) and collapse the five-stage
 * pipeline into a progress map. Once the backend flips the course to `ready`
 * (either because we ran the build to `done`, or on history reload where it was
 * already built), we switch to the `ready` stage and hand the caller the detail.
 */
export function useFreeCoursePlanner(courseId: string | undefined): FreeCoursePlannerView {
  const detailQuery = useFreeCourseDetail(courseId, {
    enabled: Boolean(courseId),
  })
  const detail = detailQuery.data
  const [buildProgress, setBuildProgress] = useState<FreeBuildProgress | null>(null)
  const [streamError, setStreamError] = useState<string | null>(null)
  const [retryToken, setRetryToken] = useState(0)
  const abortRef = useRef<AbortController | null>(null)

  const status = detail?.status

  const building = Boolean(detail && status !== 'ready')
  const isBuilding = building || detailQuery.isLoading

  useEffect(() => {
    if (!courseId || !building) {
      return undefined
    }

    const controller = new AbortController()
    abortRef.current = controller
    setStreamError(null)

    void streamFreeCourseBuild({
      courseId,
      intent: detail?.title ?? '',
      signal: controller.signal,
      onStep: (progress) => setBuildProgress(progress),
    })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return
        }
        setStreamError(
          error instanceof FreeCourseStreamError
            ? error.message
            : 'Free course build failed'
        )
      })
      .finally(() => {
        if (abortRef.current === controller) {
          abortRef.current = null
        }
        void detailQuery.refetch()
      })

    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, building, detail?.title, retryToken])

  const retry = () => {
    setBuildProgress(null)
    setRetryToken((current) => current + 1)
  }

  let stage: FreeCoursePlannerStage
  if (detail && status === 'ready') {
    stage = { status: 'ready', course: detail }
  } else if (detail && status !== 'failed') {
    stage = { status: 'building', courseId: courseId ?? detail.id, intent: detail.title }
  } else {
    stage = { status: 'loading' }
  }

  return {
    stage,
    buildProgress,
    isBuilding,
    errorMessage: streamError,
    retry,
  }
}