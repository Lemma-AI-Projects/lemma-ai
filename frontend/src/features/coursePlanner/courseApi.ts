import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { ProgressStatus } from '@/components/ProgressStatusIcon'
import { apiClient } from '@/lib/apiClient'
import { retryUnlessClientError, signOutOn401 } from '@/lib/apiUtils'
import {
  CourseOrganizeStreamError,
  streamCourseOrganize,
  type CourseMaterializeProgress,
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

export interface CourseChapter {
  id: string
  title: string
  status: string
  progress: number
}

export interface CourseUnit {
  id: string
  title: string
  status: string
  progress: number
  chapters: CourseChapter[]
}

export interface CourseDetail {
  id: string
  title: string
  status: string
  progress: number
  units: CourseUnit[]
  // True once the intake questionnaire has been generated (it is produced on a
  // background task, so an intake course can briefly have it false).
  questionnaireReady: boolean
}

export interface CourseToolChapter {
  id: string
  title: string
  status: ProgressStatus
  progress: number
}

export interface CourseToolUnit {
  id: string
  title: string
  status: ProgressStatus
  progress: number
  chapters: CourseToolChapter[]
}

export type CoursePlannerStage =
  | 'questionnaire'
  | 'searching'
  | 'materializing'
  | 'pending'
  | 'in-progress'
  | 'ready'

export interface CourseToolShellData {
  stage: CoursePlannerStage
  title: string
  progress: number
  units: CourseToolUnit[]
  // True only when the course itself ended in `failed` (no chapter produced a
  // video). A `ready` course with some failed chapters is NOT failed.
  failed: boolean
}

// While the intake questionnaire is still generating, poll the course snapshot
// this often. The interval self-stops (returns false) once it's ready or the
// course advances/fails, so there is no polling while the user answers.
const QUESTIONNAIRE_POLL_MS = 1200

export const coursePlannerQueryRootKey = ['course-planner'] as const

export function courseQueryKey(courseId: string) {
  return [...coursePlannerQueryRootKey, 'course', courseId] as const
}

export function courseQuestionnaireQueryKey(courseId: string) {
  return [...coursePlannerQueryRootKey, 'questionnaire', courseId] as const
}

function clampProgress(progress: number): number {
  return Math.min(Math.max(Math.round(progress), 0), 100)
}

export function mapCourseStatusToStage(status: string): CoursePlannerStage {
  switch (status) {
    case 'intake':
      return 'questionnaire'
    // 搜索前置 + 实时 SSE: after answers the course is `organizing` — the
    // /organize/stream window (real search hits + compose reasoning). It maps to
    // the `searching` stage (no chapter tree exists yet; it lands atomically with
    // `ready`). `searching` is also accepted as a main status for forward compat.
    case 'searching':
    case 'organizing':
      return 'searching'
    // 物料化门禁: after compose the course pre-generates every chapter's video +
    // overview before it's enterable; the card shows x/total and stays open.
    case 'materializing':
      return 'materializing'
    // `building` is retired by the new flow but kept mapped for old rows.
    case 'building':
      return 'in-progress'
    case 'outline_ready':
      return 'pending'
    case 'ready':
    case 'failed':
      return 'ready'
    default:
      return 'pending'
  }
}

export function mapCourseItemStatus(status: string): ProgressStatus {
  switch (status) {
    case 'not_started':
      return 'not-started'
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

// The backend tracks status on chapters but not on units, so the unit icon is
// rolled up from its chapters here (display-only; no backend truth duplicated).
// Mirrors the backend's course rule (any ready -> ready, else failed) at the
// unit level: all terminal with any success -> completed, all failed -> failed.
function rollupStatus(statuses: ProgressStatus[]): ProgressStatus {
  if (statuses.length === 0) {
    return 'not-started'
  }
  const allTerminal = statuses.every(
    (status) => status === 'completed' || status === 'failed'
  )
  if (allTerminal) {
    return statuses.some((status) => status === 'completed')
      ? 'completed'
      : 'failed'
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
    progress: clampProgress(course.progress),
    failed: course.status === 'failed',
    units: course.units.map((unit) => {
      const chapters = unit.chapters.map((chapter) => ({
        id: chapter.id,
        title: chapter.title,
        status: mapCourseItemStatus(chapter.status),
        progress: clampProgress(chapter.progress),
      }))
      return {
        id: unit.id,
        title: unit.title,
        status: rollupStatus(chapters.map((chapter) => chapter.status)),
        progress: clampProgress(unit.progress),
        chapters,
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

export async function getCourse(courseId: string): Promise<CourseDetail> {
  const { data } = await signOutOn401(
    apiClient.get<CourseDetail>(`/api/v1/courses/${courseId}`)
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
      queryClient.setQueryData(courseQueryKey(course.id), course)
    },
  })
}

export function useCourseQuery(
  courseId: string | undefined,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: courseQueryKey(courseId ?? 'none'),
    queryFn: () => getCourse(courseId as string),
    enabled: Boolean(courseId) && (options?.enabled ?? true),
    // Self-stopping poll: only while the questionnaire is still being generated
    // (intake + not ready). Stops the moment it is ready or the course
    // advances/fails — so it catches a background-generation failure too,
    // without polling during the answer phase or the build (SSE handles that).
    refetchInterval: (query) => {
      const course = query.state.data
      return course &&
        course.status === 'intake' &&
        !course.questionnaireReady
        ? QUESTIONNAIRE_POLL_MS
        : false
    },
    retry: retryUnlessClientError,
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
  /** Materialization x/total/failed once the phase starts; null before. */
  materialize: CourseMaterializeProgress | null
  error: Error | null
}

/**
 * Live organize SSE (方案二): drives the organizing window from /organize/stream
 * — real search hits + compose reasoning, NO polling. Writes the ready/failed
 * snapshot into the course query cache on `done` (-> stage flips to the real
 * outline / failed). A terminal business error refetches the snapshot; a
 * transport drop reconnects (losing earlier reasoning is accepted, 决策④).
 */
export function useCourseOrganizeStream(
  courseId: string | undefined,
  options: { enabled: boolean; reconnectDelayMs?: number }
): CourseOrganizeStreamState {
  const queryClient = useQueryClient()
  const [reasoningText, setReasoningText] = useState('')
  const [search, setSearch] = useState<CourseSearchProgress | null>(null)
  const [materialize, setMaterialize] =
    useState<CourseMaterializeProgress | null>(null)
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
        queryKey: courseQueryKey(activeCourseId),
        queryFn: () => getCourse(activeCourseId),
        staleTime: 0,
      })
      if (active && !controller.signal.aborted) {
        queryClient.setQueryData(courseQueryKey(activeCourseId), snapshot)
      }
      return snapshot
    }

    const run = async () => {
      // Reset transient stream state for this course (in the async body, not the
      // effect body — same tick, but avoids the set-state-in-effect rule).
      setReasoningText('')
      setSearch(null)
      setMaterialize(null)
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
            onMaterializing: (progress) => {
              setError(null)
              setMaterialize(progress)
            },
          })
          // `done` carried the ready snapshot — flip straight to the outline.
          if (active && !controller.signal.aborted) {
            queryClient.setQueryData(courseQueryKey(activeCourseId), snapshot)
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
    materialize: options.enabled ? materialize : null,
    error: options.enabled ? error : null,
  }
}
