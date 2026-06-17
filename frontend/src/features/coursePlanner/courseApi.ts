import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { ProgressStatus } from '@/components/ProgressStatusIcon'
import { apiClient } from '@/lib/apiClient'
import { retryUnlessClientError, signOutOn401 } from '@/lib/apiUtils'
import { env } from '@/lib/env'
import { supabase } from '@/lib/supabaseClient'

export interface QuestionnaireQuestion {
  id: string
  title: string
  options: string[]
}

export interface CourseQuestionnaire {
  questions: QuestionnaireQuestion[]
}

export interface CoursePlan {
  courseId: string
  questionnaire: CourseQuestionnaire
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
}

export interface CourseBuildAccepted {
  courseId: string
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

interface BuildProgressEvent {
  course: CourseDetail
}

interface SseFrame {
  event: string
  data: string
}

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
    case 'outline_ready':
      return 'pending'
    case 'building':
      return 'in-progress'
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

export async function createPlan(variables: {
  topic: string
  conversationId?: string
}): Promise<CoursePlan> {
  const { data } = await signOutOn401(
    apiClient.post<CoursePlan>('/api/v1/courses/plan', {
      topic: variables.topic,
      ...(variables.conversationId
        ? { conversationId: variables.conversationId }
        : {}),
    })
  )
  return data
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

export async function startBuild(courseId: string): Promise<CourseBuildAccepted> {
  const { data } = await signOutOn401(
    apiClient.post<CourseBuildAccepted>(`/api/v1/courses/${courseId}/build`)
  )
  return data
}

export function useCreateCoursePlanMutation() {
  return useMutation({
    mutationFn: createPlan,
  })
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

export function useStartCourseBuildMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: startBuild,
    onSuccess: (_data, courseId) => {
      void queryClient.invalidateQueries({ queryKey: courseQueryKey(courseId) })
    },
  })
}

export class CourseBuildStreamError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'CourseBuildStreamError'
    this.code = code
  }
}

export interface StreamCourseBuildProgressOptions {
  courseId: string
  signal: AbortSignal
  onProgress: (course: CourseDetail) => void
}

export async function streamCourseBuildProgress({
  courseId,
  signal,
  onProgress,
}: StreamCourseBuildProgressOptions): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    throw new CourseBuildStreamError(
      'invalid_token',
      'No active Supabase session'
    )
  }

  const response = await fetch(
    `${env.apiBaseUrl.replace(/\/+$/, '')}/api/v1/courses/${courseId}/build/stream`,
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
    throw new CourseBuildStreamError(
      'stream_interrupted',
      'Response has no readable body'
    )
  }

  await consumeBuildStream(response.body, { onProgress })
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

async function toStreamError(response: Response): Promise<CourseBuildStreamError> {
  let detail: unknown

  try {
    const body: unknown = await response.json()
    if (body !== null && typeof body === 'object' && 'detail' in body) {
      detail = (body as { detail: unknown }).detail
    }
  } catch {
    // Non-JSON responses fall back to the HTTP status.
  }

  if (typeof detail === 'string' && detail.length > 0) {
    return new CourseBuildStreamError(detail, detail)
  }

  return new CourseBuildStreamError(
    `http_${response.status}`,
    detail !== undefined ? JSON.stringify(detail) : `HTTP ${response.status}`
  )
}

async function consumeBuildStream(
  body: ReadableStream<Uint8Array>,
  handlers: Pick<StreamCourseBuildProgressOptions, 'onProgress'>
): Promise<void> {
  const reader = body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let finished = false

  const handleFrame = (frame: string) => {
    const parsed = parseSseFrame(frame)
    if (!parsed) return

    switch (parsed.event) {
      case 'progress': {
        const payload = JSON.parse(parsed.data) as BuildProgressEvent
        handlers.onProgress(payload.course)
        return
      }
      case 'done': {
        finished = true
        return
      }
      case 'error': {
        const payload = JSON.parse(parsed.data) as {
          code?: string
          message?: string
        }
        throw new CourseBuildStreamError(
          payload.code ?? 'course_build_error',
          payload.message ?? 'Course build stream failed'
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
      throw new CourseBuildStreamError(
        'stream_interrupted',
        'Stream ended before done event'
      )
    }
  } finally {
    void reader.cancel().catch(() => undefined)
  }
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

export function useCourseBuildStream(
  courseId: string | undefined,
  options: { enabled: boolean; reconnectDelayMs?: number }
) {
  const queryClient = useQueryClient()
  const [error, setError] = useState<Error | null>(null)
  const reconnectDelayMs = options.reconnectDelayMs ?? 1_500

  useEffect(() => {
    if (!courseId || !options.enabled) {
      return
    }

    let active = true
    const controller = new AbortController()
    const activeCourseId = courseId

    const run = async () => {
      while (active && !controller.signal.aborted) {
        try {
          await streamCourseBuildProgress({
            courseId: activeCourseId,
            signal: controller.signal,
            onProgress: (course) => {
              setError(null)
              queryClient.setQueryData(courseQueryKey(activeCourseId), course)
            },
          })
          return
        } catch (streamError) {
          if (!active || isAbortError(streamError)) {
            return
          }

          setError(toError(streamError))

          try {
            // If this keeps returning `building`, verify the Celery worker is
            // running; the frontend only reflects the DB snapshot stream.
            const snapshot = await queryClient.fetchQuery({
              queryKey: courseQueryKey(activeCourseId),
              queryFn: () => getCourse(activeCourseId),
              staleTime: 0,
            })

            if (!active || controller.signal.aborted) {
              return
            }

            queryClient.setQueryData(courseQueryKey(activeCourseId), snapshot)
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

  return { error: options.enabled ? error : null }
}
