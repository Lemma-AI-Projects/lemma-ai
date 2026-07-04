import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from '@/features/auth/useAuth'

export function RequireAuth() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return <div className="min-h-svh bg-background" aria-busy="true" />
  }

  if (status === 'unauthed') {
    // 未登录一律回落地页（含退出登录后的场景）；from 透传给落地页，
    // 落地页的登录入口再转交 LoginPage，登录成功仍可回到原页面。
    return <Navigate to="/" replace state={{ from: location }} />
  }

  return <Outlet />
}
