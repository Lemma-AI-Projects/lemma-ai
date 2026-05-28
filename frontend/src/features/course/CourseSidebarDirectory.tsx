import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  BookOpen,
  ChevronRight,
  ClipboardCheck,
  FileText,
  PencilLine,
  PlayCircle,
  type LucideIcon,
} from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { courseItems } from '@/mock/courseItems'

type Course = (typeof courseItems)[number]
type CourseChapter = Course['units'][number]['chapters'][number]

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

function CourseDirectoryLink({
  label,
  href,
  depth = 0,
  muted = false,
}: {
  label: string
  href: string
  depth?: 0 | 1
  muted?: boolean
}) {
  return (
    <a
      href={href}
      className={cn(
        'flex h-9 w-full items-center gap-2 rounded-sm text-sm transition-colors hover:bg-zinc-200/70',
        depth === 0 ? 'px-3' : 'pl-8 pr-3',
        muted ? 'text-zinc-600' : 'text-black'
      )}
    >
      <span className="truncate">{label}</span>
    </a>
  )
}

function CourseDirectoryMetaLink({
  icon: Icon,
  label,
  href,
}: {
  icon: LucideIcon
  label: string
  href: string
}) {
  return (
    <a
      href={href}
      className="flex h-9 w-full items-center gap-2 rounded-sm pl-8 pr-3 text-sm text-zinc-600 transition-colors hover:bg-zinc-200/70 hover:text-black"
    >
      <Icon className="size-4 shrink-0 text-zinc-400" strokeWidth={1.75} />
      <span className="truncate">{label}</span>
    </a>
  )
}

function CourseUnitSection({
  title,
  defaultOpen,
  isCurrentUnit,
  children,
}: {
  title: string
  defaultOpen: boolean
  isCurrentUnit: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  const contentRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number | undefined>(undefined)

  useEffect(() => {
    if (isCurrentUnit) {
      setOpen(true)
    }
  }, [isCurrentUnit])

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
        className="flex h-8 w-full items-center gap-1.5 px-3 text-sm text-zinc-700 hover:text-zinc-900"
      >
        <span className="truncate">{title}</span>
        <ChevronRight
          className={cn(
            'size-3.5 shrink-0 text-zinc-400 transition-transform duration-150',
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
  return (
    <div className="flex flex-col gap-0.5">
      <button
        type="button"
        onClick={onToggle}
        className="flex h-8 w-full items-center gap-1.5 rounded-sm px-3 text-sm text-zinc-700 transition-colors hover:bg-zinc-200/70 hover:text-zinc-900"
      >
        <span className="truncate">{stripOutlinePrefix(chapter.title)}</span>
        <ChevronRight
          className={cn(
            'size-3.5 shrink-0 text-zinc-400 transition-transform duration-150',
            open && 'rotate-90'
          )}
        />
      </button>

      {open && (
        <div className="flex flex-col gap-0.5">
          <CourseDirectoryMetaLink
            icon={FileText}
            label="Chapter overview"
            href={`#${chapter.id}-overview`}
          />
          <CourseDirectoryMetaLink
            icon={PlayCircle}
            label={chapter.video.title}
            href={`#${chapter.id}-video`}
          />
          <CourseDirectoryMetaLink
            icon={ClipboardCheck}
            label="Quiz"
            href={`#${chapter.id}-quiz`}
          />
          <CourseDirectoryMetaLink
            icon={PencilLine}
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

  useEffect(() => {
    if (!currentChapterId) {
      return
    }

    setExpandedChapterIds((current) => {
      if (current.has(currentChapterId)) {
        return current
      }

      const next = new Set(current)
      next.add(currentChapterId)
      return next
    })
  }, [currentChapterId])

  if (!course) {
    return (
      <div className="mt-2 px-3 text-sm text-zinc-500">
        Course not found
      </div>
    )
  }

  return (
    <div className="mt-2 flex flex-col gap-1">
      <div className="px-3 py-2">
        <div className="truncate text-sm font-medium text-black">
          {course.label}
        </div>
      </div>

      {course.units.map((unit) => (
        <CourseUnitSection
          key={unit.id}
          title={stripOutlinePrefix(unit.title)}
          defaultOpen={unit.id === currentUnitId}
          isCurrentUnit={unit.id === currentUnitId}
        >
          <CourseDirectoryMetaLink
            icon={BookOpen}
            label="Unit overview"
            href={`#${unit.id}-overview`}
          />

          {unit.chapters.map((chapter) => (
            <CourseChapterSection
              key={chapter.id}
              chapter={chapter}
              open={expandedChapterIds.has(chapter.id)}
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

          <CourseDirectoryLink
            label="Unit quiz"
            href={`#${unit.id}-quiz`}
            depth={1}
            muted
          />
          <CourseDirectoryLink
            label="Unit assignment"
            href={`#${unit.id}-assignment`}
            depth={1}
            muted
          />
        </CourseUnitSection>
      ))}
    </div>
  )
}
