import { useMemo } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useAppTranslation } from '@/i18n'
import {
  useFreeCourseDetail,
} from './freeCourseApi'
import {
  FreeCourseBlueprintCanvas,
  type FreeCourseBlueprintNode,
} from './FreeCourseBlueprintCanvas'
import type { FreeUnit } from './types'

// Node geometry: one column per unit, lessons stacked under it. Kept local so
// the canvas primitive stays generic (coordinates are world-space, host decides
// how to place nodes).
const UNIT_COL_GAP = 236
const LESSON_ROW_GAP = 118
const UNIT_TOP = 16
const LESSON_TOP = 96

function layoutBlueprint(units: FreeUnit[]): FreeCourseBlueprintNode[] {
  const nodes: FreeCourseBlueprintNode[] = []
  units.forEach((unit, unitIndex) => {
    const colX = unitIndex * UNIT_COL_GAP
    nodes.push({
      id: unit.id,
      kind: 'unit',
      title: unit.title,
      objective: unit.objective ?? undefined,
      x: colX,
      y: UNIT_TOP,
    })
    unit.lessons.forEach((lesson, lessonIndex) => {
      nodes.push({
        id: lesson.id,
        kind: 'lesson',
        title: lesson.title,
        objective: lesson.objective ?? undefined,
        x: colX,
        y: LESSON_TOP + lessonIndex * LESSON_ROW_GAP,
      })
    })
  })
  return nodes
}

function firstLesson(courseId: string, units: FreeUnit[]) {
  const chapterId = units[0]?.lessons[0]?.id
  return chapterId ? `/free-course/${courseId}/lesson/${chapterId}` : null
}

export function FreeCourseBlueprintView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useAppTranslation()
  const detailQuery = useFreeCourseDetail(id)

  const nodes = useMemo(
    () => layoutBlueprint(detailQuery.data?.units ?? []),
    [detailQuery.data?.units]
  )

  if (detailQuery.isPending) {
    return <LoadingState />
  }

  if (detailQuery.isError || !detailQuery.data) {
    return <ErrorState />
  }

  const course = detailQuery.data
  const firstLessonHref = firstLesson(course.id, course.units)

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
            {course.title}
          </h1>
          <p className="truncate text-[12px] leading-4 text-zinc-400 dark:text-zinc-500">
            {t('freeCourse.blueprintTitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={!firstLessonHref}
            className={secondaryActionClassName}
            onClick={() => firstLessonHref && navigate(firstLessonHref)}
          >
            {t('freeCourse.generateFirstLesson')}
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
      </header>

      <div className="min-h-0 flex-1 p-6">
        <FreeCourseBlueprintCanvas
          nodes={nodes}
          zoom={100}
          className="h-full"
        />
      </div>
    </div>
  )
}

const secondaryActionClassName =
  'h-[33px] rounded-full px-[12.5px] text-[13.5px] font-normal border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-100'

export function LoadingState() {
  const { t } = useAppTranslation()
  return (
    <div className="flex h-full items-center justify-center gap-2 text-sm text-zinc-400 dark:text-zinc-500">
      <Spinner className="size-4" />
      <span>{t('freeCourse.loading')}</span>
    </div>
  )
}

export function ErrorState() {
  const { t } = useAppTranslation()
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-sm text-zinc-400 dark:text-zinc-500">
      <p>{t('freeCourse.loadFailed')}</p>
      <Link to="/courses" className="text-[13px] text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
        {t('freeCourse.backToCourses')}
      </Link>
    </div>
  )
}