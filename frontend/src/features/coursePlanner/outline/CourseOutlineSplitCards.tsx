import { useMemo, useState } from 'react'
import { ChevronDown, Maximize2, Waypoints } from 'lucide-react'

import { BacklogStatusIcon } from '@/components/BacklogStatusIcon'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import { CourseOutlineTree } from './CourseOutlineTree'
import { KnowledgeMapCanvas } from './KnowledgeMapCanvas'
import { KnowledgeMapDialog } from './KnowledgeMapDialog'
import { fitKnowledgeMapHeight } from './knowledgeMapViewport'
import { layoutKnowledgeMap } from './layoutKnowledgeMap'
import { Collapse, OutlineCard, OutlineFooter } from './OutlineCardParts'
import { buildOutlineIndex } from './outlineIndex'
import type { CourseOutlineCardProps } from './types'

const MAP_MAX_HEIGHT = 440

const headerIconButtonClassName =
  'size-7 rounded-full p-0 text-zinc-500 hover:bg-zinc-200/60 hover:text-zinc-900'

/**
 * 方案 C：知识地图与课表是两张独立的卡片，按生成顺序上下排列。
 *
 * - 两张卡片从一开始就都在：上面的地图卡先转圈，下面的课表卡处于等待态，
 *   两步的先后就是版面本身。
 * - 两者同时可见，所以可以双向联动：悬停课表里的某节课，地图高亮这节课的知识点
 *   及其前置；悬停地图上的知识点，课表里对应的胶囊也会点亮。
 * - 没有视图切换；地图卡可以单独收起成一行，或放大到宽画布。操作只在课表卡上。
 */
export function CourseOutlineSplitCards({
  title,
  outline,
  phase,
  progress,
  lessonMarker,
  onEdit,
  onCancel,
  onConfirm,
}: CourseOutlineCardProps) {
  const index = useMemo(() => buildOutlineIndex(outline), [outline])
  const layout = useMemo(
    () => layoutKnowledgeMap(outline.knowledgePoints, outline.prerequisites),
    [outline]
  )
  const [mapCollapsed, setMapCollapsed] = useState(false)
  const [mapOpen, setMapOpen] = useState(false)
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null)
  const [focusedLessonId, setFocusedLessonId] = useState<string | null>(null)

  const mapping = phase === 'mapping'
  const ready = phase === 'ready'
  const mapHeight = fitKnowledgeMapHeight(layout, MAP_MAX_HEIGHT)

  const focusIds = focusedLessonId
    ? index.lessonById.get(focusedLessonId)?.lesson.knowledgePointIds
    : undefined
  // 地图上的焦点反过来点亮课表里的知识点胶囊：它自己和它的直接前置。
  const highlightedPointIds = useMemo(
    () =>
      activeNodeId
        ? new Set([activeNodeId, ...(index.prerequisitesOf.get(activeNodeId) ?? [])])
        : null,
    [activeNodeId, index]
  )

  return (
    <div className="flex w-full max-w-[36rem] flex-col gap-3">
      <OutlineCard className="py-4">
        <div className="flex min-h-7 items-center gap-2">
          <span className="flex size-4 shrink-0 items-center justify-center">
            {mapping ? (
              <Spinner
                aria-label="正在梳理知识地图"
                className="size-[17px] text-zinc-900"
              />
            ) : (
              <Waypoints className="size-4 text-zinc-700" />
            )}
          </span>
          <h3 className="min-w-0 flex-1 truncate text-[16.5px] font-medium leading-5 text-zinc-800">
            {mapping ? '正在梳理知识地图' : '知识地图'}
          </h3>
          <div className="-mr-1.5 flex shrink-0 items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              disabled={mapping}
              aria-label="放大查看知识地图"
              title="放大查看"
              onClick={() => setMapOpen(true)}
              className={headerIconButtonClassName}
            >
              <Maximize2 className="size-[14px]" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={mapping}
              aria-expanded={!mapCollapsed}
              aria-label={mapCollapsed ? '展开知识地图' : '收起知识地图'}
              title={mapCollapsed ? '展开' : '收起'}
              onClick={() => setMapCollapsed((current) => !current)}
              className={headerIconButtonClassName}
            >
              <ChevronDown
                className={cn(
                  'size-4 transition-transform duration-200',
                  mapCollapsed && '-rotate-90'
                )}
              />
            </Button>
          </div>
        </div>

        <Collapse open={mapping || !mapCollapsed}>
          <div className="pt-3">
            <KnowledgeMapCanvas
              layout={layout}
              height={mapHeight}
              revealedCount={mapping ? progress.knowledgePointCount : undefined}
              focusIds={focusIds}
              interactive={!mapping}
              onActiveNodeChange={setActiveNodeId}
            />
          </div>
        </Collapse>
      </OutlineCard>

      <OutlineCard>
        <h3
          className={cn(
            'flex items-start gap-2 text-[19.5px] font-semibold leading-7 tracking-tight transition-colors duration-300',
            mapping ? 'text-zinc-400' : 'text-zinc-900'
          )}
        >
          {ready ? null : (
            <span className="flex h-7 w-5 shrink-0 translate-y-[1px] items-center justify-center">
              {mapping ? (
                <span className="opacity-60">
                  <BacklogStatusIcon />
                </span>
              ) : (
                <Spinner
                  aria-label="正在编排课表"
                  className="size-[17px] text-zinc-900"
                />
              )}
            </span>
          )}
          <span className="min-w-0">
            {mapping ? '等待编排课表：' : ready ? '您的课程已就绪：' : '正在编排课表：'}
            {title}
          </span>
        </h3>

        {mapping ? null : (
          <CourseOutlineTree
            chapters={outline.chapters}
            index={index}
            revealedLessonCount={ready ? undefined : progress.lessonCount}
            generating={!ready}
            lessonMarker={lessonMarker}
            highlightedPointIds={highlightedPointIds}
            onLessonFocus={setFocusedLessonId}
            className="mt-3"
          />
        )}

        <OutlineFooter
          phase={phase}
          onEdit={onEdit}
          onCancel={onCancel}
          onConfirm={onConfirm}
        />
      </OutlineCard>

      <KnowledgeMapDialog
        open={mapOpen}
        onOpenChange={setMapOpen}
        title={title}
        outline={outline}
        index={index}
        layout={layout}
      />
    </div>
  )
}
