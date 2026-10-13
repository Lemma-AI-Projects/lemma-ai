import { useMemo, useState } from 'react'
import { X } from 'lucide-react'

import {
  totalItems,
  visibleChips,
  VISIBLE_CHIPS,
  type MalaBundleChip,
} from './malaChipsOps'

export type { MalaBundleChip }

/**
 * Mala 的材料包 chips —— **一次圈选 = 一个 chip**。
 *
 * 放在哪：会话面板的输入框上方（`ConversationPanel` 的 `malaChips` 插槽）。
 * 为什么在那儿：用户圈完材料之后，下一个动作就是说话，而那批材料要在他
 * 按下发送之前看得见、改得动 —— 放在文档侧的话，"我圈了什么"和"我要说什么"
 * 就分居屏幕两端了。
 *
 * ⚠️ **后端不截断**（`services/board_context.py:78` 超 24 项直接 422），
 * 所以界面上的条数就是实际带上的条数 —— 这不是巧合，是这条链路唯一的保证方式。
 *
 * 规则在 `malaChipsOps.ts`：这个文件只导出组件（`react-refresh` 的要求），
 * 而规则要能被单测钉住。
 */

export function MalaChips({
  chips,
  onRemove,
  onLocate,
}: {
  chips: readonly MalaBundleChip[]
  onRemove: (bundleId: string) => void
  /** 「回到出处」：那一批材料在文档里的位置。 */
  onLocate: (bundleId: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const { shown, overflow } = useMemo(() => visibleChips(chips), [chips])
  const total = useMemo(() => totalItems(chips), [chips])
  if (chips.length === 0) return null

  const list = expanded ? chips : shown

  return (
    <div className="mb-2 flex flex-wrap items-center gap-1.5">
      <span className="font-mono text-[11px] uppercase tracking-widest text-zinc-400">
        圈了 {chips.length} 组 · {total} 块
      </span>

      {list.map((chip, index) => {
        const name = chip.label ?? `第 ${index + 1} 组`
        return (
          <span
            key={chip.id}
            className="inline-flex max-w-[168px] items-center gap-1 rounded-full border border-zinc-200 bg-white py-0.5 pl-2.5 pr-1 text-[12px] text-zinc-600"
          >
            {/* 「回到出处」。⚠️ 与撤掉按钮**平级**而不是嵌套 —— 嵌套 button 是
                非法 HTML，而且点撤掉时会顺带触发回到出处。 */}
            <button
              type="button"
              disabled={!chip.firstShapeId}
              onClick={() => onLocate(chip.id)}
              title={
                chip.firstShapeId
                  ? `回到${name}在文档里的位置`
                  : '那几块已经不在这一页了'
              }
              className="max-w-[104px] truncate rounded-full text-left transition-colors hover:text-zinc-900 disabled:cursor-default disabled:text-zinc-300"
            >
              {name} · {chip.itemCount} 块
            </button>
            <button
              type="button"
              onClick={() => onRemove(chip.id)}
              aria-label={`撤掉${name}`}
              title="撤掉这一组（发送时就不带它了）"
              className="rounded-full p-0.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
            >
              <X className="size-3" />
            </button>
          </span>
        )
      })}

      {overflow > 0 && !expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="rounded-full px-2 py-0.5 text-[12px] text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
        >
          +{overflow} 组
        </button>
      )}

      {expanded && chips.length > VISIBLE_CHIPS && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="rounded-full px-2 py-0.5 text-[12px] text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
        >
          收起
        </button>
      )}
    </div>
  )
}
