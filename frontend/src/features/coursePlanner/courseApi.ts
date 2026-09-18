import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { ProgressStatus } from '@/components/ProgressStatusIcon'
import { apiClient } from '@/lib/apiClient'
import { retryUnlessClientError, signOutOn401 } from '@/lib/apiUtils'
import { courseDetailQueryKey, coursesQueryRootKey } from '@/lib/queryKeys'
import { getCourseDetail } from '@/hooks/useCourseDetail'
import type { CourseDetail, PointBuildStatus } from '@/types/course'
import {
  CourseOrganizeStreamError,
  streamCourseOrganize,
  type CourseSearchProgress,
} from './streamCourseOrganize'

export interface QuestionnaireQuestion {
  id: string
  title: string
  options: string[]
}

export interface CourseQuestionnaire {
  questions: QuestionnaireQuestion[]
}

export interface CourseIntakeAnswer {
  questionId: string
  answer: string
}

// Selected option per question id (null = unanswered). The course domain owns
// this shape; the conversation tool shell re-exports it for its consumers.
export type QuestionnaireAnswers = Record<string, string | null>

// 卡片只展示两层，单元行带学习点计数。
export interface CourseToolLesson {
  id: string
  title: string
  pointCount: number
  status: ProgressStatus
}

export interface CourseToolModule {
  id: string
  title: string
  status: ProgressStatus
  lessons: CourseToolLesson[]
}

export type CoursePlannerStage =
  | 'questionnaire'
  | 'searching'
  | 'materializing'
  | 'ready'

export interface CourseToolShellData {
  stage: CoursePlannerStage
  title: string
  modules: CourseToolModule[]
  // True only when the course itself ended in `failed` (no point produced a
  // video). A `ready` course with some failed points is NOT failed.
  failed: boolean
}

export const coursePlannerQueryRootKey = coursesQueryRootKey

export function courseQuestionnaireQueryKey(courseId: string) {
  return [...coursesQueryRootKey, 'questionnaire', courseId] as const
}

export function mapCourseStatusToStage(status: string): CoursePlannerStage {
  switch (status) {
    case 'intake':
      return 'questionnaire'
    // 搜索前置 + 实时 SSE: after answers the course is `organizing` — the
    // /organize/stream window (real search hits + compose reasoning). No tree
    // exists yet; it lands atomically with `materializing`.
    case 'organizing':
      return 'searching'
    // 物料化门禁: after compose the course downloads every point's video before
    // it's enterable; the card shows the tree and stays open.
    case 'materializing':
      return 'materializing'
    case 'ready':
    case 'failed':
      return 'ready'
    default:
      return 'searching'
  }
}

function mapPointStatus(status: PointBuildStatus): ProgressStatus {
  switch (status) {
    case 'researching':
      return 'in-progress'
    case 'ready':
      return 'completed'
    case 'failed':
      return 'failed'
    default:
      return 'not-started'
  }
}

// The backend tracks build state on points but not on lessons/modules, so the
// row icons are rolled up here (display-only; no backend truth duplicated).
//
// A failure wins over its successful siblings on purpose. The backend's
// delivery rule is the opposite (any ready point -> the course ships), but that
// rule decides whether you can ENTER the course, not what the card should say:
// rolling a mixed row up to `completed` would tick every line while the header
// still spins, telling the user everything worked when a video actually failed.
function rollupStatus(statuses: ProgressStatus[]): ProgressStatus {
  if (statuses.length === 0) {
    return 'not-started'
  }
  if (statuses.some((status) => status === 'failed')) {
    return 'failed'
  }
  if (statuses.every((status) => status === 'completed')) {
    return 'completed'
  }
  if (statuses.some((status) => status !== 'not-started')) {
    return 'in-progress'
  }
  return 'not-started'
}

export function mapCourseToToolShellData(
  course: CourseDetail
): CourseToolShellData {
  return {
    stage: mapCourseStatusToStage(course.status),
    title: course.title,
    failed: course.status === 'failed',
    modules: course.modules.map((module) => {
      const lessons = module.lessons.map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        pointCount: lesson.points.length,
        status: rollupStatus(
          lesson.points.map((point) => mapPointStatus(point.buildStatus))
        ),
      }))
      return {
        id: module.id,
        title: module.title,
        status: rollupStatus(lessons.map((lesson) => lesson.status)),
        lessons,
      }
    }),
  }
}

function isTerminalCourseStatus(status: string): boolean {
  return status === 'ready' || status === 'failed'
}

export async function submitIntake(variables: {
  courseId: string
  answers: CourseIntakeAnswer[]
}): Promise<CourseDetail> {
  const { data } = await signOutOn401(
    apiClient.post<CourseDetail>(
      `/api/v1/courses/${variables.courseId}/intake`,
      { answers: variables.answers }
    )
  )
  return data
}

export async function getCourseQuestionnaire(
  courseId: string
): Promise<CourseQuestionnaire> {
  const { data } = await signOutOn401(
    apiClient.get<CourseQuestionnaire>(
      `/api/v1/courses/${courseId}/questionnaire`
    )
  )
  return data
}

export function useSubmitCourseIntakeMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: submitIntake,
    onSuccess: (course) => {
      queryClient.setQueryData(courseDetailQueryKey(course.id), course)
    },
  })
}

export function useCourseQuestionnaireQuery(
  courseId: string | undefined,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: courseQuestionnaireQueryKey(courseId ?? 'none'),
    queryFn: () => getCourseQuestionnaire(courseId as string),
    enabled: Boolean(courseId) && (options?.enabled ?? true),
    // The questionnaire is immutable once generated — never refetch it.
    staleTime: Infinity,
    retry: retryUnlessClientError,
  })
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
}

function waitForReconnect(signal: AbortSignal, delayMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }

    const timeoutId = window.setTimeout(() => {
      signal.removeEventListener('abort', handleAbort)
      resolve()
    }, delayMs)

    const handleAbort = () => {
      window.clearTimeout(timeoutId)
      reject(new DOMException('Aborted', 'AbortError'))
    }

    signal.addEventListener('abort', handleAbort, { once: true })
  })
}

// Terminal business failures the worker publishes on the organize channel: the
// course is already failed in the DB, so refetch the snapshot (-> failed stage)
// instead of reconnecting.
const ORGANIZE_TERMINAL_CODES = new Set([
  'course_compose_failed',
  'course_search_failed',
  'course_materialize_failed',
  'course_not_found',
])

export interface CourseOrganizeStreamState {
  /** Accumulated compose reasoning (live thinking); '' before any arrives. */
  reasoningText: string
  /** Real search hits once they land; null while still searching. */
  search: CourseSearchProgress | null
  error: Error | null
}

/**
 * Live organize SSE (方案二): drives the organizing window from /organize/stream
 * — real search hits + compose reasoning, NO polling. Writes the ready/failed
 * snapshot into the course query cache on `done` (-> stage flips to the real
 * tree / failed). A terminal business error refetches the snapshot; a
 * transport drop reconnects (losing earlier reasoning is accepted, 决策④).
 */
export function useCourseOrganizeStream(
  courseId: string | undefined,
  options: { enabled: boolean; reconnectDelayMs?: number }
): CourseOrganizeStreamState {
  const queryClient = useQueryClient()
  const [reasoningText, setReasoningText] = useState('')
  const [search, setSearch] = useState<CourseSearchProgress | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const reconnectDelayMs = options.reconnectDelayMs ?? 1_500

  useEffect(() => {
    if (!courseId || !options.enabled) {
      return
    }

    let active = true
    const controller = new AbortController()
    const activeCourseId = courseId

    const refetchSnapshot = async () => {
      const snapshot = await queryClient.fetchQuery({
        queryKey: courseDetailQueryKey(activeCourseId),
        queryFn: () => getCourseDetail(activeCourseId),
        staleTime: 0,
      })
      if (active && !controller.signal.aborted) {
        queryClient.setQueryData(
          courseDetailQueryKey(activeCourseId),
          snapshot
        )
      }
      return snapshot
    }

    const run = async () => {
      // Reset transient stream state for this course (in the async body, not the
      // effect body — same tick, but avoids the set-state-in-effect rule).
      setReasoningText('')
      setSearch(null)
      setError(null)
      while (active && !controller.signal.aborted) {
        try {
          const snapshot = await streamCourseOrganize({
            courseId: activeCourseId,
            signal: controller.signal,
            onSearching: () => setError(null),
            onSearch: (next) => {
              setError(null)
              setSearch(next)
            },
            onReasoning: (text) => {
              setError(null)
              setReasoningText((current) => current + text)
            },
            onMaterializing: (snapshot) => {
              // The materialization snapshot drives the live tree: writing it to
              // the course cache flips the stage to `materializing` (no poll) and
              // updates each row as its points complete.
              setError(null)
              queryClient.setQueryData(
                courseDetailQueryKey(activeCourseId),
                snapshot
              )
            },
          })
          // `done` carried the ready snapshot — flip straight to the tree.
          if (active && !controller.signal.aborted) {
            queryClient.setQueryData(
              courseDetailQueryKey(activeCourseId),
              snapshot
            )
          }
          return
        } catch (streamError) {
          if (!active || isAbortError(streamError)) {
            return
          }
          // Terminal business failure: the course is failed in the DB. Refetch
          // the snapshot so the card shows the failed state (no reconnect).
          if (
            streamError instanceof CourseOrganizeStreamError &&
            ORGANIZE_TERMINAL_CODES.has(streamError.code)
          ) {
            try {
              await refetchSnapshot()
            } catch (snapshotError) {
              if (active && !isAbortError(snapshotError)) {
                setError(toError(snapshotError))
              }
            }
            return
          }
          // Transport drop: surface it, then reconnect (unless already terminal).
          // If this keeps failing, verify the Celery worker + Redis are running.
          setError(toError(streamError))
          try {
            const snapshot = await refetchSnapshot()
            if (!active || controller.signal.aborted) {
              return
            }
            if (isTerminalCourseStatus(snapshot.status)) {
              return
            }
          } catch (snapshotError) {
            if (!active || isAbortError(snapshotError)) {
              return
            }
            setError(toError(snapshotError))
          }

          try {
            await waitForReconnect(controller.signal, reconnectDelayMs)
          } catch (reconnectError) {
            if (!active || isAbortError(reconnectError)) {
              return
            }
            setError(toError(reconnectError))
          }
        }
      }
    }

    void run()

    return () => {
      active = false
      controller.abort()
    }
  }, [courseId, options.enabled, queryClient, reconnectDelayMs])

  return {
    reasoningText: options.enabled ? reasoningText : '',
    search: options.enabled ? search : null,
    error: options.enabled ? error : null,
  }
}
