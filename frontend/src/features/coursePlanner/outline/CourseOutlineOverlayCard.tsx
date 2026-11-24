import { useMemo, useState } from 'react'
import { CircleCheckBig, Maximize2, Waypoints } from 'lucide-react'

import { AnimatedHeight } from '@/components/AnimatedHeight'
import { BacklogStatusIcon } from '@/components/BacklogStatusIcon'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import { CourseOutlineTree } from './CourseOutlineTree'
import { KnowledgeMapDialog } from './KnowledgeMapDialog'
import { layoutKnowledgeMap } from './layoutKnowledgeMap'
import {
  Collapse,
  KnowledgePointChip,
  OutlineCard,
  OutlineFooter,
} from './OutlineCardParts'
import { buildOutlineIndex } from './outlineIndex'
import type { CourseOutlineCardProps } from './types'

/**
 * 方案 B：主卡片只放课表，知识地图通过标题下方右侧的轻入口，在宽画布弹层里看。
 *
 * - 卡片里永远只有一种正文（课表），没有视图状态；地图是「打开看一眼」的参考物，
 *   弹层里有足够的宽度放几十个节点，还能按课联动高亮。
 * - 生成中沿用「搜索中」卡片的写法：两行步骤（转圈 → 打勾），第一步下面是逐个
 *   浮现的知识点胶囊，第二步下面就是课表本身；就绪时步骤行收起，课表原地留下。
 */
export function CourseOutlineOverlayCard({
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
  const [mapOpen, setMapOpen] = useState(false)
  const mapping = phase === 'mapping'
  const ready = phase === 'ready'

  return (
    <OutlineCard>
      <h3 className="text-[19.5px] font-semibold leading-7 tracking-tight text-zinc-900">
        {ready ? '您的课程已就绪：' : null}
        {title}
      </h3>

      {/* 这一行在三个阶段里位置不变：左侧是步骤一，就绪后只留右侧的地图入口；
          入口在地图生成完之后出现并一直留在原处。 */}
      <div className="mt-2 flex min-h-9 items-center gap-2">
        {ready ? null : (
          <div className="flex min-w-0 flex-1 items-center gap-2 text-[16.5px] font-medium leading-5 text-zinc-800">
            <span className="flex size-4 shrink-0 items-center justify-center">
              {mapping ? (
                <Spinner
                  aria-label="正在梳理知识地图"
                  className="size-[17px] text-zinc-900"
                />
              ) : (
                <CircleCheckBig className="size-4 text-zinc-950" />
              )}
            </span>
            <span className="truncate">
              {mapping ? '正在梳理知识地图' : '已梳理知识地图'}
            </span>
          </div>
        )}
        <Button
          type="button"
          variant="ghost"
          disabled={mapping}
          onClick={() => setMapOpen(true)}
          className={cn(
            '-mr-1.5 ml-auto h-7 shrink-0 gap-1.5 rounded-full px-2.5 text-[13px] font-normal text-zinc-600 transition-opacity duration-300 hover:bg-zinc-200/60 hover:text-zinc-950',
            mapping && 'disabled:opacity-0'
          )}
        >
          <Waypoints className="size-[15px]" />
          知识地图
          <Maximize2 className="size-3 text-zinc-400" />
        </Button>
      </div>

      {/* 步骤一的内容：知识点逐个浮现。等课表的第一个单元出来再收起，一收一放
          刚好抵消，卡片不会先缩一下再长回来。 */}
      <Collapse open={mapping || (!ready && progress.lessonCount === 0)}>
        <div className="relative pl-8">
          <div
            aria-hidden
            className="absolute bottom-1 left-2 top-1 w-px -translate-x-1/2 bg-zinc-200"
          />
          <AnimatedHeight animateKey={progress.knowledgePointCount}>
            <ul className="flex min-h-7 flex-wrap content-center gap-x-1.5 gap-y-2 pb-1.5 pt-1">
              {outline.knowledgePoints
                .slice(0, progress.knowledgePointCount)
                .map((point) => (
                  <li
                    key={point.id}
                    className="flex min-w-0 animate-in fade-in-0 duration-300"
                  >
                    <KnowledgePointChip point={point} />
                  </li>
                ))}
            </ul>
          </AnimatedHeight>
        </div>
      </Collapse>

      {/* 步骤二：就绪后这一行收起，下面的课表不动。 */}
      <Collapse open={!ready}>
        <div
          className={cn(
            'flex min-h-9 items-center gap-2 text-[16.5px] font-medium leading-5 transition-colors duration-300',
            mapping ? 'text-zinc-400' : 'text-zinc-800'
          )}
        >
          <span className="flex size-4 shrink-0 items-center justify-center">
            {mapping ? (
              <span className="opacity-60">
                <BacklogStatusIcon />
              </span>
            ) : (
              <Spinner aria-label="正在编排课表" className="size-[17px] text-zinc-900" />
            )}
          </span>
          <span>{mapping ? '编排课表' : '正在编排课表'}</span>
        </div>
      </Collapse>

      {/* 编排中课表缩进在步骤二下面（与步骤一的胶囊同一种从属关系）；
          就绪后引导线淡出、课表左移归位，成为卡片的正文。 */}
      {mapping ? null : (
        <div
          className={cn(
            'relative transition-[padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
            ready ? 'pl-0' : 'pl-8'
          )}
        >
          <div
            aria-hidden
            className={cn(
              'absolute bottom-1 left-2 top-1 w-px -translate-x-1/2 bg-zinc-200 transition-opacity duration-300',
              ready && 'opacity-0'
            )}
          />
          <CourseOutlineTree
            chapters={outline.chapters}
            index={index}
            revealedLessonCount={ready ? undefined : progress.lessonCount}
            generating={!ready}
            lessonMarker={lessonMarker}
            className="pt-1"
          />
        </div>
      )}

      <OutlineFooter
        phase={phase}
        onEdit={onEdit}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />

      <KnowledgeMapDialog
        open={mapOpen}
        onOpenChange={setMapOpen}
        title={title}
        outline={outline}
        index={index}
        layout={layout}
      />
    </OutlineCard>
  )
}
