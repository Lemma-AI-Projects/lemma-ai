import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from '@/features/auth/useAuth'

export function RequireAuth() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return <div className="min-h-svh bg-background" aria-busy="true" />
  }

  if (status === 'unauthed') {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}
