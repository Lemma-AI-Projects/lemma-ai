import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import type { Location } from 'react-router-dom'

import { LoginForm } from '@/features/auth/LoginForm'
import { useAuth } from '@/features/auth/useAuth'

interface LoginLocationState {
  from?: Location
}

function getRedirectPath(location: Location) {
  const state = location.state as LoginLocationState | null
  const from = state?.from

  if (!from) {
    return '/home'
  }

  return `${from.pathname}${from.search}${from.hash}`
}

export function LoginPage() {
  const { status } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const redirectPath = getRedirectPath(location)

  if (status === 'loading') {
    return <div className="min-h-svh bg-background" aria-busy="true" />
  }

  if (status === 'authed') {
    return <Navigate to={redirectPath} replace />
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm
          onSuccess={() => navigate(redirectPath, { replace: true })}
        />
      </div>
    </div>
  )
}
