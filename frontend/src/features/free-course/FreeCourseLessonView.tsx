import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'

import {
  RadioGroup,
  RadioGroupItem,
} from '@/components/ui/radio-group'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { AssistantMarkdown } from '@/features/conversation/markdown'
import { cn } from '@/lib/utils'
import { useAppTranslation } from '@/i18n'
import { BuildStepIcon } from './BuildStepIcon'
import { buildStepLabel } from './buildStepLabels'
import {
  useFreeLesson,
  useSubmitFreeObservation,
} from './freeCourseApi'
import { useFreeLessonGeneration } from './useFreeLessonGeneration'
import type {
  FreeAnswerFeedback,
  FreeLearningObject,
  FreeLessonContent,
  FreeLessonProgress,
  FreePracticeOption,
} from './types'
import { freeLessonStepOrder } from './types'

// In-lesson runtime (screen 5). Each content object renders as a section:
// explanation/example are Markdown prose; practice/assessment are answerable —
// items with options are graded locally against the option ids, items without
// them submit free text and the model judges — and the returned
// verdict/feedback/hint renders right here (拍板5). Every answer also becomes an
// observation row. The footer offers the next lesson, which the backend derives
// from the map order; the last lesson ends with a completion line.

type LessonMode = 'study' | 'feedback'

interface AnswerState {
  mode: LessonMode
  feedback: FreeAnswerFeedback | null
  /** What the learner submitted: an option id, or their free text. */
  submittedAnswer: string | null
}

function objectKindLabel(
  kind: FreeLearningObject['kind'],
  t: ReturnType<typeof useAppTranslation>['t']
): string {
  switch (kind) {
    case 'explanation':
      return t('freeCourse.object.explanation')
    case 'example':
      return t('freeCourse.object.example')
    case 'practice':
      return t('freeCourse.object.practice')
    case 'assessment':
      return t('freeCourse.object.assessment')
  }
}

export function FreeCourseLessonView() {
  const { id, chapterId } = useParams<{ id: string; chapterId: string }>()
  const navigate = useNavigate()
  const { t } = useAppTranslation()
  const lessonQuery = useFreeLesson(id, chapterId)

  if (lessonQuery.isPending) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-sm text-zinc-400">
        <Spinner className="size-4" />
        <span>{t('freeCourse.lesson.loading')}</span>
      </div>
    )
  }

  if (lessonQuery.isError || !lessonQuery.data) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-sm text-zinc-400">
        {t('freeCourse.lesson.loadFailed')}
      </div>
    )
  }

  const lesson = lessonQuery.data

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-zinc-200/80 px-6 py-4 dark:border-zinc-800">
        <Button
          type="button"
          variant="ghost"
          className="size-8 shrink-0 rounded-full bg-transparent p-0 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          onClick={() => navigate(-1)}
          aria-label={t('freeCourse.back')}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[17px] font-semibold leading-6 text-zinc-900 dark:text-zinc-100">
            {lesson.title}
          </h1>
          <p className="truncate text-[12px] leading-4 text-zinc-400 dark:text-zinc-500">
            {lesson.objective}
          </p>
        </div>
      </header>

      <LessonRuntime
        courseId={id}
        chapterId={chapterId}
        lesson={lesson}
        onOpenLesson={(nextChapterId) =>
          navigate(`/free-course/${id}/lesson/${nextChapterId}`)
        }
      />
    </div>
  )
}

/**
 * Split out so the generation hook lives below the query's loading/error
 * guards — a hook cannot be called after an early return, and this component
 * only mounts once a lesson (possibly still empty) actually exists.
 */
function LessonRuntime({
  courseId,
  chapterId,
  lesson,
  onOpenLesson,
}: {
  courseId?: string
  chapterId?: string
  lesson: FreeLessonContent
  onOpenLesson: (chapterId: string) => void
}) {
  const { t } = useAppTranslation()
  const hasContent = lesson.objects.length > 0
  const generation = useFreeLessonGeneration(courseId, chapterId, {
    enabled: !hasContent,
  })

  return (
    <div className="scrollbar-fade min-h-0 flex-1 overflow-y-auto px-6 py-6">
      <div className="mx-auto flex w-full max-w-[680px] flex-col gap-5">
        {hasContent ? (
          <>
            {lesson.objects.map((object) => (
              <LessonSection
                key={object.id}
                object={object}
                courseId={courseId}
                chapterId={chapterId}
              />
            ))}

            <footer className="mt-1 flex items-center justify-between gap-3 border-t border-zinc-200/80 pt-5 dark:border-zinc-800">
              {lesson.next ? (
                <>
                  <p className="min-w-0 flex-1 truncate text-[13px] leading-5 text-zinc-400 dark:text-zinc-500">
                    {t('freeCourse.lesson.upNext')} · {lesson.next.title}
                  </p>
                  <Button
                    type="button"
                    className={primaryActionClassName}
                    onClick={() => {
                      const next = lesson.next?.chapterId
                      if (next) onOpenLesson(next)
                    }}
                  >
                    {t('freeCourse.lesson.next')}
                  </Button>
                </>
              ) : (
                <p className="text-[13px] leading-5 text-zinc-500 dark:text-zinc-400">
                  {t('freeCourse.lesson.completed')}
                </p>
              )}
            </footer>
          </>
        ) : (
          <LessonGenerationState
            progress={generation.progress}
            isGenerating={generation.isGenerating}
            errorMessage={generation.errorMessage}
            onRetry={generation.retry}
          />
        )}
      </div>
    </div>
  )
}

/**
 * A lesson without content is the normal first visit to any lesson after the
 * first, and it is generated in place — so this state is progress, not an
 * error. It only becomes an error when the generation actually fails.
 */
function LessonGenerationState({
  progress,
  isGenerating,
  errorMessage,
  onRetry,
}: {
  progress: FreeLessonProgress | null
  isGenerating: boolean
  errorMessage: string | null
  onRetry: () => void
}) {
  const { t } = useAppTranslation()

  if (errorMessage) {
    return (
      <div className="flex flex-col items-center gap-3 py-14 text-center">
        <p className="text-sm text-destructive">
          {errorMessage || t('freeCourse.lesson.generateFailed')}
        </p>
        <Button
          type="button"
          variant="outline"
          className="h-[33px] rounded-full border-zinc-300 bg-transparent px-[12.5px] text-[14px] font-normal text-zinc-800 hover:bg-zinc-100"
          onClick={onRetry}
        >
          {t('freeCourse.retry')}
        </Button>
      </div>
    )
  }

  if (!isGenerating && !progress) {
    return (
      <p className="py-16 text-center text-sm text-zinc-400">
        {t('freeCourse.lesson.empty')}
      </p>
    )
  }

  return (
    <div className="flex flex-col py-10">
      <p className="mb-3 flex items-center gap-2 text-[15px] leading-6 font-medium text-zinc-800 dark:text-zinc-100">
        <Spinner className="size-4" />
        {t('freeCourse.lesson.generating')}
      </p>
      {freeLessonStepOrder.map((step, index) => {
        const state = progress?.[step] ?? {
          status: index === 0 ? 'running' : 'pending',
          detail: null,
          payload: null,
        }
        return (
          <div key={step} className="flex min-h-9 items-start gap-2.5 py-1.5">
            <span className="mt-1 flex size-4 shrink-0 items-center justify-center">
              <BuildStepIcon
                status={state.status}
                isRunning={isGenerating}
              />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] leading-6 font-medium text-zinc-800 dark:text-zinc-100">
                {buildStepLabel(t, step)}
              </p>
              {state.detail ? (
                <p className="mt-0.5 text-[12.5px] leading-5 text-zinc-400 dark:text-zinc-500">
                  {state.detail}
                </p>
              ) : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function LessonSection({
  object,
  courseId,
  chapterId,
}: {
  object: FreeLearningObject
  courseId?: string
  chapterId?: string
}) {
  const { t } = useAppTranslation()
  const isAnswerable = object.kind === 'practice' || object.kind === 'assessment'
  // Every generated lesson carries open questions, so an item is answerable
  // whenever the runtime can reach the backend — requiring options here used to
  // hide the open ones behind a section with no input at all.
  const answerable = isAnswerable && Boolean(courseId && chapterId)

  return (
    <section
      className="rounded-xl border border-zinc-200/80 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
      data-kind={object.kind}
    >
      <header className="flex items-center gap-2">
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium leading-4 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
          {objectKindLabel(object.kind, t)}
        </span>
        <h3 className="min-w-0 flex-1 truncate text-[16px] font-semibold leading-6 text-zinc-900 dark:text-zinc-100">
          {object.title}
        </h3>
        {object.difficulty && object.difficulty !== 'core' ? (
          <span className="shrink-0 text-[11px] leading-4 text-zinc-400 dark:text-zinc-500">
            {object.difficulty}
          </span>
        ) : null}
      </header>

      {object.body ? (
        // Lesson bodies are Markdown by contract (the writer prompt asks for
        // formulas and lists), so they render through the same Markdown layer as
        // assistant messages — with inline `$...$` math on, because a lesson in
        // any subject is full of it and `$$`-only would leave it garbled.
        <AssistantMarkdown
          inlineMath
          className="mt-3 text-[15px] leading-7 text-zinc-800 dark:text-zinc-200"
        >
          {object.body}
        </AssistantMarkdown>
      ) : null}

      {answerable && courseId && chapterId ? (
        <AnswerableObject
          object={object}
          courseId={courseId}
          chapterId={chapterId}
        />
      ) : null}

      {object.hint && !answerable ? (
        <p className="mt-3 text-[13px] leading-5 text-zinc-400 dark:text-zinc-500">
          {object.hint}
        </p>
      ) : null}
    </section>
  )
}

function AnswerableObject({
  object,
  courseId,
  chapterId,
}: {
  object: FreeLearningObject
  courseId: string
  chapterId: string
}) {
  const { t } = useAppTranslation()
  const submit = useSubmitFreeObservation(courseId, chapterId)
  const [answer, setAnswer] = useState<AnswerState>({
    mode: 'study',
    feedback: null,
    submittedAnswer: null,
  })
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)
  const [text, setText] = useState('')

  // Items with options are graded locally against the option ids; items without
  // them are judged by the model, so they submit free text instead. The
  // confidence field is deliberately not sent: nobody asked the learner to rate
  // it, and a fabricated value would poison the observation history.
  const isOpen = object.options.length === 0
  const trimmedText = text.trim()
  const canSubmit = isOpen ? trimmedText.length > 0 : Boolean(selectedOptionId)

  const handleSubmit = () => {
    if (!canSubmit || submit.isPending) return
    submit.mutate(
      isOpen
        ? { objectId: object.id, text: trimmedText }
        : { objectId: object.id, optionId: selectedOptionId },
      {
        onSuccess: (feedback) => {
          setAnswer({
            mode: 'feedback',
            feedback,
            submittedAnswer: isOpen ? trimmedText : selectedOptionId,
          })
        },
      }
    )
  }

  const hasAnswered = answer.mode === 'feedback' && answer.feedback !== null

  return (
    <div className="mt-4">
      {isOpen ? (
        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          disabled={hasAnswered || submit.isPending}
          placeholder={t('freeCourse.lesson.answerPlaceholder')}
          aria-label={object.title}
          className="min-h-[96px] rounded-[12px] border-zinc-200 px-3.5 py-2.5 text-[15px] leading-6 shadow-none focus-visible:border-zinc-400 focus-visible:ring-0 dark:border-zinc-700 dark:bg-transparent"
        />
      ) : (
        <RadioGroup
          value={selectedOptionId ?? ''}
          onValueChange={(optionId) => setSelectedOptionId(optionId)}
          disabled={hasAnswered || submit.isPending}
          className="grid gap-2.5"
          aria-label={object.title}
        >
          {object.options.map((option) => (
            <AnswerOption
              key={option.id}
              option={option}
              isSubmitted={answer.submittedAnswer === option.id}
            />
          ))}
        </RadioGroup>
      )}

      {!hasAnswered ? (
        <div className="mt-4 flex justify-end">
          <Button
            type="button"
            disabled={!canSubmit || submit.isPending}
            className={primaryActionClassName}
            onClick={handleSubmit}
          >
            {submit.isPending ? (
              <>
                <Spinner className="size-3.5 text-white" />
                <span>{t('freeCourse.lesson.submitting')}</span>
              </>
            ) : (
              t('freeCourse.lesson.submit')
            )}
          </Button>
        </div>
      ) : answer.feedback ? (
        <FeedbackPanel feedback={answer.feedback} />
      ) : null}
    </div>
  )
}

const answerOptionCardClassName =
  'flex min-h-[48px] w-full cursor-pointer appearance-none items-center gap-3.5 rounded-[12px] border border-zinc-200 bg-transparent px-3.5 py-2.5 text-left transition-[border-color,background-color] duration-150 ease-out hover:border-zinc-300 hover:bg-zinc-100/60 dark:border-zinc-700 dark:hover:bg-zinc-800/40'
const answerOptionSelectedClassName =
  'border-zinc-500 bg-zinc-100 dark:border-zinc-400 dark:bg-zinc-800'
const answerOptionRadioClassName =
  'size-4 border-zinc-300 bg-transparent text-white data-[state=checked]:border-zinc-900 data-[state=checked]:bg-zinc-900 disabled:opacity-40 [&_svg]:size-2 [&_svg]:fill-white dark:border-zinc-600 dark:text-zinc-950 dark:data-[state=checked]:border-zinc-100 dark:data-[state=checked]:bg-zinc-100 dark:[&_svg]:fill-zinc-950'

function AnswerOption({
  option,
  isSubmitted,
}: {
  option: FreePracticeOption
  isSubmitted: boolean
}) {
  return (
    <label
      className={cn(
        answerOptionCardClassName,
        isSubmitted && answerOptionSelectedClassName
      )}
    >
      <RadioGroupItem
        value={option.id}
        className={answerOptionRadioClassName}
      />
      <span className="min-w-0 flex-1 text-[15px] leading-6 text-zinc-900 dark:text-zinc-100">
        {option.text}
      </span>
    </label>
  )
}

function FeedbackPanel({ feedback }: { feedback: FreeAnswerFeedback }) {
  const { t } = useAppTranslation()
  const tone =
    feedback.verdict === 'correct'
      ? { text: 'text-emerald-700', bg: 'bg-emerald-50', dot: 'bg-emerald-500' }
      : feedback.verdict === 'partial'
        ? { text: 'text-amber-700', bg: 'bg-amber-50', dot: 'bg-amber-500' }
        : { text: 'text-red-700', bg: 'bg-red-50', dot: 'bg-red-500' }

  const label =
    feedback.verdict === 'correct'
      ? t('freeCourse.lesson.correct')
      : feedback.verdict === 'partial'
        ? t('freeCourse.lesson.partial')
        : t('freeCourse.lesson.incorrect')

  return (
    <div className={cn('mt-4 rounded-xl p-4', tone.bg)}>
      <p className={cn('flex items-center gap-2 text-[13.5px] font-semibold', tone.text)}>
        <span className={cn('size-1.5 rounded-full', tone.dot)} />
        {label}
      </p>
      {feedback.feedback ? (
        <p className="mt-2 text-[14px] leading-6 text-zinc-700 dark:text-zinc-200">
          {feedback.feedback}
        </p>
      ) : null}
      {feedback.hint ? (
        <p className="mt-2 border-t border-black/5 pt-2 text-[13px] leading-5 text-zinc-500 dark:border-white/10 dark:text-zinc-400">
          {feedback.hint}
        </p>
      ) : null}
    </div>
  )
}

const primaryActionClassName =
  'h-[34px] rounded-full px-[14px] text-[13.5px] font-normal bg-zinc-950 text-white hover:bg-zinc-800'