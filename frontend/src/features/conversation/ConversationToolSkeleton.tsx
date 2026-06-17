import { Skeleton } from '@/components/ui/skeleton'

// Loading placeholders for the course tool card, built on the shadcn Skeleton
// primitive (the official "Form" skeleton idiom: stacked label + field groups).
// Shown while the questionnaire / outline are still being generated.

const QUESTION_GROUPS = [0, 1, 2]
const OPTION_WIDTHS = ['w-20', 'w-24', 'w-16']

/**
 * Questionnaire-stage skeleton — mirrors the real form (a question label line
 * followed by a row of option chips), repeated a few times. The submit button
 * is rendered by the shell footer, so it is not part of this body skeleton.
 */
export function ConversationQuestionnaireSkeleton() {
  return (
    <div className="mt-4 flex w-full flex-col gap-6" aria-hidden>
      {QUESTION_GROUPS.map((group) => (
        <div key={group} className="flex flex-col gap-3">
          <Skeleton className="h-4 w-2/5" />
          <div className="flex flex-wrap gap-2">
            {OPTION_WIDTHS.map((width) => (
              <Skeleton key={width} className={`h-[34px] rounded-full ${width}`} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/** Outline-stage skeleton — a few unit rows with an indented chapter line. */
export function ConversationOutlineSkeleton() {
  return (
    <div className="mt-4 flex flex-col gap-4" aria-hidden>
      {QUESTION_GROUPS.map((group) => (
        <div key={group} className="flex flex-col gap-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="ml-7 h-4 w-2/3" />
        </div>
      ))}
    </div>
  )
}

/**
 * Full-card skeleton for the brief window before the first course snapshot
 * lands (stage unknown). Mirrors the shell frame plus a heading and the
 * questionnaire body skeleton (the common first stage).
 */
export function ConversationToolCardSkeleton() {
  return (
    <div
      data-slot="conversation-tool-shell"
      aria-hidden
      className="flex w-full max-w-[36rem] flex-col rounded-2xl border border-zinc-200/80 px-5 py-5"
    >
      <Skeleton className="h-6 w-3/5" />
      <ConversationQuestionnaireSkeleton />
    </div>
  )
}
