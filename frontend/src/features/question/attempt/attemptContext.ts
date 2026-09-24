import { createContext } from 'react'

import type { AttemptStore } from './attemptStore'

export const AttemptStoreContext = createContext<AttemptStore | null>(null)
