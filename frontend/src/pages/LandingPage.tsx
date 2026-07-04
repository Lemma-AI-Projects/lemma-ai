import { Link, Navigate, useLocation } from 'react-router-dom'

import { useAuth } from '@/features/auth/useAuth'

// 落地页（公开路由 /）。已登录用户自动跳转产品 Home；未登录用户停留在此。
// 样式与内容后续再做，这里只搭路由骨架。
export function LandingPage() {
  const { status } = useAuth()
  // RequireAuth 弹回来时携带 { from }；转交给登录页以便登录后回原页面。
  const location = useLocation()

  if (status === 'loading') {
    return <div aria-busy="true" />
  }

  if (status === 'authed') {
    return <Navigate to="/home" replace />
  }

  return (
    <main>
      <h1>Lemma</h1>
      <Link to="/login" state={location.state}>
        Log in
      </Link>
    </main>
  )
}
