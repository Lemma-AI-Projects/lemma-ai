export interface CourseQuizCopy {
  instructions: string
  rules: string
}

interface QuizContentInput {
  total: number
  singleChoice: number
  multipleChoice: number
  fillBlank: number
  duration: string
}

function createQuizContent({
  total,
  singleChoice,
  multipleChoice,
  fillBlank,
  duration,
}: QuizContentInput): CourseQuizCopy {
  return {
    instructions: `### 说明

这次测验用于检查你是否已经掌握当前内容的核心概念、关键步骤和常见误区。

- 题量：共 ${total} 道题。
- 题型：${singleChoice} 道单选题、${multipleChoice} 道多选题、${fillBlank} 道填空题。
- 预计用时：${duration} 分钟。

建议独立完成，遇到不确定的地方先做标记，提交后再结合反馈复盘。`,
    rules: `### 规则

- 测验期间右侧 AI 功能会暂时禁用。
- 答题数据会在结束后归档，用于生成更贴合你的复习建议。
- 如果现在不方便，可以先跳过，但建议趁内容还新鲜时完成。`,
  }
}

export const courseQuizContent: Record<string, CourseQuizCopy> = {
  'linear-algebra-lecture-12-unit-1': createQuizContent({
    total: 12,
    singleChoice: 6,
    multipleChoice: 4,
    fillBlank: 2,
    duration: '14 到 18',
  }),
  'linear-algebra-lecture-12-unit-1-chapter-1': createQuizContent({
    total: 8,
    singleChoice: 5,
    multipleChoice: 2,
    fillBlank: 1,
    duration: '8 到 12',
  }),
  'linear-algebra-lecture-12-unit-1-chapter-2': createQuizContent({
    total: 10,
    singleChoice: 5,
    multipleChoice: 3,
    fillBlank: 2,
    duration: '10 到 14',
  }),
  'linear-algebra-lecture-12-unit-1-chapter-3': createQuizContent({
    total: 9,
    singleChoice: 4,
    multipleChoice: 3,
    fillBlank: 2,
    duration: '9 到 13',
  }),
  'linear-algebra-lecture-12-unit-2': createQuizContent({
    total: 11,
    singleChoice: 5,
    multipleChoice: 4,
    fillBlank: 2,
    duration: '13 到 17',
  }),
  'linear-algebra-lecture-12-unit-2-chapter-1': createQuizContent({
    total: 8,
    singleChoice: 4,
    multipleChoice: 3,
    fillBlank: 1,
    duration: '8 到 11',
  }),
  'linear-algebra-lecture-12-unit-2-chapter-2': createQuizContent({
    total: 9,
    singleChoice: 4,
    multipleChoice: 3,
    fillBlank: 2,
    duration: '10 到 13',
  }),
  'python-data-structures-notes-unit-1': createQuizContent({
    total: 10,
    singleChoice: 5,
    multipleChoice: 3,
    fillBlank: 2,
    duration: '10 到 15',
  }),
  'python-data-structures-notes-unit-1-chapter-1': createQuizContent({
    total: 8,
    singleChoice: 4,
    multipleChoice: 2,
    fillBlank: 2,
    duration: '8 到 12',
  }),
  'python-data-structures-notes-unit-1-chapter-2': createQuizContent({
    total: 8,
    singleChoice: 4,
    multipleChoice: 3,
    fillBlank: 1,
    duration: '8 到 12',
  }),
  'python-data-structures-notes-unit-2': createQuizContent({
    total: 12,
    singleChoice: 6,
    multipleChoice: 4,
    fillBlank: 2,
    duration: '12 到 16',
  }),
  'python-data-structures-notes-unit-2-chapter-1': createQuizContent({
    total: 8,
    singleChoice: 4,
    multipleChoice: 2,
    fillBlank: 2,
    duration: '8 到 11',
  }),
  'python-data-structures-notes-unit-2-chapter-2': createQuizContent({
    total: 8,
    singleChoice: 4,
    multipleChoice: 3,
    fillBlank: 1,
    duration: '8 到 11',
  }),
  'python-data-structures-notes-unit-2-chapter-3': createQuizContent({
    total: 9,
    singleChoice: 5,
    multipleChoice: 2,
    fillBlank: 2,
    duration: '9 到 12',
  }),
  'machine-learning-fundamentals-unit-1': createQuizContent({
    total: 13,
    singleChoice: 6,
    multipleChoice: 4,
    fillBlank: 3,
    duration: '15 到 20',
  }),
  'machine-learning-fundamentals-unit-1-chapter-1': createQuizContent({
    total: 9,
    singleChoice: 5,
    multipleChoice: 2,
    fillBlank: 2,
    duration: '9 到 13',
  }),
  'machine-learning-fundamentals-unit-1-chapter-2': createQuizContent({
    total: 9,
    singleChoice: 4,
    multipleChoice: 3,
    fillBlank: 2,
    duration: '10 到 14',
  }),
  'machine-learning-fundamentals-unit-1-chapter-3': createQuizContent({
    total: 8,
    singleChoice: 4,
    multipleChoice: 2,
    fillBlank: 2,
    duration: '8 到 12',
  }),
  'machine-learning-fundamentals-unit-2': createQuizContent({
    total: 12,
    singleChoice: 5,
    multipleChoice: 4,
    fillBlank: 3,
    duration: '14 到 18',
  }),
  'machine-learning-fundamentals-unit-2-chapter-1': createQuizContent({
    total: 9,
    singleChoice: 4,
    multipleChoice: 3,
    fillBlank: 2,
    duration: '9 到 13',
  }),
  'machine-learning-fundamentals-unit-2-chapter-2': createQuizContent({
    total: 9,
    singleChoice: 4,
    multipleChoice: 3,
    fillBlank: 2,
    duration: '10 到 14',
  }),
  'calculus-ii-integration-unit-1': createQuizContent({
    total: 12,
    singleChoice: 5,
    multipleChoice: 4,
    fillBlank: 3,
    duration: '15 到 20',
  }),
  'calculus-ii-integration-unit-1-chapter-1': createQuizContent({
    total: 8,
    singleChoice: 4,
    multipleChoice: 2,
    fillBlank: 2,
    duration: '8 到 12',
  }),
  'calculus-ii-integration-unit-1-chapter-2': createQuizContent({
    total: 9,
    singleChoice: 4,
    multipleChoice: 3,
    fillBlank: 2,
    duration: '10 到 14',
  }),
  'calculus-ii-integration-unit-1-chapter-3': createQuizContent({
    total: 9,
    singleChoice: 4,
    multipleChoice: 3,
    fillBlank: 2,
    duration: '10 到 14',
  }),
  'calculus-ii-integration-unit-2': createQuizContent({
    total: 11,
    singleChoice: 5,
    multipleChoice: 3,
    fillBlank: 3,
    duration: '13 到 18',
  }),
  'calculus-ii-integration-unit-2-chapter-1': createQuizContent({
    total: 8,
    singleChoice: 4,
    multipleChoice: 2,
    fillBlank: 2,
    duration: '8 到 12',
  }),
  'calculus-ii-integration-unit-2-chapter-2': createQuizContent({
    total: 8,
    singleChoice: 3,
    multipleChoice: 3,
    fillBlank: 2,
    duration: '9 到 13',
  }),
  'react-performance-patterns-unit-1': createQuizContent({
    total: 10,
    singleChoice: 5,
    multipleChoice: 3,
    fillBlank: 2,
    duration: '11 到 15',
  }),
  'react-performance-patterns-unit-1-chapter-1': createQuizContent({
    total: 8,
    singleChoice: 4,
    multipleChoice: 3,
    fillBlank: 1,
    duration: '8 到 11',
  }),
  'react-performance-patterns-unit-1-chapter-2': createQuizContent({
    total: 8,
    singleChoice: 4,
    multipleChoice: 2,
    fillBlank: 2,
    duration: '8 到 12',
  }),
  'react-performance-patterns-unit-2': createQuizContent({
    total: 12,
    singleChoice: 5,
    multipleChoice: 4,
    fillBlank: 3,
    duration: '13 到 17',
  }),
  'react-performance-patterns-unit-2-chapter-1': createQuizContent({
    total: 8,
    singleChoice: 4,
    multipleChoice: 3,
    fillBlank: 1,
    duration: '8 到 12',
  }),
  'react-performance-patterns-unit-2-chapter-2': createQuizContent({
    total: 9,
    singleChoice: 4,
    multipleChoice: 3,
    fillBlank: 2,
    duration: '10 到 14',
  }),
  'react-performance-patterns-unit-2-chapter-3': createQuizContent({
    total: 8,
    singleChoice: 4,
    multipleChoice: 2,
    fillBlank: 2,
    duration: '8 到 12',
  }),
  'statistics-essentials-unit-1': createQuizContent({
    total: 12,
    singleChoice: 5,
    multipleChoice: 4,
    fillBlank: 3,
    duration: '14 到 18',
  }),
  'statistics-essentials-unit-1-chapter-1': createQuizContent({
    total: 8,
    singleChoice: 4,
    multipleChoice: 2,
    fillBlank: 2,
    duration: '8 到 12',
  }),
  'statistics-essentials-unit-1-chapter-2': createQuizContent({
    total: 9,
    singleChoice: 4,
    multipleChoice: 3,
    fillBlank: 2,
    duration: '10 到 14',
  }),
  'database-systems-notes-unit-1': createQuizContent({
    total: 10,
    singleChoice: 5,
    multipleChoice: 3,
    fillBlank: 2,
    duration: '11 到 15',
  }),
  'database-systems-notes-unit-1-chapter-1': createQuizContent({
    total: 8,
    singleChoice: 4,
    multipleChoice: 2,
    fillBlank: 2,
    duration: '8 到 12',
  }),
  'database-systems-notes-unit-1-chapter-2': createQuizContent({
    total: 8,
    singleChoice: 4,
    multipleChoice: 3,
    fillBlank: 1,
    duration: '8 到 12',
  }),
  'product-analytics-workshop-unit-1': createQuizContent({
    total: 10,
    singleChoice: 5,
    multipleChoice: 3,
    fillBlank: 2,
    duration: '11 到 15',
  }),
  'product-analytics-workshop-unit-1-chapter-1': createQuizContent({
    total: 8,
    singleChoice: 4,
    multipleChoice: 2,
    fillBlank: 2,
    duration: '8 到 12',
  }),
  'product-analytics-workshop-unit-1-chapter-2': createQuizContent({
    total: 9,
    singleChoice: 4,
    multipleChoice: 3,
    fillBlank: 2,
    duration: '9 到 13',
  }),
}
