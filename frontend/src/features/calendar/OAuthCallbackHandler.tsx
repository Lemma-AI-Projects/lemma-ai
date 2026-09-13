import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useConnectGoogleMutation } from './calendarApi'

/**
 * Handles Google OAuth callback at /auth/google/callback?code=xxx&state=xxx
 */
export function GoogleOAuthCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const connectMutation = useConnectGoogleMutation()

  useEffect(() => {
    const code = searchParams.get('code')
    if (!code) {
      navigate('/home', { replace: true })
      return
    }

    const redirectUri = `${window.location.origin}/auth/google/callback`

    connectMutation.mutate(
      {
        code,
        redirectUri,
        calendarId: 'primary',
        calendarName: 'My Calendar',
      },
      {
        onSuccess: () => navigate('/home?calendar=connected', { replace: true }),
        onError: () => navigate('/home?calendar=error', { replace: true }),
      }
    )
    // Only run on mount / searchParams change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, navigate])

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4 text-sm text-[#737373]">
          Connecting Google Calendar...
        </div>
        {connectMutation.isError && (
          <div className="text-sm text-red-500">
            Failed to connect. Please try again.
          </div>
        )}
      </div>
    </div>
  )
}
