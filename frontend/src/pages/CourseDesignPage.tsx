import { Fragment, useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  CircleCheckBig,
  PencilLine,
  Play,
  RotateCcw,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { BacklogStatusIcon } from '@/components/BacklogStatusIcon'
import { CircularProgress } from '@/components/CircularProgress'
import { cn } from '@/lib/utils'

const courseTabValues = ['章节', '测试'] as const
type CourseTab = (typeof courseTabValues)[number]

const COURSE_DESCRIPTION =
  '本课程从极限与连续这一数学分析的基础出发，逐步建立一元函数微积分的完整知识体系。你将系统学习函数极限、连续性、导数与微分、中值定理、定积分与不定积分等核心内容，并进一步探索导数与积分在函数性质分析、极值与最优化、曲线研究、面积与体积计算等问题中的典型应用。'

// 折叠态保留的字数：按当前 240px 宽 / 15px 字号约 4 行，末尾刚好留给省略号与按钮
const COLLAPSED_DESCRIPTION_LENGTH = 61

const courseChapters = [
  { id: 'limits', label: '1', title: '函数极限与连续性', progress: 100 },
  { id: 'derivatives', label: '2', title: '导数与微分', progress: 60 },
  { id: 'mean-value', label: '3', title: '微分中值定理', progress: 25 },
  { id: 'indefinite-integral', label: '4', title: '不定积分', progress: 0 },
  { id: 'definite-integral', label: '5', title: '定积分及其应用', progress: 0 },
]

// 测试 Tab：粒度下沉到章节内的小节，编号为「章.节」
const courseUnits = [
  { id: 'sequence-limit', label: '1.1', title: '数列与函数极限', progress: 100 },
  { id: 'continuity', label: '1.2', title: '连续性与间断点', progress: 70 },
  { id: 'derivative-def', label: '2.1', title: '导数的定义', progress: 40 },
  { id: 'derivative-rules', label: '2.2', title: '求导法则', progress: 0 },
  { id: 'lagrange', label: '3.1', title: '拉格朗日中值定理', progress: 0 },
]

const UNIT_PROGRESS_COLOR = '#eab308'

// 左侧主区域：展开的单元带卡片，未展开的单元只保留圆环占位
type CourseUnitModule = {
  id: string
  label: string
  progress: number
  card?: {
    title: string
    summary: string
    points?: {
      title: string
      completed: boolean
      // 综合评估这类条目只提供单个「进入练习」入口
      practiceOnly?: boolean
    }[]
  }
}

const courseUnitModules: CourseUnitModule[] = [
  {
    id: 'limits',
    label: '1',
    progress: 100,
    card: {
      title: '第一单元：函数极限与连续性',
      summary:
        '从数列极限认识“无限接近”，再到函数极限与连续性的基本概念和定理。',
      points: [
        { title: '数列极限与收敛判别', completed: true },
        { title: '函数极限的定义与四则运算', completed: true },
        { title: '连续性与间断点分类', completed: false },
      ],
    },
  },
  {
    id: 'derivatives',
    label: '2',
    progress: 60,
    card: {
      title: '第二单元：导数与微分',
      summary:
        '从平均变化率走到瞬时变化率，理解导数的定义、几何意义与基本运算方法。',
      points: [
        { title: '导数的定义与几何意义', completed: true },
        { title: '基本求导法则与复合函数求导', completed: false },
        { title: '微分及其在近似计算中的应用', completed: false },
      ],
    },
  },
  {
    id: 'mean-value',
    label: '3',
    progress: 25,
    card: {
      title: '第三单元：微分中值定理与应用',
      summary:
        '用中值定理连接导数与函数整体性质，进而处理单调性、极值与凹凸性问题。',
      points: [
        { title: '罗尔定理与拉格朗日中值定理', completed: false },
        { title: '洛必达法则与未定式求极限', completed: false },
        { title: '单调性、极值与曲线的凹凸性', completed: false },
      ],
    },
  },
  {
    id: 'assessment',
    label: '4',
    progress: 0,
    card: {
      title: '综合评估：极限与分析基础',
      summary:
        '对前三个单元做一次整体检验：极限计算、连续性判断、导数与中值定理的综合运用，用一套贯通题目定位薄弱环节。',
      points: [
        {
          title: '单元 1 综合评估：极限与分析基础',
          completed: false,
          practiceOnly: true,
        },
      ],
    },
  },
]

function ProgressCircleButton({
  label,
  progress,
  progressColor,
}: {
  label: string
  progress: number
  progressColor?: string
}) {
  return (
    <Button
      variant="ghost"
      aria-label={`${label} 学习进度`}
      className="relative size-8 rounded-full p-0"
    >
      {/* size-8 必须保留：Button 会把无 size- 类的 svg 压到 16x16，
          而 viewBox 仍是 32x32，圆环会被拉变形。 */}
      <CircularProgress
        value={progress}
        size={32}
        strokeWidth={2.5}
        progressColor={progressColor}
        className="pointer-events-none absolute inset-0 size-8"
      />
      <span className="text-[13px] font-medium text-zinc-700">{label}</span>
    </Button>
  )
}

function UnitCard({ card }: { card: NonNullable<CourseUnitModule['card']> }) {
  return (
    <div className="min-w-0 flex-1 rounded-2xl border border-zinc-200 p-5">
      <h3 className="text-[17px] leading-6 font-semibold text-zinc-900">
        {card.title}
      </h3>
      <p className="mt-2 text-[15px] leading-[24px] font-normal text-zinc-600">
        {card.summary}
      </p>
      {card.points && (
      <div className="mt-6 flex flex-col gap-6">
        {card.points.map((point) => (
          <div
            key={point.title}
            className="flex items-center justify-between gap-3"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex size-4 shrink-0 items-center justify-center">
                {point.completed ? (
                  <CircleCheckBig className="size-4 text-zinc-950" />
                ) : (
                  <BacklogStatusIcon />
                )}
              </span>
              <p className="min-w-0 text-[16px] leading-6 font-normal text-zinc-800">
                {point.title}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {!point.practiceOnly && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 rounded-full border border-zinc-300 bg-transparent px-3 text-[13px] text-zinc-600 hover:border-zinc-400 hover:bg-transparent hover:text-zinc-900"
                >
                  {point.completed ? (
                    <RotateCcw className="size-3.5" />
                  ) : (
                    <Play className="size-3.5" />
                  )}
                  {point.completed ? '重新学习' : '学习'}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 rounded-full border border-zinc-300 bg-transparent px-3 text-[13px] text-zinc-600 hover:border-zinc-400 hover:bg-transparent hover:text-zinc-900"
              >
                <PencilLine className="size-3.5" />
                {point.practiceOnly ? '进入练习' : '练习'}
              </Button>
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  )
}

export function CourseDesignPage() {
  const [activeTab, setActiveTab] = useState<CourseTab>('章节')
  const [descriptionExpanded, setDescriptionExpanded] = useState(false)
  const [activeChapterId, setActiveChapterId] = useState(courseChapters[0].id)
  const [activeUnitId, setActiveUnitId] = useState(courseUnits[0].id)

  const isChapterTab = activeTab === '章节'
  const items = isChapterTab ? courseChapters : courseUnits
  const activeItemId = isChapterTab ? activeChapterId : activeUnitId
  const setActiveItemId = isChapterTab ? setActiveChapterId : setActiveUnitId

  return (
    <div className="relative h-full overflow-y-auto rounded-md border border-zinc-200/80 bg-zinc-50">
      {/* 与右侧灰色圆角矩形同一 top，两者顶边对齐 */}
      <div className="absolute top-20 left-26 max-w-[670px]">
        <h2 className="text-2xl leading-8 font-medium text-zinc-900">
          第一章：函数极限与连续性
        </h2>
        <p className="mt-3 text-[16px] leading-[26px] font-normal text-zinc-600">
          本单元先用数列极限建立“无限接近”的直观，再过渡到函数极限的严格定义，掌握
          极限的四则运算、夹逼准则与两个重要极限。随后讨论连续性与间断点的分类，理解
          闭区间上连续函数的性质，为后续导数与积分的学习打下基础。
        </p>
        <div className="mt-8 flex flex-col">
          {courseUnitModules.map((unit, index) => {
            const hasNextUnit = index < courseUnitModules.length - 1

            return (
              <div
                key={unit.id}
                className={cn('relative flex gap-5', hasNextUnit && 'pb-10')}
              >
                {/* 竖线对齐 32px 按钮的圆心，沿卡片左侧连到下一个单元 */}
                {hasNextUnit && (
                  <div className="absolute top-10 bottom-0 left-4 w-px -translate-x-1/2 bg-zinc-300" />
                )}
                <ProgressCircleButton
                  label={unit.label}
                  progress={unit.progress}
                />
                {unit.card && <UnitCard card={unit.card} />}
              </div>
            )
          })}
        </div>
      </div>
      <div className="absolute top-20 right-26 w-60">
        <div className="size-60 rounded-2xl bg-zinc-200" />
        <h1 className="mt-5 text-center text-xl font-bold text-zinc-900">
          微积分入门与核心概念精讲
        </h1>
        <p className="mt-3 text-left text-[15px] leading-[21px] font-normal text-zinc-600">
          {descriptionExpanded
            ? COURSE_DESCRIPTION
            : `${COURSE_DESCRIPTION.slice(0, COLLAPSED_DESCRIPTION_LENGTH)}…`}
          {/* 跟在正文之后浮动到行尾：落在最后一行最右侧，不影响已排好的正文 */}
          <button
            type="button"
            aria-label={descriptionExpanded ? '折叠课程介绍' : '展开课程介绍'}
            onClick={() => setDescriptionExpanded((current) => !current)}
            /* 浮动块默认贴行盒顶部，下移半个高度差使其在 21px 行高内垂直居中 */
            className="float-right mt-[1.5px] ml-1 flex h-[18px] w-[26px] items-center justify-center rounded-full border border-zinc-300 text-zinc-500 hover:text-zinc-800"
          >
            {descriptionExpanded ? (
              <ChevronUp className="size-3" />
            ) : (
              <ChevronDown className="size-3" />
            )}
          </button>
        </p>
        <div className="mt-4 flex items-center gap-2">
          {courseTabValues.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                'rounded-full px-4 py-1.5 text-sm transition-colors',
                activeTab === tab
                  ? 'bg-zinc-200 text-foreground'
                  : 'bg-transparent text-muted-foreground hover:bg-muted/50'
              )}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="mt-6 flex flex-col">
          {items.map((item, index) => (
            <Fragment key={item.id}>
              {/* 竖线对齐 32px 按钮的圆心 */}
              {index > 0 && (
                <div className="ml-4 h-6 w-px -translate-x-1/2 bg-zinc-300" />
              )}
              <div className="flex items-center gap-3">
                <ProgressCircleButton
                  label={item.label}
                  progress={item.progress}
                  progressColor={isChapterTab ? undefined : UNIT_PROGRESS_COLOR}
                />
                <button
                  type="button"
                  onClick={() => setActiveItemId(item.id)}
                  className={cn(
                    'min-w-0 flex-1 -translate-y-px rounded-full px-3 text-left text-[15px] leading-8 font-normal transition-colors',
                    activeItemId === item.id
                      ? 'bg-zinc-200/55 text-zinc-900'
                      : 'text-zinc-800 hover:bg-zinc-200/30'
                  )}
                >
                  {item.title}
                </button>
              </div>
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}
