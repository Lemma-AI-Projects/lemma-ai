import { useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'

import {
  AuthContext,
  type AuthContextValue,
} from '@/features/auth/authContext'
import { supabase } from '@/lib/supabaseClient'

function createAuthState(session: Session | null): AuthContextValue {
  return {
    session,
    status: session ? 'authed' : 'unauthed',
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthContextValue>({
    session: null,
    status: 'loading',
  })

  useEffect(() => {
    let isActive = true

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isActive) {
        setAuthState(createAuthState(session))
      }
    })

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!isActive) {
        return
      }

      if (error) {
        setAuthState(createAuthState(null))
        return
      }

      setAuthState((currentState) =>
        currentState.status === 'loading'
          ? createAuthState(data.session)
          : currentState
      )
    })

    return () => {
      isActive = false
      subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={authState}>{children}</AuthContext.Provider>
  )
}
