import { DEPTH_OPTIONS, TIME_OPTIONS } from '../mock'
import { OptionCard, StepHeading, ToggleChip, type StepProps } from './shared'

/**
 * 第 6 屏 · 想学到什么程度、多久。
 *
 * 承载 Time & Habit Contract 原语的一半：把「想学」这个模糊意愿，
 * 变成两个可排期的量 —— 学到哪、投入多少。后半段（挂在哪个日常时段上）
 * 留到接真接口时再做。
 *
 * 时间这一项还有第二个用途：它是最后一条 agent 推断的输入 —— 时间碎，
 * 讲法就只能一次一个点。所以这里存的 id，不是文案。
 */
export function Step06Depth({ draft, patch }: StepProps) {
  return (
    <div>
      <StepHeading
        title="想学到什么程度？"
        hint="同一件事，「够用」和「能自己推导」是两条完全不同的路。"
      />

      <div className="grid gap-3">
        {DEPTH_OPTIONS.map((option) => (
          <OptionCard
            key={option.id}
            selected={draft.depth === option.id}
            title={option.text}
            hint={option.hint}
            onClick={() => patch({ depth: option.id })}
          />
        ))}
      </div>

      <div className="mt-8">
        <div className="mb-1 text-[15px] font-medium text-zinc-900">
          大概能投入多少时间？
        </div>
        <p className="mb-3 text-[13px] text-zinc-500">
          按你真实的节奏说，说多了我会排得太满。
        </p>
        <div className="flex flex-wrap gap-2">
          {TIME_OPTIONS.map((option) => (
            <ToggleChip
              key={option.id}
              selected={draft.timeHorizon === option.id}
              onClick={() =>
                patch({
                  timeHorizon: draft.timeHorizon === option.id ? null : option.id,
                })
              }
            >
              {option.text}
            </ToggleChip>
          ))}
        </div>
      </div>
    </div>
  )
}