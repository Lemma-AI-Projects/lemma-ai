import { useMemo, useState } from 'react'
import { ListTree, Waypoints } from 'lucide-react'

import { AnimatedHeight } from '@/components/AnimatedHeight'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { CourseOutlineTree } from './CourseOutlineTree'
import { KnowledgeMapCanvas } from './KnowledgeMapCanvas'
import { fitKnowledgeMapHeight } from './knowledgeMapViewport'
import { layoutKnowledgeMap } from './layoutKnowledgeMap'
import {
  OutlineCard,
  OutlineFooter,
  OutlineTitle,
  outlineSecondaryButtonClassName,
  type OutlineView,
} from './OutlineCardParts'
import { buildOutlineIndex } from './outlineIndex'
import type { CourseOutlineCardProps } from './types'

const MAP_MAX_HEIGHT = 480

/**
 * 方案 A：同一张卡片内原地切换「知识地图 / 课表」两个视图。
 *
 * - 视图切换按钮在左下角，与「编辑」并排；按钮上写的是切过去的那个视图。
 * - 生成中切换不可用，正文跟着当前步骤走（先地图、后课表）；就绪时正文已经停在
 *   课表上，按钮原地解锁，没有额外的版式变化。
 */
export function CourseOutlineSwitchCard({
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
  const [selectedView, setSelectedView] = useState<OutlineView>('schedule')

  // 生成中视图跟着步骤走，就绪后才由用户决定。
  const view: OutlineView =
    phase === 'mapping' ? 'map' : phase === 'scheduling' ? 'schedule' : selectedView
  const mapHeight = fitKnowledgeMapHeight(layout, MAP_MAX_HEIGHT)

  return (
    <OutlineCard>
      <OutlineTitle phase={phase} title={title} />

      {/* 两个视图都保持挂载，切换只是显隐：展开了哪些单元、地图拖到哪儿都不丢。
          编排课表期间正文不低于地图的高度，卡片不会先塌下去再长回来。
          这里只在切换视图时补高度过渡；课的浮现、单元的收展由课表自己的行高过渡
          负责，两者叠在一起会在过渡结束时跳一下。 */}
      <AnimatedHeight
        animateKey={view}
        className="mt-3"
      >
        <div style={{ minHeight: phase === 'scheduling' ? mapHeight : undefined }}>
          <KnowledgeMapCanvas
            layout={layout}
            height={mapHeight}
            revealedCount={
              phase === 'mapping' ? progress.knowledgePointCount : undefined
            }
            interactive={phase === 'ready'}
            className={cn(
              'animate-in fade-in-0 duration-300',
              view !== 'map' && 'hidden'
            )}
          />

          {phase === 'mapping' ? null : (
            <CourseOutlineTree
              chapters={outline.chapters}
              index={index}
              revealedLessonCount={
                phase === 'scheduling' ? progress.lessonCount : undefined
              }
              generating={phase === 'scheduling'}
              lessonMarker={lessonMarker}
              className={cn(
                'animate-in fade-in-0 duration-300',
                view !== 'schedule' && 'hidden'
              )}
            />
          )}
        </div>
      </AnimatedHeight>

      <OutlineFooter
        phase={phase}
        start={
          <Button
            type="button"
            variant="outline"
            disabled={phase !== 'ready'}
            className={cn(outlineSecondaryButtonClassName, 'gap-1.5')}
            onClick={() =>
              setSelectedView(view === 'schedule' ? 'map' : 'schedule')
            }
          >
            {view === 'schedule' ? (
              <Waypoints className="size-[15px]" />
            ) : (
              <ListTree className="size-[15px]" />
            )}
            {view === 'schedule' ? '知识地图' : '课表'}
          </Button>
        }
        onEdit={onEdit}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    </OutlineCard>
  )
}
