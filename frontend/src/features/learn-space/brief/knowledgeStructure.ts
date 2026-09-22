/**
 * Knowledge Structure 的 wire 形状 + 先修顺序的计算（前端侧）。
 *
 * 这一块是 **Learner State 的可视面**：把「哪些已具备 / 哪些接下来可学 / 哪些还没轮到」
 * 按先修顺序摊开给用户看。它与 `LearningBrief` 的分工是：
 *
 *   LearningBrief  = 我说得出口的几句话（你具备什么、接下来做什么）
 *   KnowledgeStructure = 那张图本身（每一项什么状态、依据几条记录）
 *
 * 这里**没有数值字段**：没有掌握度、没有百分比、没有权重。`evidenceCount` 是
 * 「这条结论背后有几条记录」的计数，没有分母，所以读不成比例。
 */

export type KnowledgeStateValue = 'mastered' | 'not_mastered' | 'unassessed'

export interface KnowledgeStructureItem {
  id: string
  label: string
  kind: string
  origin: string
  status: string
}

export interface KnowledgeStructureEdge {
  id: string
  fromItemId: string
  toItemId: string
  confidence: string
  counterexampleCount: number
}

export interface KnowledgeStructureState {
  itemId: string
  label: string
  value: KnowledgeStateValue
  origin: 'observed' | 'inferred' | 'self_reported' | null
  evidenceCount: number
  lastConfirmedAt: string | null
}

export interface KnowledgeStructure {
  projectId: string
  items: KnowledgeStructureItem[]
  edges: KnowledgeStructureEdge[]
  states: KnowledgeStructureState[]
  outerFringe: string[]
  innerFringe: string[]
  violations: [string, string][]
  overriddenIds: string[]
  ignoredEvidence: number
}

export interface KnowledgeStructureRow {
  id: string
  label: string
  value: KnowledgeStateValue
  evidenceCount: number
  /** 站在外边缘上：前提都已具备 ⇒ 这就是「接下来可学」。 */
  isReady: boolean
}

/**
 * 按先修顺序排好，供面板直接渲染。
 *
 * 用 Kahn 拓扑排序，而不是按深度分层排：链条里每一项都是「下一步」，分层会把它
 * 读成嵌套关系。同在可排位次的项按结构里的原始顺序出，所以同一份结构永远排出
 * 同一个顺序（前端不引入随机性，否则每次刷新列表都会跳）。
 *
 * 有环时（不该发生：写入侧会拒绝），剩下的项按原顺序追加 —— 少几项比整块不显示好。
 */
export function layoutStructure(
  structure: KnowledgeStructure
): KnowledgeStructureRow[] {
  const statesById = new Map(
    structure.states.map((state) => [state.itemId, state])
  )
  const outer = new Set(structure.outerFringe)

  const row = (id: string, label: string): KnowledgeStructureRow => {
    const state = statesById.get(id)
    return {
      id,
      label,
      value: state?.value ?? 'unassessed',
      evidenceCount: state?.evidenceCount ?? 0,
      isReady: outer.has(id),
    }
  }

  const active = structure.items.filter((item) => item.status === 'active')
  const activeIds = new Set(active.map((item) => item.id))
  const incoming = new Map<string, number>(active.map((i) => [i.id, 0]))
  const dependents = new Map<string, string[]>()
  for (const edge of structure.edges) {
    if (!activeIds.has(edge.fromItemId) || !activeIds.has(edge.toItemId)) continue
    incoming.set(edge.toItemId, (incoming.get(edge.toItemId) ?? 0) + 1)
    dependents.set(edge.fromItemId, [
      ...(dependents.get(edge.fromItemId) ?? []),
      edge.toItemId,
    ])
  }

  const queue = active.filter((item) => (incoming.get(item.id) ?? 0) === 0)
  const ordered: KnowledgeStructureRow[] = []
  const placed = new Set<string>()
  while (queue.length > 0) {
    const item = queue.shift() as KnowledgeStructureItem
    if (placed.has(item.id)) continue
    placed.add(item.id)
    ordered.push(row(item.id, item.label))
    for (const next of dependents.get(item.id) ?? []) {
      const left = (incoming.get(next) ?? 0) - 1
      incoming.set(next, left)
      if (left === 0) {
        const found = active.find((candidate) => candidate.id === next)
        if (found) queue.push(found)
      }
    }
  }

  for (const item of active) {
    if (!placed.has(item.id)) ordered.push(row(item.id, item.label))
  }
  return ordered
}
