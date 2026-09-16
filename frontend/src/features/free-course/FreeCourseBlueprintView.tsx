import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Minus, Plus } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useAppTranslation } from '@/i18n'
import {
  useFreeCourseDetail,
} from './freeCourseApi'
import { FreeCourseDepthChips } from './FreeCourseDepthChips'
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

// Zoom lives with the host, like the learn space top bar: the canvas is a
// controlled view and the controls are just a caller. Same 50-200% / 10% step
// clamp so the two canvases do not teach different gestures.
const ZOOM_MIN = 50
const ZOOM_MAX = 200
const ZOOM_STEP = 10

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
  const [zoom, setZoom] = useState(100)

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
  const lessonTotal = course.units.reduce(
    (sum, unit) => sum + unit.lessons.length,
    0
  )

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
          <div className="flex items-center gap-2">
            <h1 className="truncate text-[17px] font-semibold leading-6 text-zinc-900 dark:text-zinc-100">
              {course.title}
            </h1>
            {/*
              规模徽章：参考稿里标题旁边就挂着"几节课"。不是装饰 ——
              用户在这一屏要判断的正是"这个量对不对"，先把数字给他。
            */}
            {lessonTotal > 0 && (
              <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-[1px] text-[11.5px] leading-5 tabular-nums text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                {t('freeCourse.structure.summary', {
                  units: course.units.length,
                  lessons: lessonTotal,
                })}
              </span>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5">
            <p className="truncate text-[12px] leading-4 text-zinc-400 dark:text-zinc-500">
              {t('freeCourse.blueprintTitle')}
            </p>
            {course.audience && (
              <p className="truncate text-[12px] leading-4 text-zinc-400 dark:text-zinc-500">
                · {course.audience}
              </p>
            )}
          </div>
          {/*
            已落库的问卷答案。这一屏才真正需要它 —— 生成完之后，用户
            没有别的地方能想起"我当初让它按什么深度/体量生成"。
          */}
          <FreeCourseDepthChips dims={course.tuning} className="mt-1.5" />
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

      <div className="relative min-h-0 flex-1 p-6">
        <FreeCourseBlueprintCanvas
          nodes={nodes}
          zoom={zoom}
          className="h-full"
        />

        {/* Zoom cluster (screen 4's bottom-right control). Disabled at the
            clamp ends rather than silently doing nothing. */}
        <div className="absolute right-9 bottom-9 flex flex-col overflow-hidden rounded-full border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
          <button
            type="button"
            onClick={() => setZoom((value) => Math.min(ZOOM_MAX, value + ZOOM_STEP))}
            disabled={zoom >= ZOOM_MAX}
            aria-label={t('freeCourse.zoomIn')}
            className={zoomButtonClassName}
          >
            <Plus className="size-3.5" />
          </button>
          <span className="h-px bg-zinc-200 dark:bg-zinc-700" />
          <button
            type="button"
            onClick={() => setZoom((value) => Math.max(ZOOM_MIN, value - ZOOM_STEP))}
            disabled={zoom <= ZOOM_MIN}
            aria-label={t('freeCourse.zoomOut')}
            className={zoomButtonClassName}
          >
            <Minus className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

const zoomButtonClassName =
  'flex size-8 items-center justify-center text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-default disabled:opacity-35 disabled:hover:bg-transparent dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'

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