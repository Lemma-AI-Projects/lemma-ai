import { useMemo } from 'react'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useAppTranslation } from '@/i18n'
import { useFreeCourseDetail } from './freeCourseApi'
import type { FreeCourseIntent } from './types'
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

export function FreeCourseDetailView() {
  const { id } = useParams<{ id: string }>()
  const { t } = useAppTranslation()
  const detailQuery = useFreeCourseDetail(id)

  const chips = useMemo(
    () => intentChips(detailQuery.data?.intent),
    [detailQuery.data?.intent]
  )
  const lessonCount = useMemo(
    () =>
      (detailQuery.data?.units ?? []).reduce(
        (sum, unit) => sum + unit.lessons.length,
        0
      ),
    [detailQuery.data?.units]
  )
  const firstLessonHref = useMemo(() => {
    const course = detailQuery.data
    const chapterId = course?.units[0]?.lessons[0]?.id
    return chapterId && course ? `/free-course/${course.id}/lesson/${chapterId}` : null
  }, [detailQuery.data])

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
          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[12.5px] text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            {lessonCount} {t('freeCourse.lessons')} · {course.units.length}{' '}
            {t('freeCourse.units')}
          </span>
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

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            disabled={!firstLessonHref}
            className="h-[38px] rounded-full px-5 text-[14px] font-normal bg-zinc-950 text-white hover:bg-zinc-800"
            asChild={Boolean(firstLessonHref)}
          >
            {firstLessonHref ? (
              <Link to={firstLessonHref}>
                {t('freeCourse.enterFirstLesson')}
                <ArrowRight className="size-4" />
              </Link>
            ) : (
              <span>{t('freeCourse.enterFirstLesson')}</span>
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
        </div>
      </div>
    </div>
  )
}