import { useNavigate } from 'react-router-dom'

import { cn } from '@/lib/utils'

import {
  AGE_OPTIONS,
  buildCandidates,
  DEPTH_OPTIONS,
  LEVEL_OPTIONS,
  PURPOSE_OPTIONS,
  TIME_OPTIONS,
} from '../mock'
import { BuiltByBand } from './Brand'
import { StepHeading, type StepProps } from './shared'

/**
 * 最后一屏 · 确认你的画像，然后进门。
 *
 * 这是整套本土化里最重要的一屏，也是它替代 Brilliant「注册墙」的地方。
 *
 * Brilliant 把推断出的身份直接写成用户标签；Lemma 的 User Home 不允许 ——
 * agent 只能写 candidate，确认必须是用户动作。所以这一屏把候选摊开给用户过目，
 * 逐条「记住 / 不是」，而不是展示「我们多懂你」。
 *
 * 未确认的一律保持虚线，视觉上不冒充事实。
 *
 * 它同时是出口：删掉了原来的「先真的学一个东西」，所以这里直接把人送进
 * /preview/user-profile。背书带放在这一屏 —— 用户看完全部推断之后，才交代是谁做的。
 */

function labelOf(
  options: { id: string; text: string }[],
  id: string | null
): string | null {
  if (!id) return null
  return options.find((option) => option.id === id)?.text ?? null
}

export function Step07Confirm({ draft, patch }: StepProps) {
  const navigate = useNavigate()

  const candidates = buildCandidates(draft)
  const decisions = draft.decisions

  const decide = (id: string, value: 'confirmed' | 'dismissed') => {
    patch({ decisions: { ...decisions, [id]: value } })
  }

  const undo = (id: string) => {
    const nextDecisions = { ...decisions }
    delete nextDecisions[id]
    patch({ decisions: nextDecisions })
  }

  const keptCount = candidates.filter((c) => decisions[c.id] === 'confirmed').length
  const undecided = candidates.filter((c) => !decisions[c.id]).length

  /** 用户直接输入的，不是推断 —— 所以不参与上面的逐条确认。 */
  const captured: { label: string; value: string | null }[] = [
    { label: '称呼', value: draft.nickname.trim() || null },
    { label: '年龄', value: labelOf(AGE_OPTIONS, draft.age) },
    { label: '为什么来', value: labelOf(PURPOSE_OPTIONS, draft.purpose) },
    { label: '想学', value: draft.subject.trim() || null },
    { label: '现在在哪', value: labelOf(LEVEL_OPTIONS, draft.level) },
    { label: '学到什么程度', value: labelOf(DEPTH_OPTIONS, draft.depth) },
    { label: '投入时间', value: labelOf(TIME_OPTIONS, draft.timeHorizon) },
  ]

  return (
    <div>
      <StepHeading
        title="这些是我记住的，你过一眼"
        hint="没确认的，我不会当成事实 —— 也不会拿去影响后面给你讲什么。"
      />

      <ul className="grid gap-3">
        {candidates.map((candidate) => {
          const decision = decisions[candidate.id]
          const confirmed = decision === 'confirmed'
          const dismissed = decision === 'dismissed'

          return (
            <li
              key={candidate.id}
              className={cn(
                'rounded-xl border px-4 py-3.5 transition-colors',
                confirmed && 'border-border bg-card',
                dismissed && 'border-border bg-muted/40',
                !decision && 'border-dashed border-zinc-300 bg-transparent'
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="mb-1.5 flex items-center gap-2">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[11px] font-medium',
                        candidate.kind === 'interest'
                          ? 'bg-secondary text-secondary-foreground'
                          : 'bg-muted text-zinc-500'
                      )}
                    >
                      {candidate.kind === 'interest' ? '长期关注' : '你希望我怎么讲'}
                    </span>
                    <span
                      className={cn(
                        'text-[11px]',
                        candidate.origin === 'agent' ? 'text-amber-600' : 'text-zinc-400'
                      )}
                    >
                      {candidate.origin === 'agent' ? '我们猜的' : '你说的'}
                    </span>
                  </div>
                  <div
                    className={cn(
                      'text-[15px] text-zinc-900',
                      dismissed && 'text-zinc-400 line-through'
                    )}
                  >
                    {candidate.text}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {decision ? (
                    <>
                      <span
                        className={cn(
                          'text-[12px]',
                          confirmed ? 'text-zinc-500' : 'text-zinc-400'
                        )}
                      >
                        {confirmed ? '已记住' : '已忽略'}
                      </span>
                      <button
                        type="button"
                        onClick={() => undo(candidate.id)}
                        className="rounded-full px-2.5 py-1 text-[12px] text-zinc-400 transition-colors hover:bg-accent hover:text-zinc-700"
                      >
                        撤销
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => decide(candidate.id, 'confirmed')}
                        className="rounded-full border border-primary bg-primary px-3.5 py-1.5 text-[13px] text-primary-foreground transition-colors hover:bg-primary/90"
                      >
                        记住
                      </button>
                      <button
                        type="button"
                        onClick={() => decide(candidate.id, 'dismissed')}
                        className="rounded-full border border-border px-3.5 py-1.5 text-[13px] text-zinc-500 transition-colors hover:bg-accent hover:text-zinc-800"
                      >
                        不是
                      </button>
                    </>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      <div className="mt-8 rounded-xl border border-dashed border-zinc-300 px-4 py-4">
        <div className="mb-3 text-[12px] text-zinc-400">
          这些是你直接说的，不用确认 —— 只在这里给你对一遍。
        </div>
        <dl className="grid gap-1.5">
          {captured.map((row) => (
            <div key={row.label} className="flex gap-3 text-[13px]">
              <dt className="w-20 shrink-0 text-zinc-400">{row.label}</dt>
              <dd className={row.value ? 'text-zinc-700' : 'text-zinc-300'}>
                {row.value ?? '没填'}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="mt-6 flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate('/preview/user-profile')}
          className="rounded-full bg-primary px-6 py-2.5 text-[14px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          进入 Lemma
        </button>
        <span className="text-[13px] text-zinc-400">
          已记住 {keptCount} 条
          {undecided > 0 ? ` · 还有 ${undecided} 条没表态` : ''}
        </span>
      </div>

      <BuiltByBand className="mt-8" />
    </div>
  )
}