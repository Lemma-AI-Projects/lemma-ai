import { useState } from 'react'
import { BookOpen, ChevronDown, CirclePlay } from 'lucide-react'

import { BacklogStatusIcon } from '@/components/BacklogStatusIcon'
import { cn } from '@/lib/utils'
import { Collapse, KnowledgePointChip, Reveal } from './OutlineCardParts'
import type { OutlineIndex } from './outlineIndex'
import type {
  LessonMarkerStyle,
  OutlineChapter,
  OutlineLesson,
  OutlineUnit,
} from './types'

// 课表视图：章 → 单元 → 课 → 知识点。
//
// 36rem 宽的卡片放不下四层全展开，所以默认只露出 章 → 单元 两层（与现有
// 「已就绪」卡片等高等密度），课和知识点收在单元里按需展开；整章也可以收起。
//
// 生成中按课表顺序一节一节地浮现：单元在它的第一节课开始编排时出现，正在编排的
// 那个单元展开、其余收起，所以卡片高度始终有限。正在编排的那节课，课标题前的
// 图标是动态的；编排完就静下来。

// 虚线节奏与 BacklogStatusIcon 相同（1.4 + 1.74 ≈ π），半径取整数时一圈刚好整数段。
const RING_DASH = '1.4 1.74'

/** 细线转圈：ring-thin 的编排中样子，也是 book / play 编排完之前的占位。 */
function ThinSpinner() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      className="animate-spin motion-reduce:animate-none"
    >
      <circle cx="6" cy="6" r="5" stroke="#e4e4e7" strokeWidth="1.25" />
      <circle
        cx="6"
        cy="6"
        r="5"
        stroke="#52525b"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeDasharray="8 24"
      />
    </svg>
  )
}

function LessonMarker({
  style,
  generating,
}: {
  style: LessonMarkerStyle
  generating: boolean
}) {
  let icon
  if (style === 'ring') {
    icon = (
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        className={cn(
          'transition-colors duration-300',
          generating
            ? 'animate-spin text-zinc-600 [animation-duration:2.4s] motion-reduce:animate-none'
            : 'text-zinc-400'
        )}
      >
        <circle
          cx="6"
          cy="6"
          r="5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray={RING_DASH}
          strokeDashoffset="0.65"
        />
      </svg>
    )
  } else if (style === 'square') {
    // pathLength 把周长归一成 36，正好 12 段，接缝处不会多出半段。
    icon = (
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        className={cn(
          'transition-colors duration-300',
          generating ? 'text-zinc-600' : 'text-zinc-400'
        )}
      >
        <rect
          x="1"
          y="1"
          width="10"
          height="10"
          rx="2.5"
          pathLength="36"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="1.4 1.6"
        >
          {generating ? (
            <animate
              attributeName="stroke-dashoffset"
              from="0"
              to="-6"
              dur="0.9s"
              repeatCount="indefinite"
            />
          ) : null}
        </rect>
      </svg>
    )
  } else if (style === 'ring-thin') {
    icon = generating ? (
      <ThinSpinner />
    ) : (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <circle cx="6" cy="6" r="5" stroke="#a1a1aa" strokeWidth="1.25" />
      </svg>
    )
  } else {
    const Icon = style === 'book' ? BookOpen : CirclePlay
    icon = generating ? (
      <ThinSpinner />
    ) : (
      <Icon
        strokeWidth={1.75}
        className="size-3.5 text-zinc-400 animate-in fade-in-0 zoom-in-75 duration-300"
      />
    )
  }

  return (
    <span aria-hidden className="flex h-5 w-4 shrink-0 items-center justify-center">
      {icon}
    </span>
  )
}

function LessonBlock({
  lesson,
  index,
  marker,
  generating,
  highlightedPointIds,
  onLessonFocus,
}: {
  lesson: OutlineLesson
  index: OutlineIndex
  marker: LessonMarkerStyle
  /** 这节课正在编排。 */
  generating: boolean
  highlightedPointIds?: ReadonlySet<string> | null
  onLessonFocus?: (lessonId: string | null) => void
}) {
  return (
    <div
      aria-busy={generating || undefined}
      className="flex gap-2"
      onPointerEnter={() => onLessonFocus?.(lesson.id)}
      onPointerLeave={() => onLessonFocus?.(null)}
    >
      <LessonMarker style={marker} generating={generating} />
      <div className="min-w-0 flex-1">
        <p className="text-[14.5px] leading-5 text-zinc-700">
          <span className="sr-only">第 {lesson.number} 课 </span>
          {lesson.title}
        </p>
        <ul className="mt-1.5 flex flex-wrap gap-1.5">
          {lesson.knowledgePointIds.map((pointId) => {
            const point = index.pointById.get(pointId)
            if (!point) return null
            return (
              <li key={pointId} className="flex min-w-0">
                <KnowledgePointChip
                  point={point}
                  highlighted={highlightedPointIds?.has(pointId)}
                />
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

function UnitRow({
  unit,
  lessons,
  index,
  expanded,
  generating,
  activeLessonId,
  lessonMarker,
  highlightedPointIds,
  onToggle,
  onLessonFocus,
}: {
  unit: OutlineUnit
  /** 已经浮现的课；就绪后就是全部。 */
  lessons: OutlineLesson[]
  index: OutlineIndex
  expanded: boolean
  generating: boolean
  activeLessonId: string | undefined
  lessonMarker: LessonMarkerStyle
  highlightedPointIds?: ReadonlySet<string> | null
  onToggle: () => void
  onLessonFocus?: (lessonId: string | null) => void
}) {
  return (
    <Reveal>
      <button
        type="button"
        disabled={generating}
        aria-expanded={expanded}
        onClick={onToggle}
        className="group/unit flex min-h-9 w-full items-start gap-2 rounded-md py-2 text-left text-[15.5px] text-zinc-600 outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
      >
        <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center">
          <BacklogStatusIcon />
        </span>
        <span className="min-w-0 flex-1 whitespace-normal break-words leading-5">
          {unit.title}
        </span>
        <ChevronDown
          aria-hidden
          className={cn(
            'mt-0.5 size-4 shrink-0 text-zinc-300 transition-[transform,opacity,color] duration-200 group-hover/unit:text-zinc-500',
            !expanded && '-rotate-90',
            generating && 'opacity-0'
          )}
        />
      </button>

      <Collapse open={expanded}>
        <div className="relative pb-2.5 pl-8 pt-1">
          <div
            aria-hidden
            className="absolute bottom-2.5 left-2 top-1 w-px -translate-x-1/2 bg-zinc-200"
          />
          {/* 间距放在每节课的上边距里而不是 gap：新浮现的课从 0 高度长出来时，
              间距跟着一起长，不会先蹦出一道空隙。 */}
          {lessons.map((lesson, lessonIndex) => (
            <Reveal key={lesson.id}>
              <div className={lessonIndex > 0 ? 'pt-3' : undefined}>
                <LessonBlock
                  lesson={lesson}
                  index={index}
                  marker={lessonMarker}
                  generating={lesson.id === activeLessonId}
                  highlightedPointIds={highlightedPointIds}
                  onLessonFocus={onLessonFocus}
                />
              </div>
            </Reveal>
          ))}
        </div>
      </Collapse>
    </Reveal>
  )
}

interface ChapterSection {
  chapter: OutlineChapter
  units: { unit: OutlineUnit; lessons: OutlineLesson[] }[]
}

interface RevealedOutline {
  sections: ChapterSection[]
  activeLessonId: string | undefined
  activeUnitId: string | undefined
}

/**
 * 课按课表顺序跨章、跨单元连续计数，据此切出每个单元已经浮现的课，并找出正在
 * 编排的那节课（已浮现的最后一节）和它所在的单元。revealed 省略表示全部浮现。
 */
function revealOutline(
  chapters: OutlineChapter[],
  revealed: number | undefined,
  generating: boolean
): RevealedOutline {
  const visibleCount = revealed ?? Number.POSITIVE_INFINITY
  const activeOrder = generating && revealed !== undefined ? revealed - 1 : -1
  const sections: ChapterSection[] = []
  let activeLessonId: string | undefined
  let activeUnitId: string | undefined
  let cursor = 0

  for (const chapter of chapters) {
    const units: ChapterSection['units'] = []
    for (const unit of chapter.units) {
      const start = cursor
      cursor += unit.lessons.length
      if (activeOrder >= start && activeOrder < cursor) {
        activeLessonId = unit.lessons[activeOrder - start].id
        activeUnitId = unit.id
      }
      const lessons = unit.lessons.slice(0, Math.max(0, visibleCount - start))
      if (lessons.length > 0) units.push({ unit, lessons })
    }
    sections.push({ chapter, units })
  }

  return { sections, activeLessonId, activeUnitId }
}

export function CourseOutlineTree({
  chapters,
  index,
  revealedLessonCount,
  generating = false,
  lessonMarker = 'ring',
  highlightedPointIds,
  onLessonFocus,
  className,
}: {
  chapters: OutlineChapter[]
  index: OutlineIndex
  /** 生成中已浮现的课数（按课表顺序），最后一节正在编排；省略即全部展示。 */
  revealedLessonCount?: number
  generating?: boolean
  lessonMarker?: LessonMarkerStyle
  /** 与知识地图联动时，给课下的知识点胶囊加高亮。 */
  highlightedPointIds?: ReadonlySet<string> | null
  onLessonFocus?: (lessonId: string | null) => void
  className?: string
}) {
  // 默认展开第一个单元，提示「单元可以点开看课和知识点」。
  const [expandedUnitIds, setExpandedUnitIds] = useState<ReadonlySet<string>>(
    () => {
      const first = chapters[0]?.units[0]
      return new Set(first ? [first.id] : [])
    }
  )
  const [collapsedChapterIds, setCollapsedChapterIds] = useState<
    ReadonlySet<string>
  >(() => new Set())

  const toggle = (
    update: (updater: (current: ReadonlySet<string>) => ReadonlySet<string>) => void,
    id: string
  ) => {
    update((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const { sections, activeLessonId, activeUnitId } = revealOutline(
    chapters,
    revealedLessonCount,
    generating
  )

  return (
    <div className={cn('flex flex-col', className)}>
      {sections.map(({ chapter, units }, sectionIndex) => {
        if (units.length === 0) return null
        const collapsed = !generating && collapsedChapterIds.has(chapter.id)

        return (
          <Reveal key={chapter.id}>
            <section className={sectionIndex > 0 ? 'pt-2' : undefined}>
              <button
                type="button"
                disabled={generating}
                aria-expanded={!collapsed}
                onClick={() => toggle(setCollapsedChapterIds, chapter.id)}
                className="group/chapter flex min-h-9 w-full items-start gap-2 rounded-md py-2 text-left text-[16.5px] font-medium text-zinc-800 outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
              >
                <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center">
                  <BacklogStatusIcon />
                </span>
                <span className="min-w-0 flex-1 whitespace-normal break-words leading-5">
                  {chapter.title}
                </span>
                <ChevronDown
                  aria-hidden
                  className={cn(
                    'mt-0.5 size-4 shrink-0 text-zinc-300 transition-[transform,opacity,color] duration-200 group-hover/chapter:text-zinc-500',
                    collapsed && '-rotate-90',
                    generating && 'opacity-0'
                  )}
                />
              </button>

              <Collapse open={!collapsed}>
                <div className="relative mt-1 flex flex-col gap-0.5 pl-8">
                  <div
                    aria-hidden
                    className="absolute bottom-1 left-2 top-1 w-px -translate-x-1/2 bg-zinc-200"
                  />
                  {units.map(({ unit, lessons }) => (
                    <UnitRow
                      key={unit.id}
                      unit={unit}
                      lessons={lessons}
                      index={index}
                      expanded={
                        generating
                          ? unit.id === activeUnitId
                          : expandedUnitIds.has(unit.id)
                      }
                      generating={generating}
                      activeLessonId={activeLessonId}
                      lessonMarker={lessonMarker}
                      highlightedPointIds={highlightedPointIds}
                      onToggle={() => toggle(setExpandedUnitIds, unit.id)}
                      onLessonFocus={onLessonFocus}
                    />
                  ))}
                </div>
              </Collapse>
            </section>
          </Reveal>
        )
      })}
    </div>
  )
}
