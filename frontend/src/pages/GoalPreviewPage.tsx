import { useState, type ReactNode } from 'react'

import {
  GoalBlockView,
  GoalRestatement,
  type LocalGoalDraft,
} from '@/features/learn-space/goal/GoalBlock'
import type { SpaceGoal } from '@/features/learn-space/goal/types'

/**
 * 目标那一块的**免登录评审页**（`/preview/goal`）。
 *
 * 它把四屏并排摆出来，因为这四屏的差别就是这块东西的全部：**还没有目标** ·
 * **系统读了一遍等你确认** · **正在推的目标** · **已暂停**。用真组件渲染（不是画
 * 一张图），所以在这里看到的就是登录后看到的东西。
 *
 * 交互是空的（点确认只把卡收起来）—— 这是评审页，不是能用的页面；真正写库那条链
 * 由 `tests/api/test_space_goals_api.py` 钉住。
 */

const DAY_MS = 86_400_000

function goalAt(overrides: Partial<SpaceGoal>): SpaceGoal {
  const now = Date.now()
  return {
    id: 'g1',
    projectId: 'p1',
    targetText: '考到 TOEFL 117 分',
    deadlineAt: new Date(now + 61 * DAY_MS).toISOString(),
    context: 'TOEFL',
    purpose: 'exam_performance',
    origin: 'user_entered',
    status: 'active',
    confirmedAt: new Date(now - 3600_000).toISOString(),
    closedReason: null,
    outcomeKind: 'externally_reported',
    createdAt: new Date(now - 3600_000).toISOString(),
    updatedAt: new Date(now - 3600_000).toISOString(),
    ...overrides,
  }
}

const RESTATEMENT_DRAFT: LocalGoalDraft = {
  targetText: '考到 TOEFL 117 分',
  purpose: 'exam_performance',
  deadline: new Date(Date.now() + 61 * DAY_MS).toISOString().slice(0, 10),
  context: 'TOEFL',
  heard: true,
  readFailed: false,
}

function Panel({
  title,
  note,
  children,
}: {
  title: string
  note: string
  children: ReactNode
}) {
  return (
    <div className="w-80 shrink-0">
      <p className="text-[11px] font-medium tracking-wide text-zinc-400 uppercase">
        {title}
      </p>
      <p className="mt-1 mb-3 text-xs leading-5 text-zinc-500">{note}</p>
      <div className="rounded-2xl border border-border bg-background px-5 py-4">
        {children}
      </div>
    </div>
  )
}

const noop = () => undefined

/** 回述卡是用户拍板的那一屏，所以它值得单独摆出来看（状态由这里托管）。 */
function RestatementPreview() {
  const [draft, setDraft] = useState<LocalGoalDraft | null>(RESTATEMENT_DRAFT)
  if (!draft) {
    return (
      <button
        type="button"
        onClick={() => setDraft(RESTATEMENT_DRAFT)}
        className="text-[13px] text-foreground underline-offset-2 hover:underline"
      >
        再看一遍回述卡
      </button>
    )
  }
  return (
    <GoalRestatement
      draft={draft}
      onChange={setDraft}
      onCancel={() => setDraft(null)}
      onConfirm={async () => undefined}
      onConfirmed={() => setDraft(null)}
    />
  )
}

export function GoalPreviewPage() {
  return (
    <div className="min-h-screen bg-zinc-50 px-8 py-6">
      <h1 className="text-lg font-medium text-zinc-900">学习目标 · 四屏</h1>
      <p className="mt-1 max-w-2xl text-[13px] leading-6 text-zinc-500">
        这是简报里「学习目标」那一块。**注意这里没有进度条、没有达成概率** —— 对
        「考到 117 分」这种只有学习者能看到结果的目标，系统没有证据说完成了多少，
        编一个数字比不说更糟。
      </p>

      <div className="mt-6 flex flex-wrap gap-8">
        <Panel
          title="一 · 还没有目标"
          note="唯一要读的一句：你在这个空间想达到什么。写一句人话，剩下的（截止日期 / 为了什么 / 场景）交给系统读一遍。"
        >
          <GoalBlockView
            goal={null}
            onConfirm={async () => undefined}
            onUpdate={noop}
            onSetStatus={noop}
            onClose={noop}
          />
        </Panel>

        <Panel
          title="二 · 回述（确认前那一屏）"
          note="系统读完之后先说一遍它听到了什么，让人改。这句话是用字段拼的，不是模型写的 —— 文字改完还得再解析，字段才是会被存下来的东西。"
        >
          <RestatementPreview />
        </Panel>

        <Panel
          title="三 · 目标（正在推）"
          note="说什么、还有多久、为了什么。三个动作：改 / 先别推 / 结束。"
        >
          <GoalBlockView
            goal={goalAt({})}
            onConfirm={async () => undefined}
            onUpdate={noop}
            onSetStatus={noop}
            onClose={noop}
          />
        </Panel>

        <Panel
          title="四 · 没有截止日期、为了理解"
          note="「真正学懂线性代数」没有日期，它仍然是一个完整的目标 —— 所以时间那一格是空的，不是 0。"
        >
          <GoalBlockView
            goal={goalAt({
              targetText: '真正学懂线性代数，不是为了考试',
              deadlineAt: null,
              context: '线性代数',
              purpose: 'understanding',
              outcomeKind: 'system_observable',
            })}
            onConfirm={async () => undefined}
            onUpdate={noop}
            onSetStatus={noop}
            onClose={noop}
          />
        </Panel>

        <Panel
          title="五 · 已暂停"
          note="暂停不是方向变了，所以它不留记忆，也随时能接着推。"
        >
          <GoalBlockView
            goal={goalAt({ status: 'paused', targetText: '先把口语提到 28 分' })}
            onConfirm={async () => undefined}
            onUpdate={noop}
            onSetStatus={noop}
            onClose={noop}
          />
        </Panel>
      </div>
    </div>
  )
}
