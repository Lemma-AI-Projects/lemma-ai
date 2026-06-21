import { useEffect, useRef, useState } from 'react'

import { supabase } from '@/lib/supabaseClient'
import { getChapterOverview } from './courseLearningApi'
import {
  ChapterOverviewStreamError,
  streamChapterOverview,
} from './streamChapterOverview'

export type ChapterOverviewPhase =
  | 'loading' // initial fast-read GET
  | 'preparing' // chapter video uploading to Gemini before generation
  | 'streaming' // Markdown is being generated live
  | 'ready' // finished (cached or just generated)
  | 'error'

interface ChapterOverviewState {
  phase: ChapterOverviewPhase
  markdown: string
  reasoningText: string
  errorMessage: string | null
}

const initialState: ChapterOverviewState = {
  phase: 'loading',
  markdown: '',
  reasoningText: '',
  errorMessage: null,
}

const overviewErrorMessages: Record<string, string> = {
  ai_timeout: '生成超时，请重试',
  ai_rate_limited: '请求太频繁，稍等几秒再试',
  ai_provider_error: 'AI 服务暂时不可用，请重试',
  ai_fallback_exhausted: 'AI 服务暂时不可用，请重试',
  overview_video_unavailable: '本章视频暂不可用，无法生成概述',
  overview_timeout: '概述生成超时，请稍后重试',
  not_found: '课程或章节不存在',
  stream_interrupted: '连接中断，请重试',
}

function getOverviewErrorMessage(error: unknown): string {
  if (error instanceof ChapterOverviewStreamError) {
    return overviewErrorMessages[error.code] ?? '生成概述失败，请重试'
  }
  if (error instanceof TypeError) {
    return '无法连接服务器，请重试'
  }
  return '生成概述失败，请重试'
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

/**
 * Chapter overview: fast-read the cache, and if it isn't ready, stream the live
 * generation (preparing -> Markdown deltas -> ready). One run per chapter; a
 * chapter switch aborts the previous stream. `retry` re-runs the whole flow.
 */
export function useChapterOverview(
  courseId: string | undefined,
  chapterId: string | undefined
) {
  const [state, setState] = useState<ChapterOverviewState>(initialState)
  const [retryNonce, setRetryNonce] = useState(0)
  const controllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!courseId || !chapterId) {
      controllerRef.current?.abort()
      setState({ ...initialState, phase: 'loading' })
      return
    }

    const controller = new AbortController()
    controllerRef.current?.abort()
    controllerRef.current = controller
    let cancelled = false

    setState({ ...initialState, phase: 'loading' })

    void (async () => {
      try {
        // Fast path: a cached, ready overview renders instantly (no stream).
        const snapshot = await getChapterOverview(courseId, chapterId)
        if (cancelled) return
        if (snapshot.status === 'ready' && snapshot.markdown) {
          setState({
            phase: 'ready',
            markdown: snapshot.markdown,
            reasoningText: '',
            errorMessage: null,
          })
          return
        }

        // Not ready: generate (or follow an active run) over SSE.
        setState({ ...initialState, phase: 'preparing' })
        let markdown = ''
        let reasoning = ''
        await streamChapterOverview({
          courseId,
          chapterId,
          signal: controller.signal,
          onPreparing: () => {
            if (cancelled) return
            setState((prev) =>
              prev.markdown.length > 0
                ? prev
                : { ...prev, phase: 'preparing' }
            )
          },
          onReasoning: (text) => {
            if (cancelled) return
            reasoning += text
            setState((prev) => ({ ...prev, reasoningText: reasoning }))
          },
          onDelta: (text) => {
            if (cancelled) return
            markdown += text
            setState((prev) => ({
              ...prev,
              phase: 'streaming',
              markdown,
            }))
          },
        })
        if (cancelled) return
        setState((prev) => ({ ...prev, phase: 'ready' }))
      } catch (error) {
        if (cancelled || isAbortError(error)) return
        if (
          error instanceof ChapterOverviewStreamError &&
          error.code === 'invalid_token'
        ) {
          void supabase.auth.signOut({ scope: 'local' })
        }
        setState((prev) => ({
          ...prev,
          phase: 'error',
          errorMessage: getOverviewErrorMessage(error),
        }))
      }
    })()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [courseId, chapterId, retryNonce])

  return {
    phase: state.phase,
    markdown: state.markdown,
    reasoningText: state.reasoningText,
    errorMessage: state.errorMessage,
    retry: () => setRetryNonce((nonce) => nonce + 1),
  }
}
