import type {
  CourseTuningStart,
  FreeCourseDetail,
} from '@/features/free-course/types'

/**
 * 「暂停点 · 蓝图 + 问卷」的评审用 mock。
 *
 * 形状照抄后端 `services/free_course_events.py` 的 `_QUESTION_SET` 与
 * `GET /free-courses/{id}` 的返回 —— 文案能从 i18n 解析出来就走 i18n，
 * 这样预览和线上渲染的是同一套 key，不会出现"预览好看、线上缺字"。
 */

export const tuningOfferMock: CourseTuningStart = {
  defaults: {
    courseVolume: 'standard',
    depth: 'intuition',
    focus: 'examples',
    pace: 'moderate',
  },
  questions: [
    {
      key: 'course_volume',
      title: '课程体量',
      options: [
        { value: 'quick_scan', label: '快速扫描' },
        { value: 'standard', label: '标准' },
        { value: 'systematic', label: '系统深入' },
      ],
    },
    {
      key: 'depth',
      title: '讲解深度',
      options: [
        { value: 'intuition', label: '直觉理解' },
        { value: 'derivation', label: '推导细节' },
        { value: 'advanced', label: '进阶深入' },
      ],
    },
    {
      key: 'focus',
      title: '内容侧重',
      options: [
        { value: 'concepts', label: '概念' },
        { value: 'examples', label: '实例' },
        { value: 'applied', label: '应用' },
        { value: 'theory', label: '理论' },
      ],
    },
    {
      key: 'pace',
      title: '学习节奏',
      options: [
        { value: 'relaxed', label: '宽松' },
        { value: 'moderate', label: '适中' },
        { value: 'intensive', label: '紧凑' },
      ],
    },
  ],
}

/** 暂停点那一刻的树：结构已落库，内容全部未生成（`hasContent` 一律 false）。 */
export const tuningCourseMock: FreeCourseDetail = {
  id: 'preview',
  mode: 'free',
  // phase 1 结束后课程故意停在 building —— 这是后端注释里写明的行为。
  status: 'building',
  title: '线性代数：从直觉到推导',
  topic: '线性代数',
  audience: '有一点微积分基础、想把线代真正搞懂的人',
  summary: '从一个具体的几何问题出发，把向量、矩阵、特征值的直觉和推导串起来。',
  intent: { topic: '线性代数', level: '入门', goal: '能自己推导特征值' },
  units: [
    {
      id: 'u1',
      title: '向量与空间',
      objective: '建立"向量是空间里的箭头"这一直觉',
      lessons: [
        { id: 'c1', title: '向量到底是什么', objective: null, blueprint: null, hasContent: false },
        { id: 'c2', title: '线性组合与张成', objective: null, blueprint: null, hasContent: false },
        { id: 'c3', title: '线性无关的几何含义', objective: null, blueprint: null, hasContent: false },
      ],
    },
    {
      id: 'u2',
      title: '矩阵作为变换',
      objective: '把矩阵乘法读成"对空间做了一次操作"',
      lessons: [
        { id: 'c4', title: '矩阵乘法在做什么', objective: null, blueprint: null, hasContent: false },
        { id: 'c5', title: '秩与可解性', objective: null, blueprint: null, hasContent: false },
        { id: 'c6', title: '行列式：体积的缩放因子', objective: null, blueprint: null, hasContent: false },
      ],
    },
    {
      id: 'u3',
      title: '特征值与对角化',
      objective: '理解为什么有些方向在变换下不变',
      lessons: [
        { id: 'c7', title: '特征值与特征向量的来历', objective: null, blueprint: null, hasContent: false },
        { id: 'c8', title: '正交投影与对称矩阵', objective: null, blueprint: null, hasContent: false },
        { id: 'c9', title: '对角化能拿来做什么', objective: null, blueprint: null, hasContent: false },
      ],
    },
  ],
}
