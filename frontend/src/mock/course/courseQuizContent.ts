export interface CourseQuizCopy {
  instructions: string
  resultMarkdown?: string
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
  'linear-algebra-lecture-12-unit-1-chapter-1': {
    ...createQuizContent({
      total: 8,
      singleChoice: 5,
      multipleChoice: 2,
      fillBlank: 1,
      duration: '8 到 12',
    }),
    resultMarkdown: `### 测验结果分析

本次测验共 8 道题，你答对 6 道，答错 2 道，正确率为 75%。

### 题目作答情况

- 单选题：5 道题中答对 4 道，主要失分点集中在排列计数时对“相邻元素打包”的处理不够稳定。
- 多选题：2 道题中答对 1 道，选项判断时对互斥条件和顺序条件的区分还需要更仔细。
- 填空题：1 道题答对，能正确完成组合计数和概率化简。

### 知识点掌握情况

- 排列中的相邻问题：基本方法已经掌握，能够想到先把必须相邻的对象视为整体，再处理整体内部排列。
- 条件排列与限制位置：理解还不够稳定，遇到“只能排在某些位置”或“保持固定顺序”时，容易漏算或重复计算。
- 组合与概率：整体表现较好，能从样本空间和目标事件两个层面建模，并完成分数化简。
- 多条件题目拆解：需要加强，尤其是多个约束同时出现时，应先判断条件之间是独立、互斥还是包含关系。

### 后续练习建议

- 先复盘错题，写出每道错题的完整计数过程，并标注是哪一步发生了漏算、重算或条件误读。
- 针对“相邻”“不相邻”“固定顺序”“指定位置”四类排列问题各完成 3 到 5 道同类练习。
- 做多选题时先逐项判断，再回到题干检查是否存在隐藏限制，避免凭直觉一次性选择。
- 下一轮练习建议优先选择中等难度题目，重点训练把自然语言条件转化为数学计数步骤。`,
  },
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
