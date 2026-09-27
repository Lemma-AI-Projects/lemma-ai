import { PURPOSE_OPTIONS } from '../mock'
import { OptionCard, StepHeading, type StepProps } from './shared'

/**
 * 第 3 屏 · 你为什么来。
 *
 * 承载 Persona Fork 原语：第一个实质分叉问的不是「你会什么」，而是「你为什么来」。
 * 目的决定后面所有屏的措辞，所以它必须排在能力之前。
 */
export function Step03Purpose({ draft, patch }: StepProps) {
  return (
    <div>
      <StepHeading
        title="你为什么来？"
        hint="这决定我接下来怎么跟你讲 —— 是赶着用，还是慢慢打底。"
      />

      <div className="grid gap-3">
        {PURPOSE_OPTIONS.map((option) => (
          <OptionCard
            key={option.id}
            selected={draft.purpose === option.id}
            title={option.text}
            hint={option.hint}
            onClick={() => patch({ purpose: option.id })}
          />
        ))}
      </div>
    </div>
  )
}