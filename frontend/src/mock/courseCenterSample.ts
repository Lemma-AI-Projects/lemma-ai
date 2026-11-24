import type { CourseCenterCourse } from '@/features/course/courseCenterFilters'
import type { CourseDashboardData } from '@/features/course/dashboard/types'

// [sandbox] 课程中心与课程仪表盘的样例数据，只服务样式预览。

/** 距今 daysAgo 天、当天 hour 点的 ISO 时刻，让周进度卡在任何一天打开都有数据。 */
function daysAgoAt(daysAgo: number, hour: number): string {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  date.setHours(hour, 0, 0, 0)
  return date.toISOString()
}

export const courseCenterSampleCourses: CourseCenterCourse[] = [
  {
    id: 'linear-algebra',
    title: '线性代数入门：从向量到特征值',
    coverUrl: null,
    createdAt: '2026-11-02T09:00:00Z',
    typeLabel: '自由课程',
    completedPointCount: 5,
    totalPointCount: 12,
    resumePointTitle: '矩阵乘法的几何意义',
  },
  {
    id: 'python-basics',
    title: 'Python 编程基础',
    coverUrl: null,
    createdAt: '2026-10-18T14:30:00Z',
    typeLabel: '自由课程',
    completedPointCount: 0,
    totalPointCount: 8,
    resumePointTitle: '变量与基本数据类型',
  },
  {
    id: 'mechanics',
    title: '高中物理：力学基础',
    coverUrl: null,
    createdAt: '2026-09-27T08:15:00Z',
    typeLabel: '自由课程',
    completedPointCount: 6,
    totalPointCount: 6,
    resumePointTitle: null,
  },
]

export const courseCenterSampleCompletedAt: string[] = [
  daysAgoAt(0, 9),
  daysAgoAt(1, 20),
  daysAgoAt(1, 21),
  daysAgoAt(3, 19),
  daysAgoAt(6, 10),
  daysAgoAt(8, 15),
  daysAgoAt(10, 9),
]

export const courseDashboardSamples: Record<string, CourseDashboardData> = {
  'linear-algebra': {
    id: 'linear-algebra',
    title: '线性代数入门：从向量到特征值',
    description:
      '从向量的几何直觉出发，依次认识矩阵、线性变换和特征值。每一章先讲清楚「它在空间里做了什么」，再落到计算方法，适合第一次系统学习线性代数的同学。',
    coverUrl: null,
    modules: [
      {
        id: 'la-m1',
        label: '1',
        ordinalLabel: '一',
        title: '向量与空间',
        summary: '把向量当作空间里的箭头，理解加法、数乘和线性组合。',
        progress: 100,
        lessons: [
          {
            id: 'la-l1',
            label: '1',
            title: '向量是什么',
            summary: '从坐标和箭头两个角度认识向量。',
            progress: 100,
            points: [
              { id: 'la-p1', title: '向量的坐标表示', completed: true },
              { id: 'la-p2', title: '向量加法与数乘', completed: true },
            ],
          },
          {
            id: 'la-l2',
            label: '2',
            title: '线性组合与张成',
            summary: null,
            progress: 100,
            points: [
              { id: 'la-p3', title: '线性组合', completed: true },
              { id: 'la-p4', title: '张成空间与线性相关', completed: true },
            ],
          },
        ],
      },
      {
        id: 'la-m2',
        label: '2',
        ordinalLabel: '二',
        title: '矩阵与线性变换',
        summary: '矩阵就是对空间的一次变换，乘法就是变换的复合。',
        progress: 25,
        lessons: [
          {
            id: 'la-l3',
            label: '1',
            title: '矩阵作为变换',
            summary: '看一个 2×2 矩阵怎样拉伸、旋转和剪切平面。',
            progress: 50,
            points: [
              { id: 'la-p5', title: '基向量去了哪里', completed: true },
              { id: 'la-p6', title: '矩阵乘法的几何意义', completed: false },
            ],
          },
          {
            id: 'la-l4',
            label: '2',
            title: '行列式',
            summary: null,
            progress: 0,
            points: [
              { id: 'la-p7', title: '面积的缩放比例', completed: false },
              { id: 'la-p8', title: '行列式的计算', completed: false },
            ],
          },
        ],
      },
      {
        id: 'la-m3',
        label: '3',
        ordinalLabel: '三',
        title: '特征值与特征向量',
        summary: null,
        progress: 0,
        lessons: [
          {
            id: 'la-l5',
            label: '1',
            title: '不变的方向',
            summary: null,
            progress: 0,
            points: [
              { id: 'la-p9', title: '特征向量的直观含义', completed: false },
              { id: 'la-p10', title: '求解特征值', completed: false },
              { id: 'la-p11', title: '对角化', completed: false },
              { id: 'la-p12', title: '应用：矩阵的幂', completed: false },
            ],
          },
        ],
      },
    ],
  },
  'python-basics': {
    id: 'python-basics',
    title: 'Python 编程基础',
    description: '从零开始写 Python：数据类型、流程控制和函数。',
    coverUrl: null,
    modules: [
      {
        id: 'py-m1',
        label: '1',
        ordinalLabel: '一',
        title: '起步',
        summary: null,
        progress: 0,
        lessons: [
          {
            id: 'py-l1',
            label: '1',
            title: '第一个程序',
            summary: null,
            progress: 0,
            points: [
              { id: 'py-p1', title: '变量与基本数据类型', completed: false },
              { id: 'py-p2', title: '输入与输出', completed: false },
            ],
          },
        ],
      },
    ],
  },
  mechanics: {
    id: 'mechanics',
    title: '高中物理：力学基础',
    description: null,
    coverUrl: null,
    modules: [],
  },
}
