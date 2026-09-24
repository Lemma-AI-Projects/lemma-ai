import type { SlotResponse } from '@/types/question'

export type AttemptResponses = Readonly<Record<string, SlotResponse | null>>

/**
 * 一次作答会话的本地草稿，按 slotId 存。它是组件生命周期内的状态（随流程组件
 * 挂载/卸载），不是服务端数据，也不是全局 UI 状态，所以既不进 TanStack Query
 * 也不进 Zustand。用外部 store 而不是 useReducer，是为了让每个槽位只订阅
 * 自己的值：改一个空不会让整段题面重渲染。
 */
export interface AttemptStore {
  getSnapshot(): AttemptResponses
  getResponse(slotId: string): SlotResponse | null
  setResponse(slotId: string, response: SlotResponse | null): void
  /** 基于当前值更新；连续快速操作（多选连点）不会读到渲染时的旧值。 */
  updateResponse(
    slotId: string,
    updater: (current: SlotResponse | null) => SlotResponse | null
  ): void
  subscribe(listener: () => void): () => void
}

export function createAttemptStore(initial: AttemptResponses = {}): AttemptStore {
  let state = initial
  const listeners = new Set<() => void>()

  const setResponse = (slotId: string, response: SlotResponse | null) => {
    if (state[slotId] === response) return
    state = { ...state, [slotId]: response }
    listeners.forEach((listener) => listener())
  }

  return {
    getSnapshot: () => state,
    getResponse: (slotId) => state[slotId] ?? null,
    setResponse,
    updateResponse(slotId, updater) {
      setResponse(slotId, updater(state[slotId] ?? null))
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
