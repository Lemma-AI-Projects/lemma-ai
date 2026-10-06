/**
 * Trajectory 的类型 —— UI 层的形状，不是数据模型。
 *
 * ⚠️ **这里没有任何一个字段是为"存储"设计的。** 它们全部是为了回答四个问题而存在：
 * 发生了什么 · 什么变了 · 凭什么这么判断 · 这对接下来的意义是什么。
 *
 * 未来的真实数据会来自已有的那几张表（Goal / Space Context / Space Memory /
 * Learner State / Evidence / Artifact / Conversation），**本页不重新创建一套语义库**。
 * 所以字段的命名刻意贴着那些既有概念的用词，而不是发明新词 ——
 * `evidence` 指的是 Learn Space 已经在记的那种证据（一次 attempt / 一次独立重建 /
 * 一次修订后的产物），不是新东西。
 */

/** 节点类型。差异必须克制 —— 靠形状与位置，不靠一堆彩色标签。 */
export type TrajectoryKind =
  | 'episode' // 普通学习事件
  | 'breakthrough' // 理解/能力发生了明显变化
  | 'problem' // 反复出现的困难
  | 'artifact' // 作品形成或重要修订
  | 'goal-shift' // 用户改了目标
  | 'direction-shift' // 学习方向重大改变
  | 'reflection' // 重新理解自己过去的学习
  | 'return' // 长期离开后回来

/** 一条证据。这是 grounding 的最小单位 —— 每一句判断都要能指回至少一条。 */
export interface TrajectoryEvidence {
  id: string
  /** 人话描述这一条是什么，例如「第一次尝试」「独立重建」。 */
  label: string
  /** 更完整的一句，供 drawer 里展开。 */
  detail?: string
  /** 未来会指向的真实对象：一次原始交互、一份产物摘录、一条 evidence 行。 */
  sourceKind?: 'interaction' | 'artifact' | 'evidence' | 'conversation'
  /** sourceKind 对应的可读引用（mock 阶段只是一段文字）。 */
  sourceExcerpt?: string
  /** 计数类证据的量，例如「3 次尝试」里的 3。 */
  count?: number
  /** 这条证据是否满足「独立且未受帮助」—— Lemma 里最要紧的那个区分。 */
  independent?: boolean
}

/** 一次「有意义的改变」—— 时间线上的一个节点。 */
export interface TrajectoryNode {
  id: string
  kind: TrajectoryKind
  /** 展示日期，例如 'Oct 2'。 */
  date: string
  /** 展示的相对时间说明，例如 '3 周前'。用于 Today 锚点与「距今多久」。 */
  dateNote?: string
  title: string
  /** 用户真正做了什么 —— 用他的语言，不用系统的语言。 */
  whatHappened: string
  /** 什么变了：理解 / 状态 / 作品 / 方向。没有变化就不该有节点。 */
  whatChanged: string
  /** 凭什么这么判断。空数组意味着这一条判断没有支撑 —— UI 上必须看得见。 */
  evidence: TrajectoryEvidence[]
  /** 还没解决的。空数组意味着这一段收尾了。 */
  whatRemains?: string
  /**
   * 这条经历对接下来的意义。
   *
   * ⚠️ **Implication ≠ Next Task。** 它说的是「这次变化改变了我们对下一步的理解」，
   * 而不是「系统决定让你做 X」—— 后者是 Coordinator 的活，而 Trajectory 只呈现判断。
   */
  implication: string
  /** 关联的产物（未来接 Artifact）。 */
  relatedArtifact?: { name: string; excerpt?: string }
  /** 这一段涉及的知识项（未来接 Knowledge Structure）。 */
  relatedFocus?: string
}

/** 一段连续的学习阶段（介于单个 episode 与里程碑之间的时间尺度）。 */
export interface TrajectoryPeriod {
  id: string
  title: string
  dateRange: string
  /** 这段整体上发生了什么 —— 一句，不展开。 */
  summary: string
  /** 包含哪些 node（按顺序）。 */
  nodeIds: string[]
}

/** 跨越一个阶段的变化。第三个时间尺度。 */
export interface TrajectoryMilestone {
  id: string
  title: string
  date: string
  /** 为什么这算一个里程碑，而不是一个普通的节点。 */
  because: string
  kind: Extract<TrajectoryKind, 'breakthrough' | 'direction-shift'>
  nodeId?: string
}

/** 顶部那个非常克制的当前状态。 */
export interface TrajectoryCurrent {
  /** 空间目标，一句话。 */
  goal: string
  /** 此刻正在做的事。 */
  currently: string
  /** 最近一次变化 —— 用完整句子，不是分数。 */
  recentChange: string
  /** 还没解决的（Today 锚点里要有）。 */
  whatRemains: string
  /** 空间跨度，例如 'Sep 3 – Oct 2 · 8 周'。 */
  span: string
  /** 关键节点在时间跨度上的位置，用于 Overview 那一行。 */
  overviewMarks: OverviewMark[]
}

/** Overview 上的一枚节点。 */
export interface OverviewMark {
  id: string
  /** 0–1，相对位置。 */
  at: number
  label: string
  kind: TrajectoryKind
}

/** 一个 Learn Space 的完整轨迹。 */
export interface TrajectorySpace {
  id: string
  name: string
  /** 空间副标题 / 领域标签。 */
  domain: string
  current: TrajectoryCurrent
  periods: TrajectoryPeriod[]
  milestones: TrajectoryMilestone[]
  nodes: TrajectoryNode[]
}
