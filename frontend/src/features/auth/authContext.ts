import { createContext } from 'react'
import type { Session } from '@supabase/supabase-js'

export type AuthStatus = 'loading' | 'authed' | 'unauthed'

export interface AuthContextValue {
  session: Session | null
  status: AuthStatus
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined
)
