import { AGE_OPTIONS } from '../mock'
import { OptionCard, StepHeading, type StepProps } from './shared'

/**
 * 第 2 屏 · 你多大了。
 *
 * 放在「为什么来」之前：目的决定措辞，年龄决定例子。两者都不是能力，
 * 但都必须在问「你会什么」之前拿到 —— 否则后面的例子只能悬空。
 *
 * 只分档，不收具体生日：这是一个学习产品需要的精度，不是身份档案。
 */
export function Step02Age({ draft, patch }: StepProps) {
  return (
    <div>
      <StepHeading
        title="你多大了？"
        hint="这决定我用什么例子、什么节奏。分个档就够，不用填生日。"
      />

      <div className="grid gap-3">
        {AGE_OPTIONS.map((option) => (
          <OptionCard
            key={option.id}
            selected={draft.age === option.id}
            title={option.text}
            hint={option.hint}
            onClick={() => patch({ age: option.id })}
          />
        ))}
      </div>
    </div>
  )
}