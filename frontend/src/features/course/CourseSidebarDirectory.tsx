import { useMemo, useState, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import {
  ProgressStatusIcon,
  type ProgressStatus,
} from '@/components/ProgressStatusIcon'
import {
  mapLearningStatus,
  rollupStatus,
  useLearningCourseQuery,
  type LearningCourse,
  type LearningUnit,
} from '@/features/course/courseLearningApi'
import { cn } from '@/lib/utils'

function findCurrentChapterId(course: LearningCourse, hash: string): string | null {
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

function findCurrentUnitId(course: LearningCourse, hash: string): string | null {
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

function unitChapterStatuses(unit: LearningUnit): ProgressStatus[] {
  return unit.chapters.map((chapter) => mapLearningStatus(chapter.status))
}

function CourseUnitSection({
  title,
  status,
  percent,
  defaultOpen,
  children,
}: {
  title: string
  status: ProgressStatus
  percent: number
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
          <ProgressStatusIcon status={status} value={percent} />
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

export function CourseSidebarDirectory({ courseId }: { courseId?: string }) {
  const location = useLocation()
  const courseQuery = useLearningCourseQuery(courseId)
  const course = courseQuery.data
  const currentChapterId = useMemo(
    () => (course ? findCurrentChapterId(course, location.hash) : null),
    [course, location.hash]
  )
  const currentUnitId = useMemo(
    () => (course ? findCurrentUnitId(course, location.hash) : null),
    [course, location.hash]
  )

  if (courseQuery.isPending) {
    return <div className="mt-2 px-3 text-sm text-zinc-500">加载中…</div>
  }

  if (!course) {
    return (
      <div className="mt-2 px-3 text-sm text-zinc-500">Course not found</div>
    )
  }

  const courseStatus = rollupStatus(course.units.flatMap(unitChapterStatuses))

  return (
    <div className="mt-2 flex flex-col gap-1">
      <div className="px-3 py-2">
        <div className="flex items-start gap-2 text-sm font-medium text-black">
          <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center">
            <ProgressStatusIcon status={courseStatus} value={course.progress} />
          </span>
          <span className="min-w-0 flex-1 whitespace-normal break-words leading-5">
            {course.title}
          </span>
        </div>
      </div>

      {course.units.map((unit) => (
        <CourseUnitSection
          key={`${unit.id}-${unit.id === currentUnitId ? 'current' : 'idle'}`}
          title={unit.title}
          status={rollupStatus(unitChapterStatuses(unit))}
          percent={unit.progress}
          defaultOpen={unit.id === currentUnitId}
        >
          {unit.chapters.map((chapter) => {
            const status = mapLearningStatus(chapter.status)
            const active = chapter.id === currentChapterId

            return (
              <a
                key={chapter.id}
                href={`#${chapter.id}-video`}
                className={cn(
                  'flex min-h-9 w-full items-start gap-2 rounded-sm py-2 pl-8 pr-3 text-sm transition-colors hover:bg-zinc-200/70 hover:text-black',
                  active ? 'bg-zinc-200/70 text-black' : 'text-zinc-600'
                )}
              >
                <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center">
                  <ProgressStatusIcon
                    status={status}
                    value={status === 'in-progress' ? chapter.progress : undefined}
                  />
                </span>
                <span className="min-w-0 flex-1 whitespace-normal break-words leading-5">
                  {chapter.title}
                </span>
              </a>
            )
          })}
        </CourseUnitSection>
      ))}
    </div>
  )
}
