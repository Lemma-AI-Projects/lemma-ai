import { CircleAlert } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { Spinner } from '@/components/ui/spinner'
import { Button } from '@/components/ui/button'
import { useAppTranslation } from '@/i18n'
import { ConversationToolCardSkeleton } from '@/features/conversation/ConversationToolSkeleton'
import { BuildStepIcon } from './BuildStepIcon'
import { buildStepLabel } from './buildStepLabels'
import { useFreeCoursePlanner } from './useFreeCoursePlanner'
import type { FreeBuildStepKey, FreeBuildProgress, FreeBuildStepState } from './types'
import { freeBuildStepOrder } from './types'

// Binds a free-course tool block (just a courseId) to its live build progress
// and the ready-state entry into the blueprint. Mirrors ConversationCourseTool —
// the conversation feature hosts the card, so it depends on the free-course
// feature one way (free-course never imports conversation).
export function ConversationFreeCourseTool({ courseId }: { courseId: string }) {
  const navigate = useNavigate()
  const { t } = useAppTranslation()
  const { stage, buildProgress, isBuilding, errorMessage, retry } =
    useFreeCoursePlanner(courseId)

  if (stage.status === 'loading' && !buildProgress) {
    return <ConversationToolCardSkeleton />
  }

  if (stage.status === 'ready') {
    return (
      <div
        data-slot="free-course-tool"
        data-stage="ready"
        className="flex w-full max-w-[36rem] flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-transparent px-5 py-5 dark:border-zinc-800"
      >
        <h3 className="text-[19.5px] font-semibold leading-7 tracking-tight text-zinc-900 dark:text-zinc-100">
          {stage.course.title}
        </h3>
        <p className="mt-1.5 text-[14.5px] leading-6 text-zinc-500 dark:text-zinc-400">
          {stage.course.summary ?? t('freeCourse.readyHint')}
        </p>
        <div className="-mx-1 -mb-1 mt-5 flex justify-end">
          <Button
            type="button"
            className="h-[33px] rounded-full px-[12.5px] text-[14px] font-normal bg-zinc-950 text-white hover:bg-zinc-800"
            onClick={() => navigate(`/free-course/${courseId}/blueprint`)}
          >
            {t('freeCourse.openBlueprint')}
          </Button>
        </div>
      </div>
    )
  }

  if (stage.status === 'failed') {
    return (
      <div
        data-slot="free-course-tool"
        data-stage="failed"
        className="flex w-full max-w-[36rem] flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-transparent px-5 py-5 dark:border-zinc-800"
      >
        <div className="flex items-start gap-2 text-sm text-destructive">
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          <span>{errorMessage ?? t('freeCourse.buildFailed')}</span>
        </div>
        <div className="-mx-1 -mb-1 mt-4 flex items-center justify-end">
          <Button
            type="button"
            variant="outline"
            className="h-[33px] rounded-full px-[12.5px] text-[14px] font-normal border-zinc-300 bg-transparent text-zinc-800 hover:bg-zinc-100"
            onClick={retry}
          >
            {t('freeCourse.retry')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div
      data-slot="free-course-tool"
      data-stage="building"
      className="flex w-full max-w-[36rem] flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-transparent px-5 py-5 dark:border-zinc-800"
    >
      <h3 className="flex items-center gap-2 text-[19.5px] font-semibold leading-7 tracking-tight text-zinc-900 dark:text-zinc-100">
        {isBuilding ? (
          <Spinner aria-hidden className="size-[17px] shrink-0 text-zinc-900 dark:text-zinc-100" />
        ) : null}
        <span>{stage.status === 'building' ? stage.intent : ''}</span>
      </h3>

      <FreeCourseBuildSteps progress={buildProgress} />

      {errorMessage ? (
        <div className="mt-3 flex items-start gap-2 text-sm text-destructive">
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      ) : null}

      <div className="-mx-1 -mb-1 mt-4 flex items-center justify-end gap-2">
        {errorMessage ? (
          <Button
            type="button"
            variant="outline"
            className="h-[33px] rounded-full px-[12.5px] text-[14px] font-normal border-zinc-300 bg-transparent text-zinc-800 hover:bg-zinc-100"
            onClick={retry}
          >
            {t('freeCourse.retry')}
          </Button>
        ) : null}
      </div>
    </div>
  )
}

/** One finished step's sub-product: intent chips for step 1, the unit tree for
 * step 2. Steps 3–5 carry a one-line detail that renders as plain text. */
function StepProduct({
  step,
  state,
}: {
  step: FreeBuildStepKey
  state: FreeBuildStepState
}) {
  if (state.status !== 'done' || !state.payload) {
    return null
  }

  if (step === 'intent') {
    const chips = intentChips(state.payload)
    if (chips.length === 0) return null
    return (
      <div className="mt-2 flex flex-row flex-wrap gap-1.5">
        {chips.map((chip, index) => (
          <span
            key={index}
            className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[12px] leading-4 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          >
            {chip}
          </span>
        ))}
      </div>
    )
  }

  if (step === 'map') {
    return <UnitTree payload={state.payload} />
  }

  return null
}

// Rendering is defensive against an evolving LearningIntent wire shape: any
// non-empty scalar / option leaf becomes a chip, unknown keys included.
function intentChips(payload: Record<string, unknown>): string[] {
  const chips: string[] = []
  const push = (value: unknown) => {
    if (typeof value === 'string' && value.trim().length > 0) {
      chips.push(value.trim())
    } else if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string' && item.trim().length > 0) {
          chips.push(item.trim())
        }
      }
    }
  }
  for (const [key, value] of Object.entries(payload)) {
    if (key === 'topic' || key === 'raw_request') continue
    push(value)
  }
  return chips.slice(0, 8)
}

function UnitTree({ payload }: { payload: Record<string, unknown> }) {
  const units = Array.isArray(payload.units) ? payload.units : []
  if (units.length === 0) return null
  return (
    <div className="mt-3 flex flex-col gap-1">
      {units.map((rawUnit, unitIndex) => {
        const unit =
          rawUnit && typeof rawUnit === 'object'
            ? (rawUnit as { title?: unknown; lessons?: unknown[] })
            : null
        const unitTitle = typeof unit?.title === 'string' ? unit.title : ''
        const lessons = Array.isArray(unit?.lessons) ? unit.lessons : []
        return (
          <section key={unitIndex}>
            <div className="flex min-h-8 items-center gap-2 py-1.5 text-[15px] font-medium text-zinc-800 dark:text-zinc-100">
              <span className="size-1.5 shrink-0 rounded-full bg-zinc-300 dark:bg-zinc-600" />
              <span className="min-w-0 flex-1 truncate">{unitTitle}</span>
            </div>
            {lessons.length > 0 ? (
              <div className="flex flex-col gap-0.5 pl-3.5">
                {lessons.map((rawLesson, lessonIndex) => {
                  const lesson =
                    rawLesson && typeof rawLesson === 'object'
                      ? (rawLesson as { title?: unknown; objective?: unknown })
                      : null
                  const lessonTitle =
                    typeof lesson?.title === 'string' ? lesson.title : ''
                  const objective =
                    typeof lesson?.objective === 'string' && lesson.objective.length > 0
                      ? lesson.objective
                      : null
                  return (
                    <div
                      key={lessonIndex}
                      className="flex min-h-7 items-baseline gap-2 py-1 text-[13.5px] text-zinc-600 dark:text-zinc-300"
                    >
                      <span className="w-1 shrink-0" />
                      <span className="min-w-0 flex-1 truncate">{lessonTitle}</span>
                      {objective ? (
                        <span className="shrink-0 text-[11.5px] text-zinc-400 dark:text-zinc-500">
                          {objective}
                        </span>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            ) : null}
          </section>
        )
      })}
    </div>
  )
}

function FreeCourseBuildSteps({
  progress,
}: {
  progress: FreeBuildProgress | null
}) {
  const { t } = useAppTranslation()
  const isRunning = Boolean(progress && progress.intent.status !== 'done')

  return (
    <div className="mt-4 flex flex-col gap-1">
      {freeBuildStepOrder.map((step, index) => {
        const state: FreeBuildStepState =
          progress?.[step] ?? { status: index === 0 ? 'running' : 'pending', detail: null, payload: null }
        const lbl = buildStepLabel(t, step)
        return (
          <section key={step}>
            <div className="flex min-h-9 items-start gap-2.5 py-1.5">
              <span className="mt-1 flex size-4 shrink-0 items-center justify-center">
                <BuildStepIcon status={state.status} isRunning={isRunning} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] leading-6 font-medium text-zinc-800 dark:text-zinc-100">
                  {lbl}
                </p>
                {state.detail ? (
                  <p className="mt-0.5 text-[12.5px] leading-5 text-zinc-400 dark:text-zinc-500">
                    {state.detail}
                  </p>
                ) : null}
                <StepProduct step={step} state={state} />
              </div>
            </div>
          </section>
        )
      })}
    </div>
  )
}