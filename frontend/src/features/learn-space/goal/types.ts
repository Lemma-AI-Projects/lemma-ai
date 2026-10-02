/**
 * 空间目标的 wire 形状（前端侧）。
 *
 * 三个字段是承重的，不是装饰：
 * - `purpose` 决定"什么算成功"。「考出成绩」和「真正理解」可以指向同一个知识点，
 *   但不是同一条指令 —— 系统据此换做法时，靠的就是它。
 * - `outcomeKind`（后端算出来的，不是存的）说明**这个目标的结果谁有资格判定**：
 *   `externally_reported` = 只有学习者能看到（考分、交付物），系统永远不许替它宣布
 *   "达成了"；`system_observable` = 系统能从证据里判（"能不能解释"）。
 * - `status` 说的是**系统在做什么**，不是学习者达没达成：`draft` 还没被确认（不驱动
 *   任何东西）、`active` 在推、`paused` 先别推、`closed` 不推了。
 *
 * **这里没有百分比、没有达成概率。** 不是还没做，是设计上不给 —— 对一个只有学习者
 * 能看到结果的目标，系统没有足够证据说"完成了多少"，编一个数字比不说更糟。
 */

export type GoalStatus = 'draft' | 'active' | 'paused' | 'closed'
export type GoalPurpose =
  | 'exam_performance'
  | 'understanding'
  | 'build_something'
  | 'other'
export type GoalOrigin = 'user_stated' | 'user_entered' | 'agent_proposed'
export type GoalCloseReason =
  | 'system_no_further_value'
  | 'user_achieved'
  | 'user_abandoned'
  | 'user_superseded'
export type OutcomeKind = 'externally_reported' | 'system_observable'

export interface SpaceGoal {
  id: string
  projectId: string
  /** 学习者自己的话。文本，不是数字 ——「117」和「真正学懂」都要放得下。 */
  targetText: string
  /** 可空：「我想真正学懂线性代数」没有日期，它仍然是一个完整的目标。 */
  deadlineAt: string | null
  /** 场景（如 TOEFL）。自由文本，界面上只是标签，没有任何分支依赖它。 */
  context: string | null
  purpose: GoalPurpose
  origin: GoalOrigin
  status: GoalStatus
  confirmedAt: string | null
  closedReason: GoalCloseReason | null
  outcomeKind: OutcomeKind
  createdAt: string
  updatedAt: string
}

/** 从一句话里读出来的建议 —— **不是一次写入**。`heard=false` 是正常结果。 */
export interface GoalSuggestion {
  heard: boolean
  targetText?: string | null
  deadlineAt?: string | null
  context?: string | null
  purpose?: GoalPurpose | null
}
