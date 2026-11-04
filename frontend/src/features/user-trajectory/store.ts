import { useMemo, useState } from 'react'

import { CANDIDATES, INTERPRETATIONS, OBJECT_BY_ID, refOf, type RefType } from './data'
import type { Candidate, CollectionItem, Discovery, InterpretationRec, ObjectKind } from './types'

export type Perspective = 'overview' | 'timeline' | 'explore' | 'insights'

export interface Sel {
  id: string
  type: RefType
}

export interface PathStep {
  id: string
  type: RefType
  label: string
}

export type Response = 'confirmed' | 'corrected' | 'rejected'

/**
 * 原型的全部状态。**只有一份**，四个视角共用 —— 这是「一个信息空间」的最小证据。
 *
 * 两处刻意**不共享**的状态，用来证明「共享上下文 ≠ 同步所有 UI 状态」：
 * - `kindFilter`：Explore 的对象类型过滤，切到 Timeline 不生效；
 * - `focusFilter`：Timeline 的线索过滤，切到 Explore 不生效。
 */
export function useTrajectoryStore(init: { perspective?: Perspective; selected?: Sel } = {}) {
  const [perspective, setPerspective] = useState<Perspective>(init.perspective ?? 'overview')
  const [selected, setSelected] = useState<Sel | null>(init.selected ?? null)
  const [path, setPath] = useState<PathStep[]>(() => {
    if (!init.selected) return []
    const r = refOf(init.selected.id)
    return r ? [{ id: init.selected.id, type: init.selected.type, label: r.label }] : []
  })
  const [collection, setCollection] = useState<CollectionItem[]>([])
  const [compare, setCompare] = useState<string[]>([])
  const [responses, setResponses] = useState<Record<string, Response>>({})
  const [corrections, setCorrections] = useState<Record<string, string>>({})
  const [candidates, setCandidates] = useState<Candidate[]>(CANDIDATES)
  const [promoted, setPromoted] = useState<InterpretationRec[]>([])
  const [expanded, setExpanded] = useState<string[]>(['pe-03'])
  const [split, setSplit] = useState<string[]>([])
  const [focusFilter, setFocusFilter] = useState<string | null>(null)
  const [kindFilter, setKindFilter] = useState<ObjectKind | 'all'>('all')
  const [menu, setMenu] = useState<{ x: number; y: number; id: string; type: RefType } | null>(null)
  const [drawer, setDrawer] = useState(false)
  const [compareOpen, setCompareOpen] = useState(false)

  const pushPath = (next: PathStep) =>
    setPath((prev) => {
      if (prev[prev.length - 1]?.id === next.id) return prev
      return [...prev, next].slice(-6)
    })

  function select(id: string, type?: RefType, opts: { push?: boolean } = {}) {
    const ref = refOf(id)
    if (!ref) return
    const t = type ?? ref.type
    setSelected({ id, type: t })
    if (opts.push !== false) pushPath({ id, type: t, label: ref.label })
  }

  function goTo(step: PathStep) {
    setSelected({ id: step.id, type: step.type })
    setPath((prev) => {
      const idx = prev.findIndex((s) => s.id === step.id)
      return idx >= 0 ? prev.slice(0, idx + 1) : prev
    })
  }

  function switchPerspective(next: Perspective) {
    setPerspective(next)
    setMenu(null)
  }

  function openDiscovery(d: Discovery) {
    switchPerspective(d.perspective)
    const first = d.refIds[0]
    if (first) select(first)
  }

  function openMenu(e: { clientX: number; clientY: number }, id: string, type: RefType) {
    setMenu({ x: e.clientX, y: e.clientY, id, type })
  }

  function toggleParent(id: string) {
    setExpanded((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function splitParent(id: string) {
    setSplit((prev) => (prev.includes(id) ? prev : [...prev, id]))
    setSelected({ id, type: 'parent' })
  }

  function saveToCollection(id: string, type: RefType) {
    const key = `${type}:${id}`
    if (collection.some((c) => c.key === key)) {
      setDrawer(true)
      return
    }
    const ref = refOf(id)
    setCollection((prev) => [
      ...prev,
      {
        key,
        refId: id,
        refType: type,
        addedAt: '今天',
        note: '',
        state: 'ephemeral',
      },
    ])
    setDrawer(true)
    if (ref) pushPath({ id, type, label: ref.label })
  }

  function removeFromCollection(key: string) {
    setCollection((prev) => prev.filter((c) => c.key !== key))
  }

  function keepItem(key: string) {
    setCollection((prev) => prev.map((c) => (c.key === key ? { ...c, state: 'saved' } : c)))
  }

  function setItemNote(key: string, note: string) {
    setCollection((prev) => prev.map((c) => (c.key === key ? { ...c, note, state: 'saved' } : c)))
  }

  /** 「提出为理解」：变成一条**假设**，不是事实。作者是他，状态是「未验证」。 */
  function promoteItem(key: string) {
    const item = collection.find((c) => c.key === key)
    if (!item) return
    const ref = refOf(item.refId)
    const id = `promoted-${promoted.length + 1}`
    setPromoted((prev) => [
      {
        id,
        epistemic: 'hypothesis',
        assertedBy: 'user',
        date: '2026-11-04',
        statement: item.note || `我把「${ref?.label ?? item.refId}」单独留下来了`,
        confidence: null,
        status: 'unconfirmed',
        supports: [],
        contradicts: [],
        qualifies: [],
        weakens: [],
        objectIds: item.refType === 'object' ? [item.refId] : [],
        eventIds: [],
        basis: '',
        note: '你提出的。系统没有验证过它 —— 它现在是假设，不是结论。',
        effectiveFrom: '2026-11-04',
        effectiveTo: null,
        reinterpretedAt: null,
        reinterpretation: '',
      },
      ...prev,
    ])
    setCollection((prev) => prev.map((c) => (c.key === key ? { ...c, state: 'saved' } : c)))
  }

  function toggleCompare(id: string) {
    setCompare((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= 3) return [...prev.slice(1), id]
      return [...prev, id]
    })
  }

  function respond(insightId: string, kind: Response, text?: string) {
    setResponses((prev) => ({ ...prev, [insightId]: kind }))
    if (kind === 'corrected' && text) setCorrections((prev) => ({ ...prev, [insightId]: text }))
  }

  function resolveCandidate(id: string, kind: 'confirmed' | 'corrected' | 'ignored') {
    setCandidates((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, state: 'resolved', resolution: { kind, at: '2026-11-04', note: kind === 'ignored' ? '你忽略了它' : kind === 'corrected' ? '你改了它的说法' : '你确认了它' } }
          : c,
      ),
    )
    if (kind === 'confirmed' || kind === 'corrected') {
      const c = candidates.find((x) => x.id === id)
      if (!c) return
      setPromoted((prev) => [
        {
          id: `cand-ins-${id}`,
          epistemic: 'confirmed',
          assertedBy: 'user',
          date: '2026-11-04',
          statement: c.statement,
          confidence: null,
          status: kind === 'confirmed' ? 'confirmed' : 'corrected',
          supports: c.signalIds.filter((s) => s.startsWith('ev-')),
          contradicts: [],
          qualifies: [],
          weakens: [],
          objectIds: c.objectIds,
          eventIds: [],
          basis: '你从一条候选里确认的',
          note: '它原来是系统攒出来的候选；现在是你认可的说法。依据仍然是那几条记录。',
          effectiveFrom: '2026-11-04',
          effectiveTo: null,
          reinterpretedAt: null,
          reinterpretation: '',
        },
        ...prev,
      ])
    }
  }

  /** 把用户回应叠到解释上，但**不改原始记录**：原句仍在 note 里。 */
  const insights = useMemo<InterpretationRec[]>(() => {
    const all = [...promoted, ...INTERPRETATIONS]
    return all.map((i) => {
      const r = responses[i.id]
      if (!r) return i
      if (r === 'corrected') {
        return { ...i, epistemic: 'confirmed', status: 'corrected', statement: corrections[i.id] || i.statement }
      }
      return { ...i, status: r === 'confirmed' ? 'confirmed' : 'rejected' }
    })
  }, [promoted, responses, corrections])

  const selectedObjectId = selected?.type === 'object' ? selected.id : null
  const selectedLabel = selected ? (refOf(selected.id)?.label ?? selected.id) : ''

  return {
    perspective,
    switchPerspective,
    selected,
    selectedLabel,
    selectedObjectId,
    select,
    path,
    goTo,
    clearPath: () => setPath([]),
    collection,
    drawer,
    setDrawer,
    saveToCollection,
    removeFromCollection,
    keepItem,
    setItemNote,
    promoteItem,
    compare,
    toggleCompare,
    compareOpen,
    setCompareOpen,
    insights,
    responses,
    respond,
    candidates,
    resolveCandidate,
    expanded,
    toggleParent,
    split,
    splitParent,
    focusFilter,
    setFocusFilter,
    kindFilter,
    setKindFilter,
    menu,
    openMenu,
    closeMenu: () => setMenu(null),
    openDiscovery,
    objects: OBJECT_BY_ID,
  }
}

export type Store = ReturnType<typeof useTrajectoryStore>
