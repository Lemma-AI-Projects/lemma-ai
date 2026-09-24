import { useState, type ReactNode } from 'react'

import { AttemptStoreContext } from './attemptContext'
import { createAttemptStore } from './attemptStore'

/** 按题组挂载；切题不卸载，所以答案不丢。重新开始 = 换 key 重挂。 */
export function AttemptProvider({ children }: { children: ReactNode }) {
  const [store] = useState(() => createAttemptStore())
  return <AttemptStoreContext.Provider value={store}>{children}</AttemptStoreContext.Provider>
}
