import type { CourseQuizQuestion } from './courseItems'

export const courseAssignmentQuestionsContent: Record<
  string,
  CourseQuizQuestion[]
> = {
  'linear-algebra-lecture-12-unit-1': [
    {
      id: 'linear-algebra-lecture-12-unit-1-assignment-q1',
      order: 1,
      type: 'single-choice',
      stem: '如果一个非零向量 v 是矩阵 A 的特征向量，下列说法正确的是（     ）',
      options: [
        { id: 'A', label: 'A', text: 'Av 一定与 v 在同一条直线上' },
        { id: 'B', label: 'B', text: 'Av 一定等于 v' },
        { id: 'C', label: 'C', text: 'A 一定不会改变 v 的长度' },
        { id: 'D', label: 'D', text: 'v 一定是标准基向量' },
      ],
      correctAnswer: 'A',
    },
    {
      id: 'linear-algebra-lecture-12-unit-1-assignment-q2',
      order: 2,
      type: 'multiple-choice',
      stem: '关于特征值和特征向量，下列说法正确的是（     ）',
      options: [
        { id: 'A', label: 'A', text: '特征值描述特征向量方向上的缩放倍数' },
        { id: 'B', label: 'B', text: '零向量可以作为特征向量' },
        { id: 'C', label: 'C', text: '同一个特征值可能对应多个特征向量' },
        { id: 'D', label: 'D', text: '每个矩阵都一定有实数特征值' },
      ],
      correctAnswer: 'AC',
    },
    {
      id: 'linear-algebra-lecture-12-unit-1-assignment-q3',
      order: 3,
      type: 'fill-blank',
      stem: '若 Av = λv，且 v 为非零向量，则 λ 称为矩阵 A 对应于 v 的________。',
      correctAnswer: '特征值',
    },
    {
      id: 'linear-algebra-lecture-12-unit-1-assignment-q4',
      order: 4,
      type: 'short-answer',
      stem: '请用自己的话解释：为什么特征向量可以帮助我们理解一个线性变换的几何作用？',
    },
  ],
  'linear-algebra-lecture-12-unit-1-chapter-1': [
    {
      id: 'linear-algebra-lecture-12-unit-1-chapter-1-assignment-q1',
      order: 1,
      type: 'single-choice',
      stem: '从几何角度看，特征向量最核心的特点是（     ）',
      options: [
        { id: 'A', label: 'A', text: '变换后仍停留在原来的方向线上' },
        { id: 'B', label: 'B', text: '变换后一定长度不变' },
        { id: 'C', label: 'C', text: '变换后一定旋转 90 度' },
        { id: 'D', label: 'D', text: '只能出现在二维空间中' },
      ],
      correctAnswer: 'A',
    },
    {
      id: 'linear-algebra-lecture-12-unit-1-chapter-1-assignment-q2',
      order: 2,
      type: 'multiple-choice',
      stem: '判断一个方向是否可能是稳定方向时，可以关注哪些信息？（     ）',
      options: [
        { id: 'A', label: 'A', text: '变换前后的向量是否共线' },
        { id: 'B', label: 'B', text: '变换是否只改变了长度或方向正负' },
        { id: 'C', label: 'C', text: '向量是否一定等于零向量' },
        { id: 'D', label: 'D', text: '该方向是否被变换到完全不同的方向' },
      ],
      correctAnswer: 'AB',
    },
    {
      id: 'linear-algebra-lecture-12-unit-1-chapter-1-assignment-q3',
      order: 3,
      type: 'fill-blank',
      stem: '如果线性变换只把某个方向上的向量拉伸、压缩或反向，而不把它转到别的方向，这个方向可以称为变换的________方向。',
      correctAnswer: '稳定',
    },
    {
      id: 'linear-algebra-lecture-12-unit-1-chapter-1-assignment-q4',
      order: 4,
      type: 'short-answer',
      stem: '请举一个生活中的类比，说明“方向保持不变但长度可能改变”是什么意思。',
    },
  ],
}
