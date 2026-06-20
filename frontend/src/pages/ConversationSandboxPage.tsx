import { useState } from 'react'

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

export function ConversationSandboxPage() {
  const [answers, setAnswers] = useState<QuestionnaireAnswers>({})

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

        {STAGE_PREVIEWS.map((preview) => (
          <section key={preview.key} className="flex flex-col gap-3">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              {preview.label}
            </span>
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
          </section>
        ))}
      </div>
    </div>
  )
}
