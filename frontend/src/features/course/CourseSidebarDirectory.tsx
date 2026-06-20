import { useMemo, useState, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { ProgressStatusIcon } from '@/components/ProgressStatusIcon'
import {
  mapLearningCourseToCourseItem,
  useLearningCourseQuery,
} from '@/features/course/courseLearningApi'
import { cn } from '@/lib/utils'
import type {
  CourseChapter,
  CourseItem,
  CourseProgressStatus,
  CourseUnit,
} from '@/mock/course/courseItems'

interface CourseAggregateProgress {
  completed: number
  total: number
  percent: number
  status: CourseProgressStatus
}

function findCurrentChapterId(course: CourseItem, hash: string): string | null {
  const targetId = decodeURIComponent(hash.replace(/^#/, ''))

  if (!targetId) {
    return course.units[0]?.chapters[0]?.id ?? null
  }

  for (const unit of course.units) {
    for (const chapter of unit.chapters) {
      if (targetId === chapter.id || targetId.startsWith(`${chapter.id}-`)) {
        return chapter.id
      }
    }
  }

  return null
}

function findCurrentUnitId(course: CourseItem, hash: string): string | null {
  const targetId = decodeURIComponent(hash.replace(/^#/, ''))

  if (!targetId) {
    return course.units[0]?.id ?? null
  }

  for (const unit of course.units) {
    if (targetId === unit.id || targetId.startsWith(`${unit.id}-`)) {
      return unit.id
    }

    for (const chapter of unit.chapters) {
      if (targetId === chapter.id || targetId.startsWith(`${chapter.id}-`)) {
        return unit.id
      }
    }
  }

  return null
}

function getChapterTaskStatuses(chapter: CourseChapter): CourseProgressStatus[] {
  return [
    chapter.overview.status,
    chapter.video.status,
    chapter.quiz.status,
    chapter.assignment.status,
  ]
}

function getAggregateProgress(statuses: CourseProgressStatus[]): CourseAggregateProgress {
  const completed = statuses.filter((status) => status === 'completed').length
  const total = statuses.length
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0

  if (completed === total && total > 0) {
    return { completed, total, percent, status: 'completed' }
  }

  if (completed > 0) {
    return { completed, total, percent, status: 'in-progress' }
  }

  return { completed, total, percent, status: 'not-started' }
}

function getChapterProgress(chapter: CourseChapter): CourseAggregateProgress {
  return getAggregateProgress(getChapterTaskStatuses(chapter))
}

function getUnitTaskStatuses(unit: CourseUnit): CourseProgressStatus[] {
  return [
    unit.overview.status,
    ...unit.chapters.flatMap(getChapterTaskStatuses),
    unit.quiz.status,
    unit.assignment.status,
  ]
}

function getUnitProgress(unit: CourseUnit): CourseAggregateProgress {
  return getAggregateProgress(getUnitTaskStatuses(unit))
}

function getCourseProgress(course: CourseItem): CourseAggregateProgress {
  return getAggregateProgress(course.units.flatMap(getUnitTaskStatuses))
}

function CourseDirectoryMetaLink({
  status,
  label,
  href,
}: {
  status: CourseProgressStatus
  label: string
  href: string
}) {
  return (
    <a
      href={href}
      className="flex min-h-9 w-full items-start gap-2 rounded-sm py-2 pl-8 pr-3 text-sm text-zinc-600 transition-colors hover:bg-zinc-200/70 hover:text-black"
    >
      <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center">
        <ProgressStatusIcon status={status} />
      </span>
      <span className="min-w-0 flex-1 whitespace-normal break-words leading-5">
        {label}
      </span>
    </a>
  )
}

function CourseUnitSection({
  title,
  progress,
  defaultOpen,
  children,
}: {
  title: string
  progress: CourseAggregateProgress
  defaultOpen: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-8 w-full items-start gap-1.5 px-3 py-1.5 text-left text-sm text-zinc-700 hover:text-zinc-900"
      >
        <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center">
          <ProgressStatusIcon
            status={progress.status}
            value={progress.percent}
          />
        </span>
        <span className="min-w-0 flex-1 whitespace-normal break-words leading-5">
          {title}
        </span>
        <ChevronRight
          className={cn(
            'mt-0.5 size-3.5 shrink-0 text-zinc-400 transition-transform duration-150',
            open && 'rotate-90'
          )}
        />
      </button>

      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-200 ease-in-out',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="overflow-hidden">
          <div className="relative flex flex-col gap-0.5 pl-7">
            <div className="absolute top-0 bottom-0 left-[18px] w-px bg-zinc-300" />
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

function CourseChapterSection({
  chapter,
  open,
  onToggle,
}: {
  chapter: CourseChapter
  open: boolean
  onToggle: () => void
}) {
  const progress = getChapterProgress(chapter)

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={onToggle}
        className="flex min-h-8 w-full items-start gap-1.5 rounded-sm px-3 py-1.5 text-left text-sm text-zinc-700 transition-colors hover:bg-zinc-200/70 hover:text-zinc-900"
      >
        <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center">
          <ProgressStatusIcon
            status={progress.status}
            value={progress.percent}
          />
        </span>
        <span className="min-w-0 flex-1 whitespace-normal break-words leading-5">
          {chapter.title}
        </span>
        <ChevronRight
          className={cn(
            'mt-0.5 size-3.5 shrink-0 text-zinc-400 transition-transform duration-150',
            open && 'rotate-90'
          )}
        />
      </button>

      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-200 ease-in-out',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col gap-0.5">
            <CourseDirectoryMetaLink
              status={chapter.overview.status}
              label="Chapter overview"
              href={`#${chapter.id}-overview`}
            />
            <CourseDirectoryMetaLink
              status={chapter.video.status}
              label={chapter.video.title}
              href={`#${chapter.id}-video`}
            />
            <CourseDirectoryMetaLink
              status={chapter.quiz.status}
              label="Quiz"
              href={`#${chapter.id}-quiz`}
            />
            <CourseDirectoryMetaLink
              status={chapter.assignment.status}
              label="Assignment"
              href={`#${chapter.id}-assignment`}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export function CourseSidebarDirectory({ courseId }: { courseId?: string }) {
  const location = useLocation()
  // 真实课程树映射到既有 CourseItem 形态：video 状态来自后端章节，
  // overview/quiz/assignment 为占位（本步只做 video，其余页面占位）。
  const courseQuery = useLearningCourseQuery(courseId)
  const course = useMemo(
    () =>
      courseQuery.data
        ? mapLearningCourseToCourseItem(courseQuery.data)
        : undefined,
    [courseQuery.data]
  )
  const currentChapterId = useMemo(
    () => (course ? findCurrentChapterId(course, location.hash) : null),
    [course, location.hash]
  )
  const currentUnitId = useMemo(
    () => (course ? findCurrentUnitId(course, location.hash) : null),
    [course, location.hash]
  )
  const [chapterOpenOverrides, setChapterOpenOverrides] = useState<
    Record<string, boolean>
  >({})

  const isChapterOpen = (chapterId: string) =>
    chapterOpenOverrides[chapterId] ?? chapterId === currentChapterId

  const toggleChapterOpen = (chapterId: string) => {
    setChapterOpenOverrides((current) => {
      const currentlyOpen = current[chapterId] ?? chapterId === currentChapterId

      return {
        ...current,
        [chapterId]: !currentlyOpen,
      }
    })
  }

  if (courseQuery.isPending) {
    return <div className="mt-2 px-3 text-sm text-zinc-500">加载中…</div>
  }

  if (!course) {
    return (
      <div className="mt-2 px-3 text-sm text-zinc-500">Course not found</div>
    )
  }

  const courseProgress = getCourseProgress(course)

  return (
    <div className="mt-2 flex flex-col gap-1">
      <div className="px-3 py-2">
        <div className="flex items-start gap-2 text-sm font-medium text-black">
          <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center">
            <ProgressStatusIcon
              status={courseProgress.status}
              value={courseProgress.percent}
            />
          </span>
          <span className="min-w-0 flex-1 whitespace-normal break-words leading-5">
            {course.label}
          </span>
        </div>
      </div>

      {course.units.map((unit) => (
        <CourseUnitSection
          key={`${unit.id}-${unit.id === currentUnitId ? 'current' : 'idle'}`}
          title={unit.title}
          progress={getUnitProgress(unit)}
          defaultOpen={unit.id === currentUnitId}
        >
          <CourseDirectoryMetaLink
            status={unit.overview.status}
            label="Unit overview"
            href={`#${unit.id}-overview`}
          />

          {unit.chapters.map((chapter) => (
            <CourseChapterSection
              key={chapter.id}
              chapter={chapter}
              open={isChapterOpen(chapter.id)}
              onToggle={() => toggleChapterOpen(chapter.id)}
            />
          ))}

          <CourseDirectoryMetaLink
            status={unit.quiz.status}
            label="Unit quiz"
            href={`#${unit.id}-quiz`}
          />
          <CourseDirectoryMetaLink
            status={unit.assignment.status}
            label="Unit assignment"
            href={`#${unit.id}-assignment`}
          />
        </CourseUnitSection>
      ))}
    </div>
  )
}
