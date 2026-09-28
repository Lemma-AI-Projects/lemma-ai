import { LemmaMark } from '@/components/LemmaMark'
import { Input } from '@/components/ui/input'

import { StepHeading, type StepProps } from './shared'

/**
 * 第 1 屏 · 开场。
 *
 * 唯一的动作是「写个称呼」或直接继续 —— 与 Brilliant 的向导登场同构：
 * 流程的第一步不索取，只换来一次点击。
 *
 * 这里不放吉祥物：Lemma 没有那张脸，需要露面的地方就用标本身。
 * 语气仍用第一人称「我」，不给产品一个拟人形象（与 /me 页的克制风格一致）。
 */
export function Step01Greeting({ draft, patch, next }: StepProps) {
  return (
    <div>
      <LemmaMark className="mb-7" />

      <StepHeading
        title="先认识一下"
        hint="我会用这个称呼跟你说话。可以跳过，之后在「个人资料」里随时改。"
      />

      <label
        htmlFor="onboarding-nickname"
        className="block text-[13px] font-medium text-zinc-700"
      >
        怎么称呼你
      </label>
      <Input
        id="onboarding-nickname"
        autoFocus
        value={draft.nickname}
        maxLength={40}
        placeholder="写一个就好"
        className="mt-2 h-11 rounded-xl text-[15px]"
        onChange={(event) => patch({ nickname: event.target.value })}
        onKeyDown={(event) => {
          if (event.key === 'Enter') next()
        }}
      />
    </div>
  )
}