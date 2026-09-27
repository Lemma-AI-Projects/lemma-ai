import { OnboardingFlow } from '@/features/onboarding/OnboardingFlow'

/**
 * 布局评审专用：不套 RequireAuth / AppLayout，不起后端、不登录即可查看
 * onboarding 的 7 屏视觉与交互节奏（认识你 → 校准 → 确认）。
 *
 * 与 /preview/schedule、/preview/credits、/preview/user-profile 同一套做法：
 * 只渲染 mock，不请求真接口。这里连 QueryClient 都不需要 —— 整条流程不读任何数据。
 *
 * 评审的是「这条流程长什么样、节奏对不对」，不是读写链路。
 * 候选条目的形状复用 User Home 的 UserHomeItem，所以将来接真接口是 1:1 替换。
 */
export function OnboardingPreviewPage() {
  return (
    <div className="h-screen bg-zinc-100 p-2">
      <div className="h-full overflow-hidden rounded-lg border border-zinc-200 bg-background">
        <OnboardingFlow />
      </div>
    </div>
  )
}