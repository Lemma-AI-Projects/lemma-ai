/**
 * Teaching-session endpoints. Thin on purpose — the session is a state machine
 * the view drives, not a cache to be invalidated, so these are plain calls
 * rather than query hooks with retry opinions.
 */

import { isAxiosError } from 'axios'

import { apiClient } from '@/lib/apiClient'
import { signOutOn401 } from '@/lib/apiUtils'
import type {
  SessionSignalKind,
  SessionProgressInput,
  TeachingSession,
  TeachingTurnResult,
} from './types'

function base(courseId: string, chapterId: string): string {
  return `/api/v1/free-courses/${courseId}/chapters/${chapterId}/session`
}

/**
 * Open or resume the session.
 *
 * A 409 is meaningful and not an error to retry: it means the session could not
 * be planned (a model that returned something unusable, or a chapter with no
 * content). The caller shows the message rather than a board.
 *
 * `restart` is the one way to hear a lesson again. Without it a lesson whose
 * board has been taught to its end resumes *past* its last step, which plays
 * nothing at all — so the finished case has to be able to ask for a fresh one.
 */
export async function startTeachingSession(
  courseId: string,
  chapterId: string,
  options?: { restart?: boolean }
): Promise<TeachingSession> {
  const { data } = await signOutOn401(
    apiClient.post<TeachingSession>(base(courseId, chapterId), {
      restart: Boolean(options?.restart),
    })
  )
  return data
}

/** Read-only resume: null (not an error) when this chapter has no session yet. */
export async function getTeachingSession(
  courseId: string,
  chapterId: string
): Promise<TeachingSession | null> {
  try {
    const { data } = await signOutOn401(
      apiClient.get<TeachingSession>(base(courseId, chapterId))
    )
    return data
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) return null
    throw error
  }
}

export interface TeachingTurnInput {
  signal: SessionSignalKind
  stepId?: string | null
  text?: string | null
  optionId?: string | null
  cursor?: number | null
}

export async function submitTeachingTurn(
  courseId: string,
  chapterId: string,
  input: TeachingTurnInput
): Promise<TeachingTurnResult> {
  const { data } = await signOutOn401(
    apiClient.post<TeachingTurnResult>(`${base(courseId, chapterId)}/turn`, input)
  )
  return data
}

export async function postSessionProgress(
  courseId: string,
  chapterId: string,
  input: SessionProgressInput
): Promise<TeachingSession> {
  const { data } = await signOutOn401(
    apiClient.post<TeachingSession>(`${base(courseId, chapterId)}/progress`, input)
  )
  return data
}
