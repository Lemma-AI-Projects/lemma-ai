import type { LearningBrief } from '@/features/learn-space/brief/types'

/**
 * Learning Brief 的布局评审用 mock（后端未接）。
 *
 * 三个变体对应三种真实处境，用来验证「数据少 → Brief 短」这条规则：
 * - `thick`   证据充足：六段都有内容
 * - `inferred` 目标由课程意图推断（显示「系统推断」标注），且部分判断段缺席
 * - `thin`    全新空间：没有任何证据，四段判断全部缺席，只剩空间名 + 引导
 *
 * 这些对象里刻意没有任何数值字段 —— 与 `LearningBrief` 的类型约束一致，
 * 评审时看不到分数/百分比不是靠自觉，是没东西可显示。
 */

export type LearningBriefVariant = 'thick' | 'inferred' | 'thin'

const thick: LearningBrief = {
  projectId: 'preview',
  spaceName: '线性代数 · 第 12 讲',
  goal: '把特征值和特征向量讲清楚，能自己推导一遍正交投影',
  isGoalInferred: false,
  doing: [
    '在建一门课：《线性代数 · 从矩阵到特征值》',
    '最近在聊：梯度下降的直觉、为什么矩阵乘法不可交换',
    '手里有 2 篇笔记、1 块画布',
  ],
  alreadyHave: [
    '能说清特征值的几何含义——把向量拉长或压短，方向不变',
    '矩阵乘法与行列式的手算没问题',
  ],
  developing: [
    '正交投影的计算步骤：照着公式算得对，但还说不清为什么要用转置',
    '特征向量的方向判断，正在从「背结论」转到「看几何」',
  ],
  mainObstacle: '遇到带参数的矩阵，经常把特征多项式展开到一半就卡住。',
  nextSteps: [
    {
      id: 's1',
      title: '第 3 讲 · 正交投影',
      reason: '本课还没上的一节',
      href: '/free-course/c1/lesson/ch3',
    },
    {
      id: 's2',
      title: '练一练：特征向量方向判断',
      reason: '上一节留下的练习',
      href: '/free-course/c1/lesson/ch2',
    },
    {
      id: 's3',
      title: '聊一聊：投影公式里为什么会出现转置',
      prompt: '为什么正交投影的公式里会出现转置？我想从几何上理解它。',
    },
  ],
  generatedAt: '2026-09-14T11:40:00+08:00',
}

const inferred: LearningBrief = {
  projectId: 'preview',
  spaceName: '线性代数 · 第 12 讲',
  goal: '理解特征值与特征向量，并能独立完成正交投影的计算',
  isGoalInferred: true,
  doing: [
    '在建一门课：《线性代数 · 从矩阵到特征值》',
    '最近在聊：梯度下降的直觉',
  ],
  alreadyHave: ['矩阵乘法与行列式的手算没问题'],
  nextSteps: [
    {
      id: 's1',
      title: '第 3 讲 · 正交投影',
      reason: '本课还没上的一节',
      href: '/free-course/c1/lesson/ch3',
    },
  ],
  generatedAt: '2026-09-14T11:40:00+08:00',
}

const thin: LearningBrief = {
  projectId: 'preview',
  spaceName: '新空间',
  goal: null,
  isGoalInferred: false,
  nextSteps: [],
  generatedAt: '2026-09-14T11:40:00+08:00',
}

export const learningBriefMocks: Record<LearningBriefVariant, LearningBrief> = {
  thick,
  inferred,
  thin,
}

export const DEFAULT_BRIEF_VARIANT: LearningBriefVariant = 'thick'

export function isLearningBriefVariant(
  value: string | null | undefined
): value is LearningBriefVariant {
  return value === 'thick' || value === 'inferred' || value === 'thin'
}
