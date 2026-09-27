import { cn } from '@/lib/utils'

import { LEVEL_OPTIONS, PROBE_SAMPLE } from '../mock'
import { OptionCard, StepHeading, type StepProps } from './shared'
import type { ProbeChoice } from '../types'

const PROBE_LABELS: { id: ProbeChoice; text: string }[] = [
  { id: 'no', text: '不会' },
  { id: 'maybe', text: '也许' },
  { id: 'yes', text: '会' },
]

/**
 * 第 5 屏 · 你现在在哪。
 *
 * 承载 Self-Report Ability 原语，但做了本土化：Brilliant 只采集自评，
 * 这里采集两个信号 —— 自评定位 + 一道真的题目。第二个信号才是后面
 * 「你已经会了哪些」的依据，因为自评有系统性偏差。
 *
 * 这一屏是「评估屏」：最后一个动作一触即走，**不出现「继续」按钮**。
 * 那个按钮的消失本身就是信号 —— 从「配置」切换到了「评估」。
 */
export function Step05Level({ draft, patch, next }: StepProps) {
  // 分两段：先自评定位，再看一道题。用 draft 推导而不是本地 state，
  // 这样从下一屏退回来时不会跳回第一段。
  const stage = draft.level === null ? 'level' : 'probe'

  if (stage === 'level') {
    return (
      <div>
        <StepHeading
          title="你现在在哪？"
          hint="挑一个最接近的。说低了我会啰嗦，说高了我会跟不上。"
        />
        <div className="grid gap-3">
          {LEVEL_OPTIONS.map((option) => (
            <OptionCard
              key={option.id}
              selected={draft.level === option.id}
              title={option.text}
              hint={option.hint}
              onClick={() => patch({ level: option.id as typeof draft.level })}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <StepHeading
        title="看一眼这道题"
        hint="不用真的做出来 —— 你只要告诉我，你会不会。"
      />

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-3 inline-flex rounded-full bg-muted px-2.5 py-1 text-[12px] font-medium text-zinc-500">
          {PROBE_SAMPLE.label}
        </div>
        <p className="text-[15px] leading-7 text-zinc-900">{PROBE_SAMPLE.prompt}</p>
        <ul className="mt-4 grid gap-2">
          {PROBE_SAMPLE.options.map((option) => (
            <li
              key={option}
              className="rounded-lg border border-border px-3.5 py-2.5 text-[14px] text-zinc-600"
            >
              {option}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {PROBE_LABELS.map((label) => (
          <button
            key={label.id}
            type="button"
            onClick={() => {
              patch({ probe: label.id })
              next()
            }}
            className={cn(
              'rounded-full border px-6 py-2.5 text-[14px] transition-colors',
              draft.probe === label.id
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border text-zinc-700 hover:border-zinc-300 hover:bg-accent/40'
            )}
          >
            {label.text}
          </button>
        ))}
      </div>

      <p className="mt-5 text-[13px] leading-6 text-zinc-400">{PROBE_SAMPLE.note}</p>
    </div>
  )
}