import { useCallback, useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { freeLessonQueryKey } from './freeCourseApi'
import { FreeCourseStreamError } from './freeCourseSse'
import { streamFreeLesson } from './streamFreeLesson'
import type { FreeLessonProgress } from './types'

export interface FreeLessonGenerationView {
  isGenerating: boolean
  progress: FreeLessonProgress | null
  errorMessage: string | null
  retry: () => void
}

/**
 * Generates a lesson's content the first time it is opened.
 *
 * A build writes only the lesson the path starts at, so every other lesson —
 * including the one "next lesson" leads to — would open empty. Generating on
 * open is what makes that transition real; server-side it is idempotent, so
 * opening a lesson that already has content costs nothing.
 *
 * `isGenerating` starts as `enabled` rather than being set inside the effect:
 * the effect's only job is to own the stream (start it, abort it on unmount),
 * so it must not also drive state on every run.
 */
export function useFreeLessonGeneration(
  courseId: string | undefined,
  chapterId: string | undefined,
  { enabled }: { enabled: boolean }
): FreeLessonGenerationView {
  const queryClient = useQueryClient()
  const [progress, setProgress] = useState<FreeLessonProgress | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(enabled)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!courseId || !chapterId || !enabled) {
      return undefined
    }

    const controller = new AbortController()

    void streamFreeLesson({
      courseId,
      chapterId,
      signal: controller.signal,
      onStep: setProgress,
    })
      .then(() =>
        // The stream hands back the stored lesson; reading it through the query
        // keeps one definition of the rendered shape.
        queryClient.invalidateQueries({
          queryKey: freeLessonQueryKey(courseId, chapterId),
        })
      )
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return
        }
        setErrorMessage(
          error instanceof FreeCourseStreamError
            ? error.message
            : 'Free lesson generation failed'
        )
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsGenerating(false)
        }
      })

    return () => controller.abort()
  }, [courseId, chapterId, enabled, attempt, queryClient])

  const retry = useCallback(() => {
    setProgress(null)
    setErrorMessage(null)
    setIsGenerating(true)
    setAttempt((current) => current + 1)
  }, [])

  return { isGenerating, progress, errorMessage, retry }
}
