import { useMemo, useRef, useState } from 'react'

import { CANDIDATES, INTERPRETATIONS, OBJECT_BY_ID, refOf } from './data'
import type { RefType } from './data'
import type { Candidate, CollectionItem, Discovery, InterpretationRec } from './types'

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
 * 全页唯一一份状态。
 *
 * 这一轮砍掉了三样东西，它们原来各占一个浮层：
 * - 右键菜单（内容和右栏完全重复，还挡住内容）→ 右键改为「选中」，动作归右栏；
 * - 集合抽屉（和右栏抢同一侧）→ 收进一个按需打开的暂存面板；
 * - 对比弹窗 → 变成主区域里的一种视图，用返回退出，不再压住页面。
 *
 * 保留的两处**刻意不共享**：Explore 的搜索词、Timeline 的线索过滤。
 * 它们过滤的是「怎么摆」，不是「有什么」，跨视角带过去只会让人困惑。
 */
export function useTrajectoryStore(
  init: {
    perspective?: Perspective
    selected?: Sel
    sheet?: boolean
    comparing?: boolean
    saved?: string[]
    note?: string
  } = {},
) {
  const [perspective, setPerspective] = useState<Perspective>(init.perspective ?? 'overview')
  const [selected, setSelected] = useState<Sel | null>(init.selected ?? null)
  const [path, setPath] = useState<PathStep[]>(() => {
    if (!init.selected) return []
    const r = refOf(init.selected.id)
    return r ? [{ id: init.selected.id, type: init.selected.type, label: r.label }] : []
  })
  const [collection, setCollection] = useState<CollectionItem[]>(() =>
    (init.saved ?? []).flatMap((id) => {
      const r = refOf(id)
      return r ? [{ key: `${r.type}:${id}`, refId: id, refType: r.type, note: '', promoted: false }] : []
    }),
  )
  const [sheet, setSheet] = useState(init.sheet ?? false)
  const [comparing, setComparing] = useState(init.comparing ?? false)
  const [responses, setResponses] = useState<Record<string, Response>>({})
  const [corrections, setCorrections] = useState<Record<string, string>>({})
  const [candidates, setCandidates] = useState<Candidate[]>(CANDIDATES)
  const [promoted, setPromoted] = useState<InterpretationRec[]>([])
  const [expanded, setExpanded] = useState<string[]>([])
  const [split, setSplit] = useState<string[]>([])
  const [focusFilter, setFocusFilter] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(init.note ?? null)

  /** 动作后的即时回执。1.6 秒自己消失，不用 toast 库，也不弹窗。 */
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  function say(text: string) {
    setFlash(text)
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setFlash(null), 1600)
  }

  function select(id: string, type?: RefType) {
    const ref = refOf(id)
    if (!ref) return
    const t = type ?? ref.type
    setSelected({ id, type: t })
    setPath((prev) => {
      if (prev[prev.length - 1]?.id === id) return prev
      return [...prev, { id, type: t, label: ref.label }].slice(-8)
    })
  }

  function closeDetail() {
    setSelected(null)
  }

  /** 沿连接走一步。路径只记走过的，不记可见的。 */
  function back() {
    setPath((prev) => {
      if (prev.length < 2) {
        setSelected(null)
        return []
      }
      const rest = prev.slice(0, -1)
      const last = rest[rest.length - 1]
      setSelected({ id: last.id, type: last.type })
      return rest
    })
  }

  function switchPerspective(next: Perspective) {
    setPerspective(next)
    setComparing(false)
  }

  function openDiscovery(d: Discovery) {
    setComparing(false)
    setPerspective(d.perspective)
    const first = d.refIds[0]
    if (first) select(first)
  }

  function toggleParent(id: string) {
    setExpanded((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function splitParent(id: string) {
    setSplit((prev) => (prev.includes(id) ? prev : [...prev, id]))
    say('拆开了。它原来是系统按时间并的。')
  }

  function inCollection(id: string) {
    return collection.some((c) => c.refId === id)
  }

  function save(id: string, type: RefType) {
    if (inCollection(id)) {
      setCollection((prev) => prev.filter((c) => c.refId !== id))
      say('已从暂存移走')
      return
    }
    setCollection((prev) => [...prev, { key: `${type}:${id}`, refId: id, refType: type, note: '', promoted: false }])
    say('已放进暂存')
  }

  function removeFromCollection(id: string) {
    setCollection((prev) => prev.filter((c) => c.refId !== id))
  }

  function setItemNote(id: string, note: string) {
    setCollection((prev) => prev.map((c) => (c.refId === id ? { ...c, note } : c)))
  }

  /** 「提出为理解」：变成一条**假设**，作者是他，状态未验证。不改任何原始记录。 */
  function promoteItem(id: string) {
    const item = collection.find((c) => c.refId === id)
    if (!item) return
    const ref = refOf(item.refId)
    setPromoted((prev) => [
      {
        id: `promoted-${prev.length + 1}`,
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
    setCollection((prev) => prev.map((c) => (c.refId === id ? { ...c, promoted: true } : c)))
    say('已变成一条假设（○），不是你确认的事实')
  }

  function respond(insightId: string, kind: Response, text?: string) {
    setResponses((prev) => ({ ...prev, [insightId]: kind }))
    if (kind === 'corrected' && text) setCorrections((prev) => ({ ...prev, [insightId]: text }))
  }

  function resolveCandidate(id: string, kind: 'confirmed' | 'corrected' | 'ignored') {
    setCandidates((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              state: 'resolved' as const,
              resolution: {
                kind,
                at: '2026-11-04',
                note: kind === 'ignored' ? '你忽略了它' : kind === 'corrected' ? '你改了它的说法' : '你确认了它',
              },
            }
          : c,
      ),
    )
    if (kind === 'ignored') {
      say('忽略了。它不会再出现在你的解释里。')
      return
    }
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
    say('已记成你的说法，依据没变')
  }

  /** 把用户回应叠到解释上，但**不改原始记录**：原句仍在 note 里。 */
  const insights = useMemo<InterpretationRec[]>(() => {
    return [...promoted, ...INTERPRETATIONS].map((i) => {
      const r = responses[i.id]
      if (!r) return i
      if (r === 'corrected') {
        return { ...i, epistemic: 'confirmed', status: 'corrected', statement: corrections[i.id] || i.statement }
      }
      return { ...i, status: r === 'confirmed' ? 'confirmed' : 'rejected' }
    })
  }, [promoted, responses, corrections])

  const savedObjects = collection.filter((c) => c.refType === 'object').map((c) => c.refId)

  return {
    perspective,
    switchPerspective,
    selected,
    select,
    closeDetail,
    path,
    back,
    collection,
    savedObjects,
    inCollection,
    save,
    removeFromCollection,
    setItemNote,
    promoteItem,
    sheet,
    setSheet,
    comparing,
    setComparing,
    flash,
    say,
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
    openDiscovery,
    objects: OBJECT_BY_ID,
  }
}

export type Store = ReturnType<typeof useTrajectoryStore>
