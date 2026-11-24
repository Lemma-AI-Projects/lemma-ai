import { useEffect, useMemo, useState, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { CourseOutlineOverlayCard } from './CourseOutlineOverlayCard'
import { CourseOutlineSplitCards } from './CourseOutlineSplitCards'
import { CourseOutlineSwitchCard } from './CourseOutlineSwitchCard'
import type {
  CourseOutline,
  LessonMarkerStyle,
  OutlinePhase,
  OutlineProgress,
} from './types'

// [sandbox] 课程生成「知识地图与课表」阶段的三套方案对比：不连后端，三套方案吃
// 同一份样例数据、同一个阶段状态，方便上下对照。选定方案后，其余两套连同本文件
// 一起移除。

interface PreviewFrame {
  phase: OutlinePhase
  progress: OutlineProgress
  /** 重播时与上一帧的间隔。 */
  delay: number
}

const PRESET_OPTIONS: { value: OutlinePhase; label: string }[] = [
  { value: 'mapping', label: '梳理知识地图' },
  { value: 'scheduling', label: '编排课表' },
  { value: 'ready', label: '已就绪' },
]

const LESSON_MARKER_OPTIONS: { value: LessonMarkerStyle; label: string }[] = [
  { value: 'ring', label: '虚线环' },
  { value: 'square', label: '虚线方块' },
  { value: 'ring-thin', label: '细线圆环' },
  { value: 'book', label: '书页' },
  { value: 'play', label: '播放' },
]

/** 重播的逐帧脚本：知识点逐个浮现 → 课逐节编排 → 就绪。 */
function buildReplayFrames(pointTotal: number, lessonTotal: number): PreviewFrame[] {
  return [
    {
      delay: 0,
      phase: 'mapping',
      progress: { knowledgePointCount: 0, lessonCount: 0 },
    },
    ...Array.from({ length: pointTotal }, (_, index) => ({
      delay: index === 0 ? 500 : 140,
      phase: 'mapping' as const,
      progress: { knowledgePointCount: index + 1, lessonCount: 0 },
    })),
    // 每节课停留得久一些，「正在编排」的图标动态才看得清。
    ...Array.from({ length: lessonTotal + 1 }, (_, index) => ({
      delay: index === 0 ? 700 : 560,
      phase: 'scheduling' as const,
      progress: { knowledgePointCount: pointTotal, lessonCount: index },
    })),
    {
      delay: 900,
      phase: 'ready',
      progress: { knowledgePointCount: pointTotal, lessonCount: lessonTotal },
    },
  ]
}

/** 定格在某个阶段，或按脚本重播一次完整的生成过程。 */
function useOutlineGenerationPreview(outline: CourseOutline) {
  const frames = useMemo(
    () =>
      buildReplayFrames(
        outline.knowledgePoints.length,
        outline.chapters.reduce(
          (sum, chapter) =>
            sum + chapter.units.reduce((count, unit) => count + unit.lessons.length, 0),
          0
        )
      ),
    [outline]
  )
  const [preset, setPreset] = useState<OutlinePhase>('ready')
  /** 重播进行到第几帧；null 表示当前是定格预览。 */
  const [replayIndex, setReplayIndex] = useState<number | null>(null)

  useEffect(() => {
    if (replayIndex === null || replayIndex >= frames.length - 1) {
      return undefined
    }
    const timer = window.setTimeout(() => {
      setReplayIndex(replayIndex + 1)
    }, frames[replayIndex + 1].delay)
    return () => window.clearTimeout(timer)
  }, [frames, replayIndex])

  // 定格预览直接取脚本里的一帧：生成中的两个阶段各停在大约一半的进度上。
  const presetFrame = (phase: OutlinePhase) => {
    if (phase === 'ready') return frames[frames.length - 1]
    const phaseFrames = frames.filter((frame) => frame.phase === phase)
    return phaseFrames[
      Math.min(phaseFrames.length - 1, Math.ceil(phaseFrames.length * 0.55))
    ]
  }
  const replayFinished = replayIndex === frames.length - 1

  return {
    frame: replayIndex === null ? presetFrame(preset) : frames[replayIndex],
    /** 当前高亮哪个定格按钮；重播进行中都不高亮。 */
    activePreset: replayIndex === null ? preset : replayFinished ? 'ready' : null,
    show: (next: OutlinePhase) => {
      setReplayIndex(null)
      setPreset(next)
    },
    replay: () => setReplayIndex(0),
  }
}

function pillClassName(active: boolean) {
  return cn(
    'h-7 rounded-full px-2.5 text-[13px] font-medium transition-colors',
    active
      ? 'bg-zinc-950 text-white'
      : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
  )
}

function SchemeSection({
  label,
  summary,
  children,
}: {
  label: string
  summary: string
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <span className="flex min-h-7 items-center text-xs font-medium uppercase tracking-wide text-zinc-400">
          {label}
        </span>
        <p className="max-w-[36rem] text-[13px] leading-5 text-zinc-500">{summary}</p>
      </div>
      {children}
    </section>
  )
}

export function CourseOutlineDesignCanvas({
  title,
  outline,
}: {
  title: string
  outline: CourseOutline
}) {
  const { frame, activePreset, show, replay } = useOutlineGenerationPreview(outline)
  const [lessonMarker, setLessonMarker] = useState<LessonMarkerStyle>('ring')

  const cardProps = {
    title,
    outline,
    phase: frame.phase,
    progress: frame.progress,
    lessonMarker,
  }

  return (
    <div className="flex flex-col gap-10">
      {/* 三套方案共用阶段状态与课序号样式，吸顶以便滚到任意一套时都能切换 / 重播。 */}
      <div className="sticky top-0 z-10 -mx-2 -mt-4 flex flex-wrap items-center gap-2 bg-zinc-50/95 px-2 py-3 backdrop-blur-sm">
        <div
          role="radiogroup"
          aria-label="预览阶段"
          className="flex w-fit items-center gap-0.5 rounded-full border border-zinc-200 bg-white p-0.5"
        >
          {PRESET_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={activePreset === option.value}
              onClick={() => show(option.value)}
              className={pillClassName(activePreset === option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <Button
          type="button"
          variant="ghost"
          onClick={replay}
          className="h-7 rounded-full px-2.5 text-xs font-medium text-zinc-500 hover:bg-zinc-200/70 hover:text-zinc-900"
        >
          重播生成过程
        </Button>
        <div className="flex basis-full items-center gap-2">
          <span className="text-xs font-medium text-zinc-400">课序号</span>
          <div
            role="radiogroup"
            aria-label="课序号样式"
            className="flex w-fit items-center gap-0.5 rounded-full border border-zinc-200 bg-white p-0.5"
          >
            {LESSON_MARKER_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={lessonMarker === option.value}
                onClick={() => setLessonMarker(option.value)}
                className={pillClassName(lessonMarker === option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <SchemeSection
        label="方案 A · 同卡切换"
        summary="一张卡片、两个视图。视图切换在左下角，与「编辑」并排；生成中切换不可用，正文跟着当前步骤走。"
      >
        <CourseOutlineSwitchCard {...cardProps} />
      </SchemeSection>

      <SchemeSection
        label="方案 B · 主卡课表 + 宽画布弹层"
        summary="卡片里只有课表。知识地图是标题下方右侧的轻入口，点开后在宽画布里看，可按课联动高亮。"
      >
        <CourseOutlineOverlayCard {...cardProps} />
      </SchemeSection>

      <SchemeSection
        label="方案 C · 两张独立卡片"
        summary="地图卡在上、课表卡在下，同时可见、双向联动（悬停某节课试试）。没有视图切换，地图卡可单独收起或放大。"
      >
        <CourseOutlineSplitCards {...cardProps} />
      </SchemeSection>
    </div>
  )
}
