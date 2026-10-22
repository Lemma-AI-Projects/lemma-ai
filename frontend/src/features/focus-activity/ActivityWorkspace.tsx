import { useState } from 'react'
import { Check } from 'lucide-react'

import { cn } from '@/lib/utils'

import { ACTIVITY, CHECK } from './activityData'
import { EigenExplorer } from './EigenExplorer'
import { AgentMoveCard } from './AgentMoveCard'

/**
 * 活动工作区 —— 这一屏的主体。
 *
 * 「活动」在这里是**一列可以并存的东西**：一段解释、一个能拖的实验、一道检查题。
 * 它们不是页面、不是 tab、不是步骤；从上往下读就是这一轮学习的全部。
 * 这也是 Proposal B 与"文档 + 聊天"最实质的区别：内容由**当前在做什么**组织，
 * 而不是由文件结构组织。
 *
 * Stage 3 会在这列的末尾再插一块（模拟 Agent 建议），**不改动上面任何一块** ——
 * 那一条"插入不打断"就是这一屏要验的核心。
 *
 * ⚠️ 这一列里没有：进度、已用时、掌握度、下一步建议。加一个就会有人问"这个数怎么算的"，
 * 而这一轮不是回答那个问题的。
 */
export function ActivityWorkspace() {
  const [picked, setPicked] = useState<string | null>(null)
  const isRight = picked === CHECK.answerId

  /* 「插入过」和「现在可见」分开：撤销只藏起卡片，插过的记录还在 ——
     这样按钮能说清"撤销后可再插一次"，而不是装作什么都没发生过。 */
  const [moveInserted, setMoveInserted] = useState(false)
  const [moveVisible, setMoveVisible] = useState(false)

  const dismissMove = () => {
    setMoveVisible(false)
    setMoveInserted(false) // 撤销 = 整个循环重置，按钮恢复可用。否则"可再插一次"是空话。
  }

  return (
    <article className="mx-auto max-w-[46rem] px-8 py-10">
      <div className="space-y-4">
        {ACTIVITY.intro.map((line, i) => (
          <p
            key={i}
            className={cn(
              'text-[15px] leading-8 text-zinc-700',
              /* 第一句稍重：它是这一屏的"钩子"。 */
              i === 0 && 'font-medium text-zinc-900'
            )}
          >
            {line}
          </p>
        ))}
      </div>

      <EigenExplorer />

      <section className="mt-10">
        <h2 className="text-[13px] font-medium text-zinc-900">检查一下</h2>
        <p className="mt-2 text-[14px] leading-7 text-zinc-700">{CHECK.question}</p>

        <fieldset className="mt-3 space-y-2">
          <legend className="sr-only">{CHECK.question}</legend>
          {CHECK.options.map((option) => {
            const active = picked === option.id
            const correct = active && option.id === CHECK.answerId
            return (
              <label
                key={option.id}
                className={cn(
                  'flex cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2.5 text-[13px] transition-colors',
                  active
                    ? 'border-zinc-300 bg-zinc-50 text-zinc-900'
                    : 'border-zinc-200 text-zinc-600 hover:border-zinc-300'
                )}
              >
                <input
                  type="radio"
                  name="eigen-check"
                  value={option.id}
                  checked={active}
                  onChange={() => setPicked(option.id)}
                  className="accent-[#8A5A2B]"
                />
                <span className="flex-1">{option.text}</span>
                {/* 只在选对时标一下。选错**不纠正** —— 原型判断不了"为什么错"，
                    给一句纠正就是假装在教学（见 activityData.ts 的 CHECK 注释）。 */}
                {correct ? (
                  <Check className="size-3.5 shrink-0" style={{ color: '#8A5A2B' }} />
                ) : null}
              </label>
            )
          })}
        </fieldset>

        {isRight ? (
          <p className="mt-2 text-[12px]" style={{ color: '#8A5A2B' }}>
            两个方向：x 轴（λ = 2）和 (1, −1)（λ = 1）。
          </p>
        ) : null}
      </section>

      {/* ── Stage 3：模拟 Agent Move ──────────────────────────────────
          卡片插在内容列的末尾，**和解释、可视化并列** —— 这一句就是 D1 的落地：
          Agent 的行动不只在聊天里说话，它能往工作区里放东西。
          按钮在卡片下面：先看到插进来的东西，再看到"是什么让它进来的"。 */}
      {moveInserted && moveVisible ? (
        <AgentMoveCard onDismiss={dismissMove} />
      ) : null}

      <div className="mt-4">
        <button
          type="button"
          onClick={() => {
            setMoveInserted(true)
            setMoveVisible(true)
          }}
          disabled={moveInserted}
          className="rounded-md border border-zinc-300 px-3 py-2 text-[12px] text-zinc-600 transition-colors hover:border-zinc-400 hover:text-zinc-900 disabled:cursor-default disabled:border-zinc-200 disabled:text-zinc-400 disabled:hover:border-zinc-200"
        >
          {moveInserted ? '已插入 · 撤销后可再插一次' : '模拟 Agent 提议'}
        </button>
      </div>
    </article>
  )
}
