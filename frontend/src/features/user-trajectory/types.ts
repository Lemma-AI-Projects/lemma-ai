/**
 * User Trajectory 原型的类型。
 *
 * ⚠️ 这不是生产 schema，也不是分类规范（`research/user-trajectory-lab/taxonomy/`）的完整实现。
 * 它只保留原型需要表达的五类东西，并且刻意压缩到一屏能看懂的程度：
 *   对象（Object）· 事件（Event）· 证据（Evidence）· 解释（Interpretation）· 候选（Candidate）
 *
 * 与分类规范的对应关系写在 `data/index.ts` 的注释里；凡是为了原型而简化的地方，
 * 都在那个文件里标了「简化」。
 */

export type ObjectKind =
  | 'material'
  | 'experience'
  | 'project'
  | 'artifact'
  | 'focus'
  | 'interest'
  | 'goal'

/** 发展对象：持续存在、可被反复引用的东西。 */
export interface DevObject {
  id: string
  kind: ObjectKind
  title: string
  /** 副标题：作者 / 目的 / 状态说明 */
  sub: string
  /** 右侧的一行元信息 */
  meta: string
  from: string | null
  to: string | null
  status: string
}

export type EventKind =
  | 'learning'
  | 'research'
  | 'creation'
  | 'reflection'
  | 'direction'
  | 'milestone'

/** 发展事件：发生在某一刻的一件事。父事件的 id 在 parentId 里。 */
export interface DevEvent {
  id: string
  parentId: string | null
  kind: EventKind
  /** 原始子类型（read / note / abandon / absorb …），只用于显示 */
  type: string
  date: string
  /** HH:mm，里程碑与转变没有具体时刻 */
  time: string
  title: string
  detail: string
  objectIds: string[]
  focusIds: string[]
  evidenceIds: string[]
  /** 原型里全部事件都是观察到的；保留字段是为了说明其它取值存在 */
  origin: 'observed'
}

export type EvidenceKind = 'performance' | 'reasoning' | 'artifact' | 'behavioral' | 'self-report'

export type Verdict = 'supported' | 'unsupported' | 'partially_supported' | 'inconclusive' | 'ungradable' | 'pending' | 'not_evidence'

/** 证据：一条关于「他实际做了什么」的具体观察。 */
export interface EvidenceRec {
  id: string
  kind: EvidenceKind
  rawKind: string
  date: string
  observed: string
  verdict: Verdict
  /** 它支持什么 */
  supports: string
  /** 它不能证明什么 —— 这一栏比 supports 更要紧 */
  notSupport: string
  limitation: string
  confidence: string
  by: string
  activityId: string | null
}

/**
 * 四态。这是整个原型最要紧的一条区分：
 * 系统看到的（observed）/ 系统认为的（interpretation）/ 没验证的（hypothesis）/ 他自己认可的（confirmed）。
 */
export type Epistemic = 'observed' | 'interpretation' | 'hypothesis' | 'confirmed'

export interface InterpretationRec {
  id: string
  epistemic: Epistemic
  assertedBy: 'user' | 'system'
  date: string
  statement: string
  confidence: string | null
  status: string
  supports: string[]
  contradicts: string[]
  qualifies: string[]
  weakens: string[]
  objectIds: string[]
  eventIds: string[]
  basis: string
  note: string
  effectiveFrom: string
  effectiveTo: string | null
  reinterpretedAt: string | null
  reinterpretation: string
}

/** 父事件：一段有整体意义的发展过程，子事件挂在它下面。 */
export interface ParentEvent {
  id: string
  title: string
  kind: string
  from: string
  to: string
  /** 谁建的：系统推断出来的 vs 用户自己划的 */
  origin: 'system' | 'user'
  why: string
  objectIds: string[]
}

export type CandidateState = 'accumulating' | 'emerging' | 'resolved'

/** 发展候选：系统在后台攒的东西。不是每一条都该摆成待办。 */
export interface Candidate {
  id: string
  state: CandidateState
  statement: string
  /** 它由哪些记录攒出来的 */
  signalIds: string[]
  signalNote: string
  why: string
  objectIds: string[]
  firstSeen: string
  resolution?: {
    kind: 'confirmed' | 'corrected' | 'ignored' | 'expired'
    at: string
    note: string
  }
}

/** 一处「跨领域的连接」。它是结构查询的结果，不是模型生成的故事。 */
export interface ConnectionRec {
  id: string
  /** 两端可以是任何东西：对象、事件、解释 */
  a: string
  b: string
  kind: 'shared_question' | 'shared_material' | 'contradiction' | 'bridge'
  why: string
  /** 这条连接的依据（证据 id 或事件 id） */
  basisIds: string[]
  /** observed = 结构上确实存在；interpretation = 需要一点判断 */
  epistemic: Epistemic
}

/** 首页的一条「发现」。它是候选内容的呈现形态，不是固定组件。 */
export interface Discovery {
  id: string
  kind: 'connection' | 'pattern' | 'possibility'
  title: string
  /** 为什么值得看一眼 */
  why: string
  epistemic: Epistemic
  refIds: string[]
  /** 点开之后落在哪个视角 */
  perspective: 'timeline' | 'explore' | 'insights'
}

/** 临时探索结构里的一条。可丢弃、可保存、可「提出」。 */
export interface CollectionItem {
  key: string
  refId: string
  refType: 'object' | 'event' | 'parent' | 'evidence' | 'insight'
  addedAt: string
  note: string
  /** ephemeral 只活在这一次探索里；saved 是用户显式留下的 */
  state: 'ephemeral' | 'saved'
}
