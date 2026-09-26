import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useAppTranslation } from '@/i18n'
import { cn } from '@/lib/utils'
import type { TeachingStep } from './types'

/**
 * The lesson's plan, on the left, next to the board.
 *
 * Hyperknow shows the learner the whole plan up front — the model's prose
 * *lesson plan*, including which exercise to use where. We deliberately do not:
 * a session that asks a question every couple of minutes only works if the
 * learner has not already read what is coming, and the reference report itself
 * names that quiz-like pacing as the biggest difference from watching a video.
 *
 * So this panel shows the **shape** of the lesson — how many beats, objective,
 * which one is being taught now — and only spells out a beat once it has been
 * taught. Nothing about the future is revealed, and nothing is claimed about
 * mastery: 「已讲」 means the board got there, not that the learner learned it.
 */
export function SessionOutline({
  title,
  objective,
  steps,
  playedStepIds,
  activeStepId,
  references,
  open,
  onToggle,
  className,
}: {
  title: string
  objective: string
  steps: TeachingStep[]
  /** Steps whose narration has already been spoken. */
  playedStepIds: string[]
  activeStepId: string | null
  /** Prerequisites this lesson builds on — the only "sources" we actually have. */
  references: string[]
  open: boolean
  onToggle: () => void
  className?: string
}) {
  const { t } = useAppTranslation()
  const played = new Set(playedStepIds)

  if (!open) {
    return (
      <div className={cn('flex shrink-0 flex-col', className)} data-session-outline="closed">
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          aria-label={t('freeCourse.session.outlineTitle')}
          aria-expanded={false}
          className="size-9 rounded-full border-zinc-200/80 bg-zinc-50 text-zinc-500 hover:bg-zinc-100"
          onClick={onToggle}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    )
  }

  return (
    <aside
      className={cn(
        'flex w-[15rem] shrink-0 flex-col rounded-xl border border-zinc-200/80 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900',
        className
      )}
      data-session-outline="open"
    >
      <div className="flex items-center gap-2 border-b border-zinc-200/80 px-3 py-2 dark:border-zinc-800">
        <h2 className="min-w-0 flex-1 truncate text-[12px] font-medium text-zinc-500">
          {t('freeCourse.session.outlineTitle')}
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t('freeCourse.session.outlineCollapse')}
          aria-expanded
          className="size-6 shrink-0 rounded-full text-zinc-500 hover:bg-zinc-200/70"
          onClick={onToggle}
        >
          <ChevronLeft className="size-3.5" />
        </Button>
      </div>

      <div className="scrollbar-fade min-h-0 flex-1 overflow-y-auto px-3 py-2">
        <p className="text-[12.5px] font-medium text-zinc-800 dark:text-zinc-100">
          {title}
        </p>
        {objective ? (
          <p className="mt-1 text-[11.5px] leading-5 text-zinc-500">{objective}</p>
        ) : null}

        <ol className="mt-3 flex flex-col gap-1.5" data-session-outline-steps>
          {steps.map((step, index) => {
            const isPlayed = played.has(step.id)
            const isActive = step.id === activeStepId
            return (
              <li
                key={step.id}
                className="flex items-baseline gap-2"
                data-step-state={isActive ? 'now' : isPlayed ? 'done' : 'ahead'}
              >
                <span
                  className={cn(
                    'mt-[3px] size-1.5 shrink-0 rounded-full',
                    isActive
                      ? 'bg-[#4c6694]'
                      : isPlayed
                        ? 'bg-zinc-400'
                        : 'bg-zinc-200 dark:bg-zinc-700'
                  )}
                  aria-hidden
                />
                <span
                  className={cn(
                    'min-w-0 flex-1 text-[12px] leading-5',
                    isActive
                      ? 'text-zinc-900 dark:text-zinc-100'
                      : isPlayed
                        ? 'text-zinc-600 dark:text-zinc-300'
                        : 'text-zinc-400 dark:text-zinc-500'
                  )}
                >
                  {/* Played beats can be named; future ones cannot, or the
                      questions in them would already be answered. */}
                  {isPlayed && step.title
                    ? step.title
                    : t('freeCourse.session.outlineAhead', { index: index + 1 })}
                </span>
              </li>
            )
          })}
        </ol>

        <h3 className="mt-4 text-[11px] font-medium tracking-[0.04em] text-zinc-400">
          {t('freeCourse.session.references')}
        </h3>
        {references.length > 0 ? (
          <ul className="mt-1.5 flex flex-col gap-1">
            {references.map((reference) => (
              <li
                key={reference}
                className="text-[11.5px] leading-5 text-zinc-500"
              >
                {reference}
              </li>
            ))}
          </ul>
        ) : (
          // An honest empty state beats a row of empty placeholders: a blank
          // "References" list reads as "there were sources, we lost them".
          <p className="mt-1.5 text-[11.5px] leading-5 text-zinc-400">
            {t('freeCourse.session.noReferences')}
          </p>
        )}
      </div>
    </aside>
  )
}
