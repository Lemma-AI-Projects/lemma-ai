import { Input } from '@/components/ui/input'

import { SUBJECT_SUGGESTIONS } from '../mock'
import { StepHeading, SuggestionChip, type StepProps } from './shared'

/**
 * 第 4 屏 · 你想学什么。
 *
 * 本土化的关键一屏：Brilliant 在这里给的是 Math / CS 的有限枚举，
 * Lemma 必须是开放输入 —— 任何知识、任何学习对象、任何目的。
 * 建议标签只是降低起步成本，不是边界。
 */
export function Step04Subject({ draft, patch, next }: StepProps) {
  const subject = draft.subject.trim()

  return (
    <div>
      <StepHeading
        title="你想学什么？"
        hint="写什么都行 —— 一门课、一个技能、一个项目、一个想搞清楚的问题。"
      />

      <Input
        autoFocus
        value={draft.subject}
        maxLength={120}
        placeholder="比如：把概率论补到能看懂论文"
        className="h-11 rounded-xl text-[15px]"
        onChange={(event) => patch({ subject: event.target.value })}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && subject) next()
        }}
      />

      <div className="mt-6">
        <div className="mb-3 text-[13px] text-zinc-500">或者从这里挑一个开始</div>
        <div className="flex flex-wrap gap-2">
          {SUBJECT_SUGGESTIONS.map((suggestion) => (
            <SuggestionChip
              key={suggestion}
              onClick={() =>
                patch({ subject: subject === suggestion ? '' : suggestion })
              }
            >
              {suggestion}
            </SuggestionChip>
          ))}
        </div>
      </div>
    </div>
  )
}