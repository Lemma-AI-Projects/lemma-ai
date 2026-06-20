import {
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { ConversationReasoning } from '@/features/conversation/ConversationReasoning'
import {
  ConversationToolShell,
  type QuestionnaireAnswers,
} from '@/features/conversation/ConversationToolShell'
import type {
  ConversationToolQuestion,
  ConversationToolStage,
  ConversationToolUnit,
} from '@/features/conversation/types'

// [sandbox] 课程编排工具卡片的「各阶段静态预览」调试页：不连后端，把
// ConversationToolShell 的每个 stage 用样例数据一次性铺开，方便调样式与交互。
// 真实端到端流程请在对话里开启 Course Planning 开关验证。

const SAMPLE_QUESTIONS: ConversationToolQuestion[] = [
  {
    id: 'current-level',
    title: '你目前的微积分基础是？',
    options: ['零基础', '学过一点', '比较熟悉'],
  },
  {
    id: 'learning-goal',
    title: '你的主要学习目标是？',
    options: ['应付考试', '打牢基础', '工程应用'],
  },
  {
    id: 'time-budget',
    title: '每周可投入的学习时间？',
    options: ['1-3 小时', '3-6 小时', '6 小时以上'],
  },
]

const PENDING_UNITS: ConversationToolUnit[] = [
  {
    id: 'u1',
    title: '单元一：极限——微积分的基石',
    status: 'not-started',
    chapters: [
      { id: 'c1', title: '第一章：什么是极限？', status: 'not-started' },
      { id: 'c2', title: '第二章：极限的运算法则与连续性', status: 'not-started' },
    ],
  },
  {
    id: 'u2',
    title: '单元二：导数——变化率的量化',
    status: 'not-started',
    chapters: [
      { id: 'c3', title: '第一章：导数的定义与几何意义', status: 'not-started' },
      { id: 'c4', title: '第二章：基本求导法则', status: 'not-started' },
    ],
  },
]

const BUILDING_UNITS: ConversationToolUnit[] = [
  {
    id: 'u1',
    title: '单元一：极限——微积分的基石',
    status: 'in-progress',
    progress: 50,
    chapters: [
      { id: 'c1', title: '第一章：什么是极限？', status: 'completed', progress: 100 },
      {
        id: 'c2',
        title: '第二章：极限的运算法则与连续性',
        status: 'in-progress',
        progress: 60,
      },
    ],
  },
  {
    id: 'u2',
    title: '单元二：导数——变化率的量化',
    status: 'not-started',
    chapters: [
      { id: 'c3', title: '第一章：导数的定义与几何意义', status: 'not-started' },
      { id: 'c4', title: '第二章：基本求导法则', status: 'not-started' },
    ],
  },
]

const READY_UNITS: ConversationToolUnit[] = [
  {
    id: 'u1',
    title: '单元一：极限——微积分的基石',
    status: 'completed',
    progress: 100,
    chapters: [
      { id: 'c1', title: '第一章：什么是极限？', status: 'completed', progress: 100 },
      {
        id: 'c2',
        title: '第二章：极限的运算法则与连续性',
        status: 'completed',
        progress: 100,
      },
    ],
  },
]

const FAILED_UNITS: ConversationToolUnit[] = [
  {
    id: 'u1',
    title: '单元一：极限——微积分的基石',
    status: 'failed',
    chapters: [
      { id: 'c1', title: '第一章：什么是极限？', status: 'failed' },
      { id: 'c2', title: '第二章：极限的运算法则与连续性', status: 'failed' },
    ],
  },
]

interface SearchVideoResult {
  id: string
  platform: 'bilibili' | 'youtube'
  title: string
  availableAtStep: number
}

interface CourseComposerThought {
  id: string
  text: string
  availableAtStep: number
  completeAtStep: number
}

interface SearchSourcePreview {
  id: string
  title: string
  results?: SearchVideoResult[]
  thoughts?: CourseComposerThought[]
}

const SEARCHING_SOURCES: SearchSourcePreview[] = [
  {
    id: 'youtube',
    title: '正在搜索Youtube内容',
    results: [
      {
        id: 'youtube-1',
        platform: 'youtube',
        title: 'Limits visual guide',
        availableAtStep: 1,
      },
      {
        id: 'youtube-2',
        platform: 'youtube',
        title: 'Derivatives for beginners',
        availableAtStep: 2,
      },
      {
        id: 'youtube-3',
        platform: 'youtube',
        title: 'Integrals as accumulation',
        availableAtStep: 4,
      },
    ],
  },
  {
    id: 'bilibili',
    title: '正在搜索Bilibili内容',
    results: [
      {
        id: 'bilibili-1',
        platform: 'bilibili',
        title: '极限入门',
        availableAtStep: 3,
      },
      {
        id: 'bilibili-2',
        platform: 'bilibili',
        title: '导数直观解释',
        availableAtStep: 5,
      },
      {
        id: 'bilibili-3',
        platform: 'bilibili',
        title: '积分面积理解',
        availableAtStep: 6,
      },
    ],
  },
  {
    id: 'compose',
    title: '正在思考并编排课程',
    thoughts: [
      {
        id: 'compose-1',
        text: '先保留直观入门视频作为概念引导，避免一开始进入公式推导。',
        availableAtStep: 7,
        completeAtStep: 8,
      },
      {
        id: 'compose-2',
        text: 'Youtube 的 Limits visual guide 放在极限单元开头，Bilibili 的极限入门作为中文补充。',
        availableAtStep: 9,
        completeAtStep: 10,
      },
      {
        id: 'compose-3',
        text: '导数部分采用“导数直观解释”承接直觉，再补充 Derivatives for beginners 的例题节奏。',
        availableAtStep: 11,
        completeAtStep: 12,
      },
      {
        id: 'compose-4',
        text: '大纲按“极限感知 → 导数定义 → 积分累积”推进，每章只绑定一个主视频，避免材料过载。',
        availableAtStep: 13,
        completeAtStep: 14,
      },
    ],
  },
]

const SEARCH_ANIMATION_STEPS = 14

interface StagePreview {
  key: string
  label: string
  stage: ConversationToolStage
  units?: ConversationToolUnit[]
  questions?: ConversationToolQuestion[]
  progress?: number
  failed?: boolean
}

const STAGE_PREVIEWS: StagePreview[] = [
  {
    key: 'questionnaire',
    label: 'questionnaire · 问卷',
    stage: 'questionnaire',
    questions: SAMPLE_QUESTIONS,
  },
  {
    key: 'questionnaire-loading',
    label: 'questionnaire · 加载骨架（空问卷）',
    stage: 'questionnaire',
    questions: [],
  },
  {
    key: 'searching',
    label: 'searching · 搜索中',
    stage: 'searching',
    progress: 28,
  },
  {
    key: 'pending',
    label: 'pending · 大纲待构建',
    stage: 'pending',
    units: PENDING_UNITS,
  },
  {
    key: 'in-progress',
    label: 'in-progress · 构建中',
    stage: 'in-progress',
    units: BUILDING_UNITS,
    progress: 45,
  },
  {
    key: 'ready',
    label: 'ready · 已就绪',
    stage: 'ready',
    units: READY_UNITS,
    progress: 100,
  },
  {
    key: 'failed',
    label: 'ready + failed · 生成未完成',
    stage: 'ready',
    units: FAILED_UNITS,
    progress: 100,
    failed: true,
  },
]

function SearchPlatformIcon({ platform }: { platform: SearchVideoResult['platform'] }) {
  if (platform === 'bilibili') {
    return (
      <img
        src="/icons/bilibili.svg"
        alt="bilibili"
        className="size-[18px] shrink-0"
      />
    )
  }

  return (
    <img
      src="/icons/youtube.svg"
      alt="youtube"
      className="size-[18px] shrink-0"
    />
  )
}

function SearchResultCapsule({ result }: { result: SearchVideoResult }) {
  return (
    <div
      title={result.title}
      className="flex h-[22px] w-fit max-w-full items-center gap-1 rounded-full bg-zinc-100 py-0 pl-0.5 pr-2 text-[12px] font-medium text-zinc-700"
    >
      <SearchPlatformIcon platform={result.platform} />
      <span className="min-w-0 flex-1 truncate">{result.title}</span>
    </div>
  )
}

function getStreamingThoughtText(
  thought: CourseComposerThought,
  animationStep: number
) {
  const characters = Array.from(thought.text)
  const stepSpan = Math.max(1, thought.completeAtStep - thought.availableAtStep + 1)
  const progress = Math.min(
    1,
    Math.max(0, (animationStep - thought.availableAtStep + 1) / stepSpan)
  )
  const visibleCharacterCount = Math.max(1, Math.ceil(characters.length * progress))

  return characters.slice(0, visibleCharacterCount).join('')
}

function ComposerThoughtLine({
  animationStep,
  thought,
}: {
  animationStep: number
  thought: CourseComposerThought
}) {
  const text = getStreamingThoughtText(thought, animationStep)

  return (
    <p className="flex items-start gap-2 text-[13px] leading-5 text-zinc-600">
      <span
        aria-hidden
        className="mt-[9px] size-1 shrink-0 rounded-full bg-zinc-300"
      />
      <span className="min-w-0 flex-1">
        {text}
      </span>
    </p>
  )
}

function SmoothHeight({
  children,
  contentClassName = 'flex min-h-7 flex-row flex-wrap content-center items-center gap-x-1.5 gap-y-2 pb-1.5 pt-1',
}: {
  children: ReactNode
  contentClassName?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const container = containerRef.current
    const content = contentRef.current

    if (!container || !content) {
      return undefined
    }

    const updateHeight = () => {
      container.style.height = `${content.getBoundingClientRect().height}px`
    }

    updateHeight()

    const resizeObserver = new ResizeObserver(updateHeight)
    resizeObserver.observe(content)

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="h-0 overflow-hidden transition-[height] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
    >
      <div
        ref={contentRef}
        className={contentClassName}
      >
        {children}
      </div>
    </div>
  )
}

function SearchSourceBlock({
  source,
  animationStep,
}: {
  source: SearchSourcePreview
  animationStep: number
}) {
  const visibleResults =
    source.results?.filter((result) => result.availableAtStep <= animationStep) ??
    []
  const visibleThoughts =
    source.thoughts?.filter((thought) => thought.availableAtStep <= animationStep) ??
    []
  const isVisible = visibleResults.length > 0 || visibleThoughts.length > 0
  const renderPayload = () => {
    if (source.results) {
      return visibleResults.map((result) => (
        <SearchResultCapsule key={result.id} result={result} />
      ))
    }

    if (source.thoughts) {
      return visibleThoughts.map((thought) => (
        <ComposerThoughtLine
          key={thought.id}
          animationStep={animationStep}
          thought={thought}
        />
      ))
    }

    return null
  }
  const payloadClassName = source.thoughts
    ? 'flex min-h-7 flex-col gap-1.5 pb-2 pt-1'
    : undefined

  return (
    <section
      aria-hidden={!isVisible}
      className="grid overflow-hidden transition-[grid-template-rows,opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
      style={{
        gridTemplateRows: isVisible ? '1fr' : '0fr',
        opacity: isVisible ? 1 : 0,
        transform: `translateY(${isVisible ? 0 : -6}px)`,
      }}
    >
      <div className="min-h-0 overflow-hidden">
        <div className="flex min-h-8 items-start gap-2 pb-0.5 pt-2 text-[16.5px] font-medium text-zinc-800">
          <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center">
            <Spinner
              aria-label={source.title}
              className="size-[17px] text-zinc-900"
            />
          </span>
          <span className="min-w-0 flex-1 whitespace-normal break-words leading-5">
            {source.title}
          </span>
        </div>

        <div className="relative ml-1 flex flex-col gap-0.5 pl-7">
          <div
            aria-hidden
            className="absolute bottom-1 left-[7px] top-1 w-px bg-zinc-200 transition-opacity duration-500"
          />
          <SmoothHeight contentClassName={payloadClassName}>
            {renderPayload()}
          </SmoothHeight>
        </div>
      </div>
    </section>
  )
}

function SearchPreviewShell() {
  const [searchAnimationStep, setSearchAnimationStep] = useState(0)

  useEffect(() => {
    const timers = Array.from({ length: SEARCH_ANIMATION_STEPS }, (_, index) =>
      window.setTimeout(() => {
        setSearchAnimationStep(index + 1)
      }, 320 + index * 520)
    )

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer))
    }
  }, [])

  return (
    <div
      data-slot="conversation-tool-shell"
      translate="no"
      className="flex w-full max-w-[36rem] flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-transparent px-5 py-5"
    >
      <div data-stage="searching" className="flex flex-col">
        <h3 className="text-[19.5px] font-semibold leading-7 tracking-tight text-zinc-900">
          微积分速成：核心概念与应用基础
        </h3>

        <div className="mt-4 flex flex-col">
          {SEARCHING_SOURCES.map((source) => (
            <SearchSourceBlock
              key={source.id}
              source={source}
              animationStep={searchAnimationStep}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export function ConversationSandboxPage() {
  const [answers, setAnswers] = useState<QuestionnaireAnswers>({})
  const [searchReplayKey, setSearchReplayKey] = useState(0)

  const handleAnswerChange = (questionId: string, option: string) => {
    setAnswers((current) => ({
      ...current,
      [questionId]: current[questionId] === option ? null : option,
    }))
  }

  return (
    <div className="h-full overflow-y-auto rounded-md border border-zinc-200/80 bg-zinc-50">
      <div className="mx-auto flex w-full max-w-[44rem] flex-col gap-10 px-6 py-12">
        <header className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
            课程工具卡片 · 各阶段预览
          </h1>
          <p className="text-sm text-zinc-500">
            纯前端样例，逐一展示 ConversationToolShell 的每个 stage。真实端到端流程请在对话中开启「Course Planning」开关测试。
          </p>
        </header>

        <section className="flex flex-col gap-3">
          <div className="flex min-h-7 items-center justify-between gap-3">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              conversation · thinking
            </span>
          </div>
          <div
            data-slot="conversation-thinking-preview"
            className="flex w-full max-w-[36rem] flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-transparent px-5 py-5"
          >
            <ConversationReasoning
              content="I should first identify the learner's current gap, then explain the concept using the smallest useful example before adding edge cases."
              isStreaming
            />
          </div>
        </section>

        {STAGE_PREVIEWS.map((preview) => (
          <section key={preview.key} className="flex flex-col gap-3">
            <div className="flex min-h-7 items-center justify-between gap-3">
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                {preview.label}
              </span>
              {preview.key === 'searching' ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setSearchReplayKey((current) => current + 1)}
                  className="h-7 rounded-full px-2.5 text-xs font-medium text-zinc-500 hover:bg-zinc-200/70 hover:text-zinc-900"
                >
                  展示动效
                </Button>
              ) : null}
            </div>
            {preview.key === 'searching' ? (
              <SearchPreviewShell key={searchReplayKey} />
            ) : (
              <ConversationToolShell
                title="微积分速成：核心概念与应用基础"
                stage={preview.stage}
                questions={preview.questions}
                answers={answers}
                units={preview.units}
                progress={preview.progress}
                failed={preview.failed}
                onAnswerChange={handleAnswerChange}
                onSubmitAnswers={() => undefined}
                onCancel={() => undefined}
                onEnterCourse={() => undefined}
              />
            )}
          </section>
        ))}
      </div>
    </div>
  )
}
