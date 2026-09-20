/**
 * Learning Brief 的 wire 形状（前端侧）。
 *
 * 一条硬约束写在类型里，而不是写在文档里：**这个结构里没有任何数值字段**。
 * 「判断类」内容全部是 string / string[]，所以哪怕想显示百分比也没东西可显示；
 * 唯一的数字是 `nextSteps` 的顺序（数组下标），它不是一个度量。
 *
 * 「事实类」（空间名、接下来）来自数据库；「判断类」（你正在做 / 已经具备 /
 * 正在形成 / 主要障碍）只允许在证据范围内总结，且允许整段缺席。
 */

/** 「接下来」里的一步：只可能来自数据库（空间内课程的未完成课节），不是模型编的。 */
export interface LearningBriefNextStep {
  id: string
  title: string
  /** 这一步为什么在这里（事实描述，不是评分理由）。 */
  reason?: string
  /** 有课节时：直接进课。 */
  href?: string
  /** 没有对应课节时：在当前空间里开一段对话，预填这段文字。 */
  prompt?: string
}

export interface LearningBrief {
  projectId: string
  /** 事实：projects.name。 */
  spaceName: string
  /** 用户写下的学习目标；为空 = 用户还没设。 */
  goal: string | null
  /** goal 为空、由课程意图兜底推断出来时为 true（UI 上标注「系统推断」）。 */
  isGoalInferred: boolean
  /** 你正在做（E2/E3/E4）。无证据时为 undefined → 整段隐藏。 */
  doing?: string[]
  /** 你已经具备（必须有 E5 作答记录或 E4 自报水平支撑）。 */
  alreadyHave?: string[]
  /** 目前正在形成（同样要求证据支撑）。 */
  developing?: string[]
  /** 目前的主要障碍：只允许一句话，无 E5 时缺席。 */
  mainObstacle?: string | null
  /** 接下来：真实派生。空数组 = 这个空间还没有课。 */
  nextSteps: LearningBriefNextStep[]
  /** 快照生成时间；null = 还没生成过。 */
  generatedAt: string | null
}
