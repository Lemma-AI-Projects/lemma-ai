/**
 * Onboarding 沙盒的类型。
 *
 * 这里刻意不定义新的「画像」形状：候选条目直接复用 User Home 的
 * `UserHomeItem`，所以将来接真接口时是 1:1 替换，而不是再翻译一层。
 *
 * 采集到的变量分三处存放（见计划 §5）：
 *   A. User Home  —— nickname / interests / preferences（有类型、有落点）
 *   B. Learner State —— 现有水平（后端 agent 层已有，前端暂无界面）
 *   C. Onboarding Draft —— 年龄 / 目的 / 深度 / 时间视野（UserHome 里没有字段，先只存在本地）
 */

import type { UserHomeItem } from '@/features/user-home/types'

/** 阶段。进度条按阶段分段，进入新阶段时分母归零。 */
export type PhaseId = 'meet' | 'calibrate' | 'commit'

export interface PhaseDef {
  id: PhaseId
  label: string
}

/** 推进速度。配置类要「选后确认」，评估类「一触即走」。 */
export type StepKind = 'config' | 'assess' | 'confirm'

export type StepId =
  | 'greeting'
  | 'age'
  | 'purpose'
  | 'subject'
  | 'level'
  | 'depth'
  | 'confirm'

export interface StepDef {
  id: StepId
  phase: PhaseId
  kind: StepKind
}

/** 现有水平：自评四档。 */
export type LevelChoice = 'new' | 'rusty' | 'working' | 'solid'

/** 探测题的三档自评。 */
export type ProbeChoice = 'no' | 'maybe' | 'yes'

/** 对一条候选的决定。未出现在表里 = 还没表态。 */
export type CandidateDecision = 'confirmed' | 'dismissed'

export interface OnboardingDraft {
  /** A: profiles.nickname */
  nickname: string
  /** C: 年龄分档 —— UserHome 里没有字段，先只存在本地 */
  age: string | null
  /** C: 目的 —— UserHome 里没有字段 */
  purpose: string | null
  /** A: 想学什么，落成 interest 候选 */
  subject: string
  /** B: 现有水平 */
  level: LevelChoice | null
  /** B: 探测题自评 */
  probe: ProbeChoice | null
  /** C: 想学到什么程度 */
  depth: string | null
  /** C: 时间视野 */
  timeHorizon: string | null
  /** 最后一屏的逐条表态 */
  decisions: Record<string, CandidateDecision>
}

/** 候选条目 = User Home 的形状。 */
export type DraftCandidate = UserHomeItem