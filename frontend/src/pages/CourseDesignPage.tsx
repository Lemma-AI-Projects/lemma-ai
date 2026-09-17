import { Fragment, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { CircularProgress } from '@/components/CircularProgress'
import { cn } from '@/lib/utils'

const courseTabValues = ['章节', '测试'] as const
type CourseTab = (typeof courseTabValues)[number]

const COURSE_DESCRIPTION =
  '本课程从极限与连续这一数学分析的基础出发，逐步建立一元函数微积分的完整知识体系。你将系统学习函数极限、连续性、导数与微分、中值定理、定积分与不定积分等核心内容，并进一步探索导数与积分在函数性质分析、极值与最优化、曲线研究、面积与体积计算等问题中的典型应用。'

// 折叠态保留的字数：按当前 240px 宽 / 15px 字号约 4 行，末尾刚好留给省略号与按钮
const COLLAPSED_DESCRIPTION_LENGTH = 61

const courseChapters = [
  { id: 'limits', title: '函数极限与连续性', progress: 100 },
  { id: 'derivatives', title: '导数与微分', progress: 60 },
  { id: 'mean-value', title: '微分中值定理', progress: 25 },
  { id: 'indefinite-integral', title: '不定积分', progress: 0 },
  { id: 'definite-integral', title: '定积分及其应用', progress: 0 },
]

function ChapterProgressButton({
  index,
  progress,
}: {
  index: number
  progress: number
}) {
  return (
    <Button
      variant="ghost"
      aria-label={`第 ${index} 章学习进度`}
      className="relative size-8 rounded-full p-0"
    >
      {/* size-8 必须保留：Button 会把无 size- 类的 svg 压到 16x16，
          而 viewBox 仍是 32x32，圆环会被拉变形。 */}
      <CircularProgress
        value={progress}
        size={32}
        strokeWidth={2.5}
        className="pointer-events-none absolute inset-0 size-8"
      />
      <span className="text-[13px] font-medium text-zinc-700">{index}</span>
    </Button>
  )
}

export function CourseDesignPage() {
  const [activeTab, setActiveTab] = useState<CourseTab>('章节')
  const [descriptionExpanded, setDescriptionExpanded] = useState(false)
  const [activeChapterId, setActiveChapterId] = useState(courseChapters[0].id)

  return (
    <div className="relative h-full overflow-y-auto rounded-md border border-zinc-200/80 bg-zinc-50">
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
          {courseChapters.map((chapter, index) => (
            <Fragment key={chapter.id}>
              {/* 竖线对齐 32px 按钮的圆心 */}
              {index > 0 && (
                <div className="ml-4 h-6 w-px -translate-x-1/2 bg-zinc-300" />
              )}
              <div className="flex items-center gap-3">
                <ChapterProgressButton
                  index={index + 1}
                  progress={chapter.progress}
                />
                <button
                  type="button"
                  onClick={() => setActiveChapterId(chapter.id)}
                  className={cn(
                    'min-w-0 flex-1 -translate-y-px rounded-full px-3 text-left text-[15px] leading-8 font-normal transition-colors',
                    activeChapterId === chapter.id
                      ? 'bg-zinc-200/55 text-zinc-900'
                      : 'text-zinc-800 hover:bg-zinc-200/30'
                  )}
                >
                  {chapter.title}
                </button>
              </div>
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}
