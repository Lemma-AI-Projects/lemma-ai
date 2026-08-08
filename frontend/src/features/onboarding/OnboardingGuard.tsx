import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useOnboardingStatus } from '@/features/onboarding/onboardingApi'

/**
 * Onboarding 门控：新用户（has_completed_onboarding=false）一律拦截到
 * /onboarding 容量首屏；完成或跳过之后才放行进主应用。
 *
 * 放置于 RequireAuth（已登录）与 AppLayout（主应用外壳）之间，保证
 * 未完成 onboarding 的用户看不到应用内容。
 */
export function OnboardingGuard() {
  const { data, isLoading, isError } = useOnboardingStatus()
  const location = useLocation()

  if (isLoading) {
    return <div className="min-h-svh bg-background" aria-busy="true" />
  }

  // 状态查询失败（后端不可达等）：fail-open 放行，避免用户被卡在
  // 空白页。门控的目的是拦截新用户，而不是在基础设施故障时锁死应用。
  if (isError || !data) {
    return <Outlet />
  }

  if (!data.hasCompletedOnboarding) {
    // replace 掉当前地址，避免用户完成 onboarding 后按返回键又回到这里。
    return (
      <Navigate
        to="/onboarding"
        replace
        state={{ from: location }}
      />
    )
  }

  return <Outlet />
}
