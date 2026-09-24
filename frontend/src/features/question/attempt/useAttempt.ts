import { useCallback, useContext, useSyncExternalStore } from 'react'

import type { SlotResponse } from '@/types/question'
import { AttemptStoreContext } from './attemptContext'
import type { AttemptResponses, AttemptStore } from './attemptStore'

function useAttemptStore(): AttemptStore {
  const store = useContext(AttemptStoreContext)
  if (!store) throw new Error('useAttemptStore must be used within AttemptProvider')
  return store
}

/** 只订阅一个槽位；其他槽位变化不会触发本组件重渲染。 */
export function useSlotResponse(slotId: string): SlotResponse | null {
  const store = useAttemptStore()
  return useSyncExternalStore(
    store.subscribe,
    () => store.getResponse(slotId),
    () => store.getResponse(slotId)
  )
}

export function useSetSlotResponse() {
  const store = useAttemptStore()
  return useCallback(
    (slotId: string, response: SlotResponse | null) => store.setResponse(slotId, response),
    [store]
  )
}

export function useUpdateSlotResponse() {
  const store = useAttemptStore()
  return useCallback(
    (slotId: string, updater: (current: SlotResponse | null) => SlotResponse | null) =>
      store.updateResponse(slotId, updater),
    [store]
  )
}

/** 整份草稿：进度、完成判定、组装提交用。 */
export function useAttemptResponses(): AttemptResponses {
  const store = useAttemptStore()
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
}
