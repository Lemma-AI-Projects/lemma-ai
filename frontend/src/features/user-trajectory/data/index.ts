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
export const CANDIDATE_BY_ID = new Map<string, Candidate>(CANDIDATES.map((c) => [c.id, c]))

/** 候选也走同一套选中模型 —— 少一套交互，就少一处不一致。 */
export type RefType = 'object' | 'event' | 'parent' | 'evidence' | 'insight' | 'candidate'

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
  const c = CANDIDATE_BY_ID.get(id)
  if (c) return { id, type: 'candidate', label: c.statement, sub: CANDIDATE_STATE_LABEL[c.state] }
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

/**
 * 线索的短名。数据里的 `title` 是一整句话（它是给人读的定义），
 * 用在筛选条和地形条上会撑破一行，所以这里单给一套 6–10 字的标签。
 * 只影响显示，不动数据。
 */
export const FOCUS_SHORT: Record<string, string> = {
  'foc-01': '神经渲染',
  'foc-02': '「表征」这个词',
  'foc-03': '意识文献',
  'foc-04': '补数学',
  'foc-05': '因果推断',
  'foc-06': '学 Rust',
  'foc-07': '毕设',
}

export const focusShort = (id: string, fallback = '') => FOCUS_SHORT[id] ?? fallback

/**
 * 生命周期状态的中文。数据里存的是机器值（`in_progress_stalled`），
 * 直接把机器值摆到界面上是这一页最容易漏的一处低级错误。
 */
export const STATUS_LABEL: Record<string, string> = {
  completed: '已完成',
  closed: '已关门',
  in_progress: '进行中',
  in_progress_stalled: '进行中但停了',
  ongoing: '还在进行',
  active: '进行中',
  abandoned: '放弃',
  absorbed: '并进另一条线',
  absorbed_into_output: '并进产出',
  archived: '归档',
  never_sent: '没发出去',
  retired: '已退役',
  weak: '变弱了',
  core: '核心',
  partial: '只有一部分',
  rejected: '你否掉的',
  unreviewed: '没看过',
  authored_by_user: '他自己写的',
}

export const statusLabel = (s: string) => STATUS_LABEL[s] ?? s

const CONFIDENCE_LABEL: Record<string, string> = {
  high: '高',
  moderate: '中',
  low: '低',
  unknown: '不知道',
}

export const confidenceLabel = (c: string | null | undefined) => (c ? (CONFIDENCE_LABEL[c] ?? c) : '')

/** 「谁记录的」。agent = 系统判的，user = 他自己写的。 */
const BY_LABEL: Record<string, string> = { agent: '系统', user: '他自己', external_platform: '外部平台' }

export const byLabel = (b: string) => BY_LABEL[b] ?? b

export const md = (date: string) => date.slice(5).replace('-', '/')
export const ymd = (date: string) => date

export const SUMMARY = {
  objects: OBJECTS.length,
  events: EVENTS.length,
  evidence: EVIDENCE.length,
  interpretations: INTERPRETATIONS.length,
}
