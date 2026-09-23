import { useCallback, useEffect, useRef, useState } from 'react'

import { postFreeCourseTuning, useFreeCourseDetail } from './freeCourseApi'
import {
  FreeCourseStreamError,
  streamFreeCourseBuild,
} from './streamFreeCourseBuild'
import type {
  CourseTuningStart,
  CourseTuningSubmit,
  FreeBuildProgress,
  FreeCourseDetail,
} from './types'

export type FreeCoursePlannerStage =
  | { status: 'loading' }
  | { status: 'building'; courseId: string; intent: string }
  /**
   * 暂停态：phase 1（intent→map→path）已落库，等问卷决定 phase 2 怎么写。
   * **带上 `course`** —— 此刻树已经在库里，正是「先看蓝图、再决定生成什么」的时机；
   * 让消费方重新 fetch 一次是白费一趟（detail 查询本来就在跑）。
   */
  | {
      status: 'tuning'
      courseId: string
      offer: CourseTuningStart
      course: FreeCourseDetail
    }
  | { status: 'ready'; course: FreeCourseDetail }
  | { status: 'failed' }

export interface FreeCoursePlannerView {
  stage: FreeCoursePlannerStage
  /** Live build progress (intent -> content). Empty until the first step lands. */
  buildProgress: FreeBuildProgress | null
  isBuilding: boolean
  errorMessage: string | null
  /** Re-run the build after a transient failure. */
  retry: () => void
  tuningOffer: CourseTuningStart | null
  submitTuning: (answers: CourseTuningSubmit) => Promise<void>
  skipTuning: () => Promise<void>
  /**
   * `detail` 正在重新取。暂停态刚出现时 detail 可能还是 phase 1 之前的旧值
   * （流结束后才 refetch），此时**「还没取到」不能显示成「没有结构」**。
   */
  isDetailFetching: boolean
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
  const buildProgressRef = useRef<FreeBuildProgress | null>(null)
  const [tuningOffer, setTuningOffer] = useState<CourseTuningStart | null>(null)
  const [streamError, setStreamError] = useState<string | null>(null)
  const [retryToken, setRetryToken] = useState(0)
  const abortRef = useRef<AbortController | null>(null)

  const status = detail?.status

  // `failed` is terminal, not a build in progress: re-opening the stream on it
  // would spin forever behind a spinner (and re-run a generation the backend
  // already gave up on).
  const building = Boolean(detail && status !== 'ready' && status !== 'failed')
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
      initialProgress: buildProgressRef.current ?? undefined,
      onStep: (progress) => {
        buildProgressRef.current = progress
        setBuildProgress(progress)
      },
    })
      .then((result) => {
        if (result.outcome === 'questionnaire') {
          setTuningOffer(result.offer)
        }
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
    buildProgressRef.current = null
    setBuildProgress(null)
    setRetryToken((current) => current + 1)
  }

  const submitTuning = useCallback(
    async (answers: CourseTuningSubmit) => {
      const targetId = courseId ?? detail?.id
      if (!targetId) return
      setStreamError(null)
      await postFreeCourseTuning(targetId, answers)
      setTuningOffer(null)
      setRetryToken((current) => current + 1)
    },
    [courseId, detail?.id]
  )

  const skipTuning = useCallback(
    () => submitTuning({ skip: true }),
    [submitTuning]
  )

  let stage: FreeCoursePlannerStage
  if (detail && status === 'ready') {
    stage = { status: 'ready', course: detail }
  } else if (detail && status === 'failed') {
    stage = { status: 'failed' }
  } else if (tuningOffer) {
    // 暂停态要带上树。detail 万一还没回来（流刚结束、refetch 在途），
    // 退回 loading/failed —— **不能当成 building**，那会重新开一次流。
    if (detail) {
      stage = {
        status: 'tuning',
        courseId: courseId ?? detail.id,
        offer: tuningOffer,
        course: detail,
      }
    } else if (detailQuery.isError) {
      stage = { status: 'failed' }
    } else {
      stage = { status: 'loading' }
    }
  } else if (detail) {
    stage = { status: 'building', courseId: courseId ?? detail.id, intent: detail.title }
  } else if (detailQuery.isError) {
    // The detail read itself failed (not a build failure): without this the card
    // would show the skeleton forever.
    stage = { status: 'failed' }
  } else {
    stage = { status: 'loading' }
  }

  return {
    stage,
    buildProgress,
    isBuilding,
    errorMessage: streamError,
    retry,
    tuningOffer,
    submitTuning,
    skipTuning,
    isDetailFetching: detailQuery.isFetching,
  }
}