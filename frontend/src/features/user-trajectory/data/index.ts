import type {
  Candidate,
  ConnectionRec,
  DevEvent,
  DevObject,
  Epistemic,
  EvidenceRec,
  InterpretationRec,
  ObjectKind,
  ParentEvent,
} from '../types'
import { EVIDENCE, EVENTS, INTERPRETATIONS, OBJECTS } from './dataset.generated'
import { CANDIDATES, CONNECTIONS, DISCOVERIES, PARENT_EVENTS } from './narrative'

export { CANDIDATES, CONNECTIONS, DISCOVERIES, PARENT_EVENTS, EVIDENCE, EVENTS, INTERPRETATIONS, OBJECTS }

export const PARENT_BY_ID = new Map<string, ParentEvent>(PARENT_EVENTS.map((p) => [p.id, p]))
export const OBJECT_BY_ID = new Map<string, DevObject>(OBJECTS.map((o) => [o.id, o]))
export const EVENT_BY_ID = new Map<string, DevEvent>(EVENTS.map((e) => [e.id, e]))
export const EVIDENCE_BY_ID = new Map<string, EvidenceRec>(EVIDENCE.map((e) => [e.id, e]))
export const INTERPRETATION_BY_ID = new Map<string, InterpretationRec>(INTERPRETATIONS.map((i) => [i.id, i]))

export type RefType = 'object' | 'event' | 'parent' | 'evidence' | 'insight'

export interface Ref {
  id: string
  type: RefType
  label: string
  sub: string
}

/** 把任意 id 解析成一个可以点、可以显示的东西。找不到就返回 null —— 不编一个占位。 */
export function refOf(id: string): Ref | null {
  const o = OBJECT_BY_ID.get(id)
  if (o) return { id, type: 'object', label: o.title, sub: o.sub }
  const e = EVENT_BY_ID.get(id)
  if (e) return { id, type: 'event', label: e.title, sub: e.date }
  const p = PARENT_BY_ID.get(id)
  if (p) return { id, type: 'parent', label: p.title, sub: `${p.from} → ${p.to}` }
  const v = EVIDENCE_BY_ID.get(id)
  if (v) return { id, type: 'evidence', label: v.observed, sub: v.date }
  const i = INTERPRETATION_BY_ID.get(id)
  if (i) return { id, type: 'insight', label: i.statement, sub: i.date }
  return null
}

export const childrenOf = (parentId: string) =>
  EVENTS.filter((e) => e.parentId === parentId).sort((a, b) => a.date.localeCompare(b.date))

export const topLevelEvents = () => EVENTS.filter((e) => e.parentId === null).sort((a, b) => a.date.localeCompare(b.date))

export const eventsForObject = (objectId: string) =>
  EVENTS.filter((e) => e.objectIds.includes(objectId)).sort((a, b) => a.date.localeCompare(b.date))

export const connectionsFor = (id: string) => CONNECTIONS.filter((c) => c.a === id || c.b === id)

export const insightsForObject = (id: string) =>
  INTERPRETATIONS.filter(
    (i) => i.objectIds.includes(id) || i.eventIds.some((e) => EVENT_BY_ID.get(e)?.objectIds.includes(id)),
  )

export const candidateById = (id: string) => CANDIDATES.find((c) => c.id === id) as Candidate | undefined

export const allEvidenceOf = (i: InterpretationRec): EvidenceRec[] =>
  [...i.supports, ...i.weakens, ...i.contradicts, ...i.qualifies]
    .map((id) => EVIDENCE_BY_ID.get(id))
    .filter((e): e is EvidenceRec => Boolean(e))

export const connectionLabel = (c: ConnectionRec) => {
  const a = refOf(c.a)?.label ?? c.a
  const b = refOf(c.b)?.label ?? c.b
  return `${a} ↔ ${b}`
}

/* ── 显示用的小映射 ─────────────────────────────────────────────── */

export const OBJECT_KIND_LABEL: Record<ObjectKind, string> = {
  material: '材料',
  experience: '学习经历',
  project: '项目',
  artifact: '产出',
  focus: '线索',
  interest: '兴趣',
  goal: '目标',
}

export const EVENT_KIND_LABEL: Record<DevEvent['kind'], string> = {
  learning: '学习',
  research: '研究',
  creation: '创造',
  reflection: '反思',
  direction: '转向',
  milestone: '节点',
}

export const EPISTEMIC: Record<Epistemic, { glyph: string; label: string; hint: string }> = {
  observed: { glyph: '●', label: '观察到', hint: '系统看见的，有原始记录' },
  interpretation: { glyph: '◐', label: '系统解释', hint: '系统推断的，有依据，也可能错' },
  hypothesis: { glyph: '○', label: '假设', hint: '还没验证。既不是事实，也不是结论' },
  confirmed: { glyph: '◆', label: '他自己说的', hint: '用户自己的话。是他认可的，但不等于被验证过' },
}

export const VERDICT_LABEL: Record<string, string> = {
  supported: '成立',
  unsupported: '不成立',
  partially_supported: '部分成立',
  inconclusive: '不确定',
  ungradable: '无法评分',
  pending: '待定',
  not_evidence: '不是证据',
}

export const EVIDENCE_KIND_LABEL: Record<string, string> = {
  performance: '表现',
  reasoning: '推理',
  artifact: '产出',
  behavioral: '行为',
  'self-report': '自述',
}

export const CANDIDATE_STATE_LABEL: Record<Candidate['state'], string> = {
  accumulating: '在攒',
  emerging: '浮出来',
  resolved: '已了结',
}

export const md = (date: string) => date.slice(5).replace('-', '/')
export const ymd = (date: string) => date

export const SUMMARY = {
  objects: OBJECTS.length,
  events: EVENTS.length,
  evidence: EVIDENCE.length,
  interpretations: INTERPRETATIONS.length,
}
