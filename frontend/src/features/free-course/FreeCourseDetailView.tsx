import { useMemo } from 'react'
import { ArrowRight, ArrowUpRight, Check, Play } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useAppTranslation } from '@/i18n'
import { cn } from '@/lib/utils'
import { useFreeCourseDetail } from './freeCourseApi'
import { ConversationFreeCourseTool } from './ConversationFreeCourseTool'
import type {
  FreeCourseDetail,
  FreeCourseIntent,
  FreeLesson,
  FreeLessonLearningProgress,
} from './types'
import { ErrorState } from './FreeCourseBlueprintView'

function intentChips(intent: FreeCourseIntent | null | undefined): string[] {
  if (!intent) return []
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
  for (const [key, value] of Object.entries(intent)) {
    if (key === 'topic' || key === 'raw_request') continue
    push(value)
  }
  return chips.slice(0, 8)
}

interface LessonEntry {
  lesson: FreeLesson
  unitIndex: number
  lessonIndex: number
}

function lessonHref(courseId: string, entry: LessonEntry): string {
  const base = `/free-course/${courseId}/lesson/${entry.lesson.id}`
  // Half-taught: go straight back into the session, which resumes at the
  // cursor. Every other state enters through the lesson page, because that page
  // owns "generate it first" and "read the content" — two things a session
  // cannot do.
  return entry.lesson.progress?.state === 'in_progress' ? `${base}/session` : base
}

/**
 * Which lesson the page should hand the learner next.
 *
 * "The first lesson that is not finished" rather than "lesson 1": this page's
 * whole job is to be the way back in, and a link that always returns you to the
 * beginning is worse than no link. `finished` is *not* a wall — a course whose
 * lessons are all taught falls back to the first one, because re-watching is a
 * legitimate thing to want and there is nowhere else to send them.
 */
function nextEntry(
  lessons: LessonEntry[]
): { entry: LessonEntry; state: FreeLessonLearningProgress['state'] | null } | null {
  if (lessons.length === 0) return null
  const pending = lessons.find(
    (entry) => (entry.lesson.progress?.state ?? 'not_started') !== 'finished'
  )
  if (pending) {
    return { entry: pending, state: pending.lesson.progress?.state ?? null }
  }
  return { entry: lessons[0], state: 'finished' }
}

function LessonRow({
  courseId,
  entry,
}: {
  courseId: string
  entry: LessonEntry
}) {
  const { t } = useAppTranslation()
  const progress = entry.lesson.progress
  const state = progress?.state ?? 'not_started'
  const practice = progress?.practice
  const showPractice = Boolean(practice && practice.total > 0)

  return (
    <li>
      <Link
        to={lessonHref(courseId, entry)}
        className="flex items-baseline gap-2 rounded-md px-3 py-2 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900"
        data-lesson-state={state}
      >
        <span className="shrink-0 tabular-nums text-[11px] text-zinc-300 dark:text-zinc-600">
          {entry.lessonIndex + 1}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] text-zinc-700 dark:text-zinc-200">
            {entry.lesson.title}
          </span>
          {/* Practice progress is a second line, not a second chip: it measures
              a different thing than the board does, and side-by-side chips
              would read as one combined status. */}
          {showPractice && practice ? (
            <span className="mt-0.5 block text-[11.5px] text-zinc-400 dark:text-zinc-500">
              {t('freeCourse.page.practice', {
                answered: practice.answered,
                total: practice.total,
              })}
            </span>
          ) : null}
        </span>
        <span
          className={cn(
            'shrink-0 text-[12px] tabular-nums',
            state === 'in_progress'
              ? 'text-[#4c6694]'
              : 'text-zinc-400 dark:text-zinc-500'
          )}
        >
          {state === 'pending_content'
            ? t('freeCourse.page.state.pendingContent')
            : state === 'finished'
              ? t('freeCourse.page.state.finished')
              : state === 'in_progress'
                ? t('freeCourse.page.state.inProgress', {
                    cursor: progress?.cursor ?? 0,
                    steps: progress?.steps ?? 0,
                  })
                : t('freeCourse.page.state.notStarted')}
        </span>
        {state === 'finished' ? (
          <Check className="size-3.5 shrink-0 text-[#4c6694]" aria-hidden />
        ) : state === 'in_progress' ? (
          <Play className="size-3 shrink-0 fill-[#4c6694] text-[#4c6694]" aria-hidden />
        ) : (
          <span className="size-3.5 shrink-0" aria-hidden />
        )}
      </Link>
    </li>
  )
}

function CourseOutline({
  course,
  lessons,
}: {
  course: FreeCourseDetail
  lessons: LessonEntry[]
}) {
  const { t } = useAppTranslation()
  const byUnit = useMemo(() => {
    const groups = new Map<string, LessonEntry[]>()
    for (const entry of lessons) {
      const list = groups.get(course.units[entry.unitIndex].id) ?? []
      list.push(entry)
      groups.set(course.units[entry.unitIndex].id, list)
    }
    return groups
  }, [course.units, lessons])

  if (course.units.length === 0) {
    return (
      <p className="text-[13px] text-zinc-400 dark:text-zinc-500">
        {t('freeCourse.page.empty')}
      </p>
    )
  }

  return (
    <div className="flex flex-col">
      <h4 className="text-[13px] font-medium text-zinc-500 dark:text-zinc-400">
        {t('freeCourse.page.outline')}
      </h4>
      <div className="mt-2 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/70">
          {course.units.map((unit, unitIndex) => (
            <li key={unit.id} className="py-1">
              <div className="flex items-baseline gap-2 px-3 py-1.5">
                <span className="shrink-0 text-[11px] tabular-nums text-zinc-400">
                  {unitIndex + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-zinc-800 dark:text-zinc-100">
                  {unit.title}
                </span>
              </div>
              <ul>
                {(byUnit.get(unit.id) ?? []).map((entry) => (
                  <LessonRow
                    key={entry.lesson.id}
                    courseId={course.id}
                    entry={entry}
                  />
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export function FreeCourseDetailView() {
  const { id } = useParams<{ id: string }>()
  const { t } = useAppTranslation()
  const detailQuery = useFreeCourseDetail(id)

  const chips = useMemo(
    () => intentChips(detailQuery.data?.intent),
    [detailQuery.data?.intent]
  )

  const lessons = useMemo<LessonEntry[]>(() => {
    const course = detailQuery.data
    if (!course) return []
    return course.units.flatMap((unit, unitIndex) =>
      unit.lessons.map((lesson, lessonIndex) => ({
        lesson,
        unitIndex,
        lessonIndex,
      }))
    )
  }, [detailQuery.data])

  const finishedCount = useMemo(
    () =>
      lessons.filter(
        (entry) => (entry.lesson.progress?.state ?? '') === 'finished'
      ).length,
    [lessons]
  )

  const next = useMemo(() => nextEntry(lessons), [lessons])

  if (detailQuery.isPending) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-sm text-zinc-400 dark:text-zinc-500">
        <Spinner className="size-4" />
        <span>{t('freeCourse.loading')}</span>
      </div>
    )
  }

  if (detailQuery.isError || !detailQuery.data) {
    return <ErrorState />
  }

  const course = detailQuery.data
  const blueprintHref = `/free-course/${course.id}/blueprint`
  // A course is `ready` when the whole pipeline has landed. Anything else is
  // still being generated (the backend calls that state "materializing") or
  // gave up ("failed") — and the card below handles both, including the retry,
  // so this page only has to decide between "enter the course" and "the build
  // card". More than half the time a learner opens this page it is because they
  // left mid-build, so this page has to be the way back in, not a dead end with
  // an empty tree.
  const isReady = course.status === 'ready'

  const ctaLabel =
    next === null
      ? null
      : next.state === 'finished'
        ? t('freeCourse.page.startOver')
        : next.state === 'in_progress'
          ? t('freeCourse.page.resume')
          : t('freeCourse.page.startHere')

  return (
    <div className="scrollbar-fade h-full overflow-y-auto px-6 py-8">
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-6">
        <div>
          <p className="text-[11px] font-medium tracking-[0.06em] text-zinc-400 dark:text-zinc-500">
            {t('freeCourse.badge')}
          </p>
          <h1 className="mt-2 text-[26px] font-semibold leading-9 tracking-tight text-zinc-950 dark:text-zinc-50">
            {course.title}
          </h1>
          {course.summary ? (
            <p className="mt-3 max-w-[620px] text-[15px] leading-7 text-zinc-600 dark:text-zinc-300">
              {course.summary}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isReady ? (
            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[12.5px] text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
              {lessons.length} {t('freeCourse.lessons')} · {course.units.length}{' '}
              {t('freeCourse.units')}
            </span>
          ) : null}
          {course.audience ? (
            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[12.5px] text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
              {course.audience}
            </span>
          ) : null}
        </div>

        {chips.length > 0 ? (
          <div className="flex flex-row flex-wrap gap-1.5">
            {chips.map((chip, index) => (
              <span
                key={index}
                className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[12px] leading-4 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
              >
                {chip}
              </span>
            ))}
          </div>
        ) : null}

        {isReady ? (
          <>
            {/* "Taught to the end of the board", not "mastered" — the count says
                what it counts so the number cannot be read as a grade. */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[13px] tabular-nums text-zinc-500 dark:text-zinc-400">
                {t('freeCourse.page.progress', {
                  done: finishedCount,
                  total: lessons.length,
                })}
              </span>
              <span className="h-1 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <span
                  className="block h-full rounded-full bg-[#4c6694] transition-[width] duration-500"
                  style={{
                    width: `${
                      lessons.length === 0
                        ? 0
                        : Math.round((finishedCount / lessons.length) * 100)
                    }%`,
                  }}
                />
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                disabled={!next}
                className="h-[38px] rounded-full px-5 text-[14px] font-normal bg-zinc-950 text-white hover:bg-zinc-800"
                asChild={Boolean(next)}
              >
                {next ? (
                  <Link to={lessonHref(course.id, next.entry)}>
                    {ctaLabel}
                    <ArrowRight className="size-4" />
                  </Link>
                ) : (
                  <span>{t('freeCourse.page.startHere')}</span>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="h-[38px] rounded-full px-5 text-[14px] font-normal border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                asChild
              >
                <Link to={blueprintHref}>
                  {t('freeCourse.viewBlueprint')}
                  <ArrowUpRight className="size-4" />
                </Link>
              </Button>

              {next ? (
                <span className="text-[12.5px] text-zinc-400 dark:text-zinc-500">
                  {t('freeCourse.page.targetAt', {
                    unit: next.entry.unitIndex + 1,
                    lesson: next.entry.lessonIndex + 1,
                  })}
                </span>
              ) : null}
            </div>

            <CourseOutline course={course} lessons={lessons} />
          </>
        ) : (
          // Still generating (or failed): the build card IS the "continue" —
          // it resumes the stream, asks the questionnaire when the pipeline
          // stops for one, and offers the blueprint once the course is ready.
          // Same component as in the conversation, because it is the same
          // thing: a card that hydrates itself from a courseId.
          <ConversationFreeCourseTool courseId={course.id} />
        )}
      </div>
    </div>
  )
}
