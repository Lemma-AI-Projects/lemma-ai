import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ChevronRight, CircleCheckBig } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { courseItems } from '@/mock/courseItems'

type Course = (typeof courseItems)[number]
type CourseUnit = Course['units'][number]
type CourseChapter = Course['units'][number]['chapters'][number]
type CourseProgressStatus = Course['units'][number]['overview']['status']

interface CourseAggregateProgress {
  completed: number
  total: number
  percent: number
  status: CourseProgressStatus
}

function stripOutlinePrefix(title: string): string {
  const stripped = title
    .replace(/^(Unit|Chapter)\s+\d+\s*[:：]\s*/i, '')
    .replace(/^第[\d一二三四五六七八九十百千万两]+(单元|章节|章)\s*[:：、.-]?\s*/, '')
    .trim()

  return stripped || title
}

function findCurrentChapterId(course: Course, hash: string): string | null {
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

function findCurrentUnitId(course: Course, chapterId: string | null): string | null {
  if (!chapterId) {
    return null
  }

  return (
    course.units.find((unit) =>
      unit.chapters.some((chapter) => chapter.id === chapterId)
    )?.id ?? null
  )
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

function getCourseProgress(course: Course): CourseAggregateProgress {
  return getAggregateProgress(course.units.flatMap(getUnitTaskStatuses))
}

function BacklogStatusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle
        cx="7"
        cy="7"
        r="6"
        fill="none"
        stroke="#53565A"
        strokeWidth="2"
        strokeDasharray="1.4 1.74"
        strokeDashoffset="0.65"
      />
      <circle
        cx="7"
        cy="7"
        r="2"
        fill="none"
        stroke="#53565A"
        strokeWidth="4"
        strokeDasharray="0 100"
        strokeDashoffset="0"
        transform="rotate(-90 7 7)"
      />
    </svg>
  )
}

function TechnicalReviewStatusIcon({ value }: { value?: number }) {
  const radius = 2
  const circumference = 2 * Math.PI * radius
  const clampedValue = Math.min(Math.max(value ?? 33, 0), 100)
  const offset = circumference * (1 - clampedValue / 100)
  const dynamicProgressProps =
    value === undefined
      ? {
          strokeDasharray: '4.167846253762459 100',
          strokeDashoffset: 0,
        }
      : {
          strokeDasharray: circumference,
          strokeDashoffset: offset,
        }

  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle
        cx="7"
        cy="7"
        r="6"
        fill="none"
        stroke="#22c55e"
        strokeWidth="2"
        strokeDasharray="3.14 0"
        strokeDashoffset="-0.7"
      />
      <circle
        cx="7"
        cy="7"
        r="2"
        fill="none"
        stroke="#22c55e"
        strokeWidth="4"
        {...dynamicProgressProps}
        transform="rotate(-90 7 7)"
      />
    </svg>
  )
}

function CourseProgressStatusIcon({
  status,
  value,
}: {
  status: CourseProgressStatus
  value?: number
}) {
  if (status === 'completed') {
    return <CircleCheckBig className="size-4 text-green-500" />
  }

  if (status === 'in-progress') {
    return <TechnicalReviewStatusIcon value={value} />
  }

  return <BacklogStatusIcon />
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
        <CourseProgressStatusIcon status={status} />
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
  const contentRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number | undefined>(undefined)

  useEffect(() => {
    if (contentRef.current) {
      setHeight(contentRef.current.scrollHeight)
    }
  }, [children, open])

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-8 w-full items-start gap-1.5 px-3 py-1.5 text-left text-sm text-zinc-700 hover:text-zinc-900"
      >
        <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center">
          <CourseProgressStatusIcon
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
        className="overflow-hidden transition-[max-height] duration-200 ease-in-out"
        style={{ maxHeight: open ? height ?? 'none' : 0 }}
      >
        <div ref={contentRef} className="relative flex flex-col gap-0.5 pl-7">
          <div className="absolute top-0 bottom-0 left-[18px] w-px bg-zinc-300" />
          {children}
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
    <div className="flex flex-col gap-0.5">
      <button
        type="button"
        onClick={onToggle}
        className="flex min-h-8 w-full items-start gap-1.5 rounded-sm px-3 py-1.5 text-left text-sm text-zinc-700 transition-colors hover:bg-zinc-200/70 hover:text-zinc-900"
      >
        <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center">
          <CourseProgressStatusIcon
            status={progress.status}
            value={progress.percent}
          />
        </span>
        <span className="min-w-0 flex-1 whitespace-normal break-words leading-5">
          {stripOutlinePrefix(chapter.title)}
        </span>
        <ChevronRight
          className={cn(
            'mt-0.5 size-3.5 shrink-0 text-zinc-400 transition-transform duration-150',
            open && 'rotate-90'
          )}
        />
      </button>

      {open && (
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
      )}
    </div>
  )
}

export function CourseSidebarDirectory({ courseId }: { courseId?: string }) {
  const location = useLocation()
  const course = courseItems.find((item) => item.id === courseId)
  const currentChapterId = useMemo(
    () => (course ? findCurrentChapterId(course, location.hash) : null),
    [course, location.hash]
  )
  const currentUnitId = useMemo(
    () => (course ? findCurrentUnitId(course, currentChapterId) : null),
    [course, currentChapterId]
  )
  const [expandedChapterIds, setExpandedChapterIds] = useState<Set<string>>(
    () => (currentChapterId ? new Set([currentChapterId]) : new Set())
  )
  const visibleExpandedChapterIds = useMemo(() => {
    const next = new Set(expandedChapterIds)

    if (currentChapterId) {
      next.add(currentChapterId)
    }

    return next
  }, [currentChapterId, expandedChapterIds])

  if (!course) {
    return (
      <div className="mt-2 px-3 text-sm text-zinc-500">
        Course not found
      </div>
    )
  }

  const courseProgress = getCourseProgress(course)

  return (
    <div className="mt-2 flex flex-col gap-1">
      <div className="px-3 py-2">
        <div className="flex items-start gap-2 text-sm font-medium text-black">
          <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center">
            <CourseProgressStatusIcon
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
          title={stripOutlinePrefix(unit.title)}
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
              open={visibleExpandedChapterIds.has(chapter.id)}
              onToggle={() =>
                setExpandedChapterIds((current) => {
                  const next = new Set(current)

                  if (next.has(chapter.id)) {
                    next.delete(chapter.id)
                  } else {
                    next.add(chapter.id)
                  }

                  return next
                })
              }
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
