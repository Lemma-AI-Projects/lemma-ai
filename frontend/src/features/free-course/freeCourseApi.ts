import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiClient } from '@/lib/apiClient'
import { retryUnlessClientError, signOutOn401 } from '@/lib/apiUtils'
import type {
  FreeAnswerFeedback,
  FreeCourseDetail,
  FreeLessonContent,
} from './types'

export const freeCourseRootKey = ['free-course'] as const

export function freeCourseDetailQueryKey(courseId: string) {
  return [...freeCourseRootKey, 'detail', courseId] as const
}

export function freeLessonQueryKey(courseId: string, chapterId: string) {
  return [...freeCourseRootKey, 'lesson', courseId, chapterId] as const
}

export interface FreeCourseCreateResult {
  courseId: string
  status: string
}

export async function createFreeCourse(variables: {
  intent: string
  conversationId?: string | null
}): Promise<FreeCourseCreateResult> {
  const { data } = await signOutOn401(
    apiClient.post<FreeCourseCreateResult>('/api/v1/free-courses', {
      intent: variables.intent,
      conversationId: variables.conversationId ?? undefined,
    })
  )
  return data
}

export async function getFreeCourse(courseId: string): Promise<FreeCourseDetail> {
  const { data } = await signOutOn401(
    apiClient.get<FreeCourseDetail>(`/api/v1/free-courses/${courseId}`)
  )
  return data
}

export async function getFreeLesson(
  courseId: string,
  chapterId: string
): Promise<FreeLessonContent> {
  const { data } = await signOutOn401(
    apiClient.get<FreeLessonContent>(
      `/api/v1/free-courses/${courseId}/chapters/${chapterId}/lesson`
    )
  )
  return data
}

export interface FreeObservationSubmission {
  objectId: string
  optionId?: string | null
  text?: string | null
  confidence?: number | null
}

export async function submitFreeObservation(
  courseId: string,
  chapterId: string,
  submission: FreeObservationSubmission
): Promise<FreeAnswerFeedback> {
  const { data } = await signOutOn401(
    apiClient.post<FreeAnswerFeedback>(
      `/api/v1/free-courses/${courseId}/chapters/${chapterId}/observations`,
      submission
    )
  )
  return data
}

export function useFreeCourseDetail(
  courseId: string | undefined,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: freeCourseDetailQueryKey(courseId ?? 'none'),
    queryFn: () => getFreeCourse(courseId as string),
    enabled: Boolean(courseId) && (options?.enabled ?? true),
    retry: retryUnlessClientError,
  })
}

export function useFreeLesson(
  courseId: string | undefined,
  chapterId: string | undefined,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: freeLessonQueryKey(courseId ?? 'none', chapterId ?? 'none'),
    queryFn: () => getFreeLesson(courseId as string, chapterId as string),
    enabled: Boolean(courseId) && Boolean(chapterId) && (options?.enabled ?? true),
    retry: retryUnlessClientError,
  })
}

export function useSubmitFreeObservation(
  courseId: string,
  chapterId: string
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (submission: FreeObservationSubmission) =>
      submitFreeObservation(courseId, chapterId, submission),
    onSuccess: () => {
      // An answer is the learner-state input; keep the lesson cache warm.
      void queryClient.invalidateQueries({
        queryKey: freeLessonQueryKey(courseId, chapterId),
      })
    },
  })
}