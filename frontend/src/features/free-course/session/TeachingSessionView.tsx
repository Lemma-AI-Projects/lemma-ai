/**
 * The teaching session view: whiteboard on the left, conversation on the right.
 *
 * This is the Hyperknow-shaped session, reproduced inside one Free-Course
 * chapter. It is a *view over a state machine*, not a player: the machine lives
 * in the database (services/free_course_session_service.py) and the timeline
 * lives in useTeachingPlayback. What is decided here is only what a screen has
 * to decide — what is on screen right now, and which of the three signals the
 * learner just sent.
 *
 * The start gate is not decoration. Browsers refuse to start speech synthesis
 * without a user gesture, so "Start learning" is both the reference product's
 * shape and the thing that makes the voice work at all.
 */

import { ArrowLeft, Award, Play, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { isAxiosError } from 'axios'
import { useNavigate, useParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import { useAppTranslation } from '@/i18n'
import { CONFUSED_PROMPT, classifyLearnerMessage } from './confusion'
import { splitSentences } from './sentences'
import { SessionRail, type RailFeedback } from './SessionRail'
import {
  getTeachingSession,
  postSessionProgress,
  startTeachingSession,
  submitTeachingTurn,
  type TeachingTurnInput,
} from './sessionApi'
import { Whiteboard } from './Whiteboard'
import { useTeachingPlayback } from './useTeachingPlayback'
import type { TeachingSession, TeachingStep } from './types'

function messageOf(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const detail = error.response?.data as { detail?: unknown } | undefined
    const raw = detail?.detail
    if (typeof raw === 'string') return raw
    if (raw && typeof raw === 'object' && 'message' in raw) {
      return String((raw as { message: unknown }).message)
    }
  }
  return fallback
}

export function TeachingSessionView() {
  const { id: courseId, chapterId } = useParams<{
    id: string
    chapterId: string
  }>()
  const navigate = useNavigate()

  const [session, setSession] = useState<TeachingSession | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [started, setStarted] = useState(false)
  const [starting, setStarting] = useState(false)
  const [thinking, setThinking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedbacks, setFeedbacks] = useState<RailFeedback[]>([])
  const [answeredStepId, setAnsweredStepId] = useState<string | null>(null)
  /**
   * 答对之后那张成就卡的名字，以及**被它挡住的后续 step**。
   *
   * 原文的顺序是：反馈 -> 成就弹窗 -> 点 "Got it" 之后才继续。所以这一步不能
   * 和反馈一起放行：它真的拦住了下一段教学，否则那个弹窗只是个装饰。
   */
  const [award, setAward] = useState<string | null>(null)
  const deferredStepsRef = useRef<TeachingStep[]>([])

  // Absolute index of the first step in the batch currently playing — what the
  // server needs to know "how far did the learner get" without the client
  // holding the whole transcript.
  const baseIndexRef = useRef(0)

  const playback = useTeachingPlayback({
    onStepDone: useCallback(
      (playedInBatch: number) => {
        if (!courseId || !chapterId) return
        void postSessionProgress(courseId, chapterId, {
          cursor: baseIndexRef.current + playedInBatch,
        }).catch(() => {
          // Progress is a convenience for resuming; losing one report must not
          // interrupt the lesson.
        })
      },
      [courseId, chapterId]
    ),
  })

  // Resume: opening the page shows what is already there, but does not start
  // talking. A lecture that begins on its own is a different product.
  useEffect(() => {
    if (!courseId || !chapterId) return
    let cancelled = false
    void (async () => {
      try {
        const existing = await getTeachingSession(courseId, chapterId)
        if (cancelled) return
        setSession(existing)
      } catch (caught) {
        if (!cancelled) setError(messageOf(caught, '读不到这一节的教学会话。'))
      } finally {
        if (!cancelled) setLoaded(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [courseId, chapterId])

  const handleStart = useCallback(async () => {
    if (!courseId || !chapterId) return
    setStarting(true)
    setError(null)
    try {
      const opened = await startTeachingSession(courseId, chapterId)
      setSession(opened)
      setStarted(true)
      if (opened.hasContent && opened.steps.length > 0) {
        baseIndexRef.current = opened.cursor
        const resumeAt = opened.cursor
        // The transcript of what was already taught is restored, so a refresh
        // mid-lesson does not look like the lesson never happened.
        playback.seedSaid(
          opened.steps
            .slice(0, resumeAt)
            .flatMap((step) =>
              splitSentences(step.narration).map((text) => ({
                stepId: step.id,
                text,
              }))
            )
        )
        playback.start(opened.steps.slice(resumeAt), { clearBoard: resumeAt === 0 })
      }
    } catch (caught) {
      setError(messageOf(caught, '这一节的教学会话没有开起来。'))
    } finally {
      setStarting(false)
    }
  }, [courseId, chapterId, playback])

  // Declared before `respond` because the award is named after the beat that
  // was just answered.
  const questionStep = useMemo<TeachingStep | null>(() => {
    if (!session || !playback.activeStepId) return null
    return (
      session.steps.find((step) => step.id === playback.activeStepId) ?? null
    )
  }, [session, playback.activeStepId])

  const respond = useCallback(
    async (input: TeachingTurnInput) => {
      if (!courseId || !chapterId || !session) return
      // The steps about to be appended start right after what we already have.
      const firstNewIndex = session.steps.length
      setThinking(true)
      setError(null)
      try {
        const result = await submitTeachingTurn(courseId, chapterId, {
          ...input,
          cursor: firstNewIndex,
        })
        if (result.feedback) {
          setFeedbacks((previous) => [
            ...previous,
            { verdict: result.verdict, text: result.feedback as string },
          ])
        }
        setSession({
          ...session,
          steps: [...session.steps, ...result.steps],
          cursor: result.cursor,
        })
        baseIndexRef.current = firstNewIndex
        if (result.verdict === 'correct') {
          // Named after what they just did: the model's own name when it gave one,
          // otherwise the beat's own title — never a generic "Well done".
          const name = result.award || questionStep?.title || session.title
          if (name) {
            setAward(name)
            deferredStepsRef.current = result.steps
            return
          }
        }
        playback.start(result.steps)
      } catch (caught) {
        setError(messageOf(caught, '这一步没有送出去，可以再试一次。'))
      } finally {
        setThinking(false)
      }
    },
    [courseId, chapterId, session, playback, questionStep?.title]
  )

  const awaiting = playback.phase === 'awaiting'
  const question = questionStep?.question ?? null
  const answered = Boolean(
    questionStep && answeredStepId === questionStep.id
  )
  const caption = playback.said[playback.said.length - 1]?.text ?? ''

  const dismissAward = useCallback(() => {
    setAward(null)
    const pending = deferredStepsRef.current
    deferredStepsRef.current = []
    if (pending.length > 0) playback.start(pending)
  }, [playback])

  const handleAnswerChoice = useCallback(
    (optionId: string) => {
      if (!questionStep) return
      setAnsweredStepId(questionStep.id)
      void respond({ signal: 'answer', stepId: questionStep.id, optionId })
    },
    [questionStep, respond]
  )

  const handleAnswerText = useCallback(
    (text: string) => {
      if (!questionStep) return
      setAnsweredStepId(questionStep.id)
      void respond({ signal: 'answer', stepId: questionStep.id, text })
    },
    [questionStep, respond]
  )

  const handleConfused = useCallback(() => {
    playback.stop()
    setAnsweredStepId(questionStep?.id ?? null)
    void respond({ signal: 'confused', text: CONFUSED_PROMPT })
  }, [playback, questionStep, respond])

  const handleAsk = useCallback(
    (text: string) => {
      playback.stop()
      setAnsweredStepId(questionStep?.id ?? null)
      void respond({ signal: classifyLearnerMessage(text), text })
    },
    [playback, questionStep, respond]
  )

  if (!loaded) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-sm text-zinc-400">
        <Spinner className="size-4" />
        <span>正在读取这一节…</span>
      </div>
    )
  }

  const title = session?.title || '教学会话'
  const noContent = session !== null && !session.hasContent
  const canResume = Boolean(session && session.hasContent && session.steps.length > 0)

  return (
    <div className="flex h-full flex-col bg-white dark:bg-zinc-950">
      <header className="flex items-center gap-3 border-b border-zinc-200/80 px-6 py-3 dark:border-zinc-800">
        <Button
          type="button"
          variant="ghost"
          className="size-8 shrink-0 rounded-full bg-transparent p-0 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
          onClick={() => {
            if (courseId && chapterId) {
              navigate(`/free-course/${courseId}/lesson/${chapterId}`)
            } else {
              navigate(-1)
            }
          }}
          aria-label="返回课节"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[15px] font-semibold leading-5 text-zinc-900 dark:text-zinc-100">
            {title}
          </h1>
          <p className="truncate text-[11.5px] leading-4 text-zinc-400 dark:text-zinc-500">
            {session?.objective ||
              '语音讲解 + 白板板书：它会一边写一边讲，讲到一半停下来问你。'}
          </p>
        </div>
        {started && <PhaseChip phase={playback.phase} />}
      </header>

      {!started ? (
        <StartGate
          canResume={canResume}
          noContent={noContent}
          starting={starting}
          error={error}
          onStart={handleStart}
          onOpenLesson={() =>
            courseId && chapterId
              ? navigate(`/free-course/${courseId}/lesson/${chapterId}`)
              : undefined
          }
        />
      ) : (
        <div className="flex min-h-0 flex-1">
          <main className="flex min-w-0 flex-1 flex-col gap-3 p-4">
            <div className="relative flex min-h-0 flex-1 flex-col">
              <Whiteboard
                elements={playback.board}
                className="min-h-0 flex-1"
                clickTarget={playback.clickTarget}
                onElementClick={playback.resolveClick}
              />
              {award && <AwardCard name={award} onDismiss={dismissAward} />}
            </div>
            <div className="flex min-h-[2.75rem] shrink-0 items-start gap-3 rounded-xl border border-zinc-200/80 px-4 py-2.5 dark:border-zinc-800">
              <p
                className="flex-1 text-[13px] leading-5 text-zinc-600 dark:text-zinc-300"
                data-session-caption
              >
                {caption || '…'}
              </p>
              {playback.phase === 'playing' && (
                <span className="mt-0.5 flex shrink-0 items-center gap-1.5 text-[11px] text-zinc-400">
                  <span className="inline-block size-1.5 animate-pulse rounded-full bg-[#4c6694]" />
                  讲解中
                </span>
              )}
            </div>
          </main>

          <SessionRail
            said={playback.said}
            question={question}
            awaiting={awaiting}
            awaitingClick={playback.phase === 'awaiting_click'}
            clickHint={playback.clickHint}
            thinking={thinking}
            muted={playback.muted}
            voiceAvailable={playback.voiceAvailable}
            feedbacks={feedbacks}
            answered={answered}
            error={error}
            onSetMuted={playback.setMuted}
            onAnswerChoice={handleAnswerChoice}
            onAnswerText={handleAnswerText}
            onConfused={handleConfused}
            onAsk={handleAsk}
            onStop={playback.stop}
          />
        </div>
      )}
    </div>
  )
}

/**
 * 成就卡（原文：YOU GOT AN AWARD — Loss Function as a Landscape）。
 *
 * 它挡在下一段教学前面，直到学习者点掉它 —— 这是被观察到的顺序，也是这张卡
 * 唯一的作用：让"我做对了一件事"这句话被看见一次，而不是淹没在反馈文字里。
 */
function AwardCard({ name, onDismiss }: { name: string; onDismiss: () => void }) {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-[2px]"
      data-session-award
      role="dialog"
      aria-modal="true"
    >
      <div className="w-[19rem] rounded-2xl border border-[#ceddec] bg-white px-5 py-5 text-center shadow-[0_10px_30px_rgba(76,102,148,0.16)]">
        <span className="mx-auto flex size-9 items-center justify-center rounded-full bg-[#edf4ff] text-[#4c6694]">
          <Award className="size-4.5" />
        </span>
        <p className="mt-2.5 text-[11px] font-semibold tracking-[0.08em] text-[#4c6694] uppercase">
          {useAppTranslation().t('freeCourse.session.awardTitle')}
        </p>
        <p className="mt-1.5 text-[17px] leading-6 font-semibold text-zinc-900">
          {name}
        </p>
        <button
          type="button"
          onClick={onDismiss}
          className="mt-4 h-8 rounded-full bg-[#4c6694] px-4 text-[13px] font-medium text-white hover:bg-[#43597f]"
        >
          {useAppTranslation().t('freeCourse.session.awardGotIt')}
        </button>
      </div>
    </div>
  )
}

function PhaseChip({ phase }: { phase: string }) {
  return (
    <span
      className={cn(
        'shrink-0 rounded-full border border-zinc-200 px-2.5 py-1 text-[11px] text-zinc-500 dark:border-zinc-800 dark:text-zinc-400',
        (phase === 'awaiting' || phase === 'awaiting_click') &&
          'border-[#4c6694] text-[#4c6694]'
      )}
      data-session-phase={phase}
    >
      {phase === 'awaiting'
        ? '等你回答'
        : phase === 'awaiting_click'
          ? '等你点一下'
          : phase === 'playing'
            ? '讲解中'
            : '已暂停'}
    </span>
  )
}

function StartGate({
  canResume,
  noContent,
  starting,
  error,
  onStart,
  onOpenLesson,
}: {
  canResume: boolean
  noContent: boolean
  starting: boolean
  error: string | null
  onStart: () => void
  onOpenLesson: () => void
}) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center px-6">
      <div className="w-full max-w-[26rem] text-center">
        <p className="text-[15px] font-medium text-zinc-800 dark:text-zinc-100">
          {noContent ? '这一节课还没有内容' : '进入这一节的教学会话'}
        </p>
        <p className="mt-2 text-[13px] leading-5 text-zinc-500 dark:text-zinc-400">
          {noContent
            ? '先让它生成这一节的内容，再回到这里——教学会话讲的就是这一节。'
            : '它会用语音一边讲、一边在左边的白板上写和画；讲到一半会停下来问你。你随时可以打断它，也可以说「我没懂」。'}
        </p>
        {error && (
          <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] leading-5 text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300">
            {error}
          </p>
        )}
        <div className="mt-5 flex items-center justify-center gap-2">
          {noContent ? (
            <Button
              type="button"
              className="h-9 gap-2 rounded-full px-4 text-[13px]"
              onClick={onOpenLesson}
            >
              <RefreshCw className="size-4" />
              去生成这一节内容
            </Button>
          ) : (
            <Button
              type="button"
              disabled={starting}
              className="h-9 gap-2 rounded-full px-4 text-[13px]"
              onClick={onStart}
            >
              {starting ? (
                <Spinner className="size-4" />
              ) : (
                <Play className="size-4" />
              )}
              {canResume ? '继续这次教学' : '开始学习'}
            </Button>
          )}
        </div>
        <p className="mt-3 text-[11.5px] leading-4 text-zinc-400">
          语音由浏览器朗读，可随时静音——白板和字幕照常推进。
        </p>
      </div>
    </div>
  )
}
