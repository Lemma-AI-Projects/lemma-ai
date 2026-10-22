import { useState } from 'react'
import { ChevronDown, ChevronUp, X } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * 模拟 Agent 插入的内容 —— **这一屏最重要的一块**。
 *
 * 它演示的是 D1/D2 那条主张：Agent 的学习行动可以**长在工作区里**，
 * 而不是只在聊天窗格里说话。所以它出现在内容列的末尾，和解释、可视化并列，
 * 而不是弹出一个气泡、也不是把聊天滚到最上面。
 *
 * ## 三条不能破的
 *
 * 1. **不声称它观察了用户。** 文案里没有一个"你刚才…"。这是「模拟」和
 *    「假装在判断」的分界线 —— 一旦写了"我看你转了两圈"，评审就会开始问
 *    "它是怎么知道的"，而那个机制这轮根本不存在。
 * 2. **徽章写全**：「模拟 · 不是真实 Agent 判断」，正文再补一句"和你的操作无关"。
 *    一枚小小的"模拟"徽章不够 —— 读到第三屏的人已经忘了它。
 * 3. **撤销只撤自己。** 点撤销，这张卡消失，φ、滑杆、检查题的选择原样不动。
 *    （验收里单独有一条钉这个。）
 *
 * ## 为什么内容是 A = 2I
 *
 * 它和主活动形成真正的反差：主活动说"只有少数特殊方向"，这张卡问
 * "如果 A = 2I 呢？" —— 答案是**每个方向都是特征方向**。
 * 这个反差把一个概念边界（特征方向是矩阵的性质，不是所有矩阵的通例）摆了出来，
 * 而且数学完全稳，不需要任何"Agent 的判断"来支撑。
 */
export function AgentMoveCard({ onDismiss }: { onDismiss: () => void }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <section
      data-slot="agent-move-card"
      className="mt-10 rounded-lg border border-zinc-300/80 bg-zinc-50/60 px-4 py-4"
      aria-label="模拟 Agent 建议"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{ backgroundColor: '#FAEEDA', color: '#854F0B' }}
            >
              模拟 · 不是真实 Agent 判断
            </span>
            <span className="text-[10px] text-zinc-400">和你的操作无关</span>
          </div>
          <h2 className="mt-1.5 text-[13px] font-medium text-zinc-900">换个方向想</h2>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="撤销这条模拟建议"
          title="撤销这条"
          className="shrink-0 rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-200/70 hover:text-zinc-600"
        >
          <X className="size-3.5" />
        </button>
      </div>

      <p className="mt-2 text-[14px] leading-7 text-zinc-700">
        如果 A 就是把每个向量都翻一倍（A = 2I）呢？还有"特殊的少数几个方向"吗？
      </p>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className={cn(
          'mt-2 flex items-center gap-1 text-[12px] transition-colors',
          expanded ? 'text-zinc-500' : 'text-zinc-600 hover:text-zinc-900'
        )}
      >
        {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        {expanded ? '收起' : '展开看答案'}
      </button>

      {expanded ? (
        /* 直接给答案，不给"提示 → 再猜一轮"：原型验不了多轮提示的成本，
           一段写清楚的话比一次半遮半掩的引导更有信息量。 */
        <p className="mt-2 border-l-2 border-zinc-200 pl-3 text-[13px] leading-6 text-zinc-600">
          那**每个**方向都是特征方向 —— Av = 2v 对任何 v 都成立，任何向量都只被拉长，
          不被转走。所以"只有少数特殊方向"这件事**不是所有矩阵都有**，它恰恰是 A 的性质。
          刚才那个矩阵之所以值得转一圈，就是因为它把"大多数方向被转走"演了出来。
        </p>
      ) : null}
    </section>
  )
}
