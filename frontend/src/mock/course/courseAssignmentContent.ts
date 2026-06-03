import type { CourseQuizCopy } from './courseQuizContent'

interface AssignmentContentInput {
  total: number
  singleChoice: number
  multipleChoice: number
  fillBlank: number
  shortAnswer: number
  duration: string
}

function createAssignmentContent({
  total,
  singleChoice,
  multipleChoice,
  fillBlank,
  shortAnswer,
  duration,
}: AssignmentContentInput): CourseQuizCopy {
  return {
    instructions: `### 说明

这次作业用于检查你是否能把当前内容中的关键概念、计算步骤和解释方法独立应用到具体问题中。

- 题量：共 ${total} 道题。
- 题型：${singleChoice} 道单选题、${multipleChoice} 道多选题、${fillBlank} 道填空题、${shortAnswer} 道简答题。
- 预计用时：${duration} 分钟。

建议先独立完成，再回到课程内容中核对思路。遇到不确定的地方可以先写下你的判断依据，提交后再结合反馈复盘。`,
    rules: `### 规则

- 作业期间右侧 AI 功能会暂时禁用。
- 作答数据会在结束后归档，用于生成更贴合你的后续练习建议。
- 如果现在不方便，可以先跳过，但建议在完成本节学习后尽快提交。`,
    resultMarkdown: `### 作业结果分析

本次作业共 ${total} 道题，你完成了全部题目。整体表现显示你已经能识别本节内容的核心概念，但在把概念转化为完整表达时还需要更稳定。

### 题目作答情况

- 客观题部分：基础判断较准确，能根据题干条件筛选出主要信息。
- 填空题部分：能够写出关键结论，但需要继续注意符号和表达的精确性。
- 简答题部分：思路基本完整，但解释中还可以补充更多“为什么这样做”的理由。

### 知识点掌握情况

- 核心定义：掌握较好，能够识别概念中的关键条件。
- 计算步骤：整体顺序清晰，但在多步骤问题中仍要避免跳步。
- 几何解释：已经具备基本直觉，后续需要把直觉表达得更具体。
- 迁移应用：遇到新情境时可以先拆条件，再选择对应方法。

### 后续练习建议

- 复盘本次作业中的简答题，把答案补成“结论 + 理由 + 例子”的结构。
- 针对概念辨析题再做 3 到 5 道同类练习，重点检查条件是否遗漏。
- 针对计算题保留完整步骤，不只写最终答案。
- 下一次练习建议优先选择中等难度题目，训练从题干条件到解题方法的映射。`,
  }
}

export const courseAssignmentContent: Record<string, CourseQuizCopy> = {
  'linear-algebra-lecture-12-unit-1': createAssignmentContent({
    total: 4,
    singleChoice: 1,
    multipleChoice: 1,
    fillBlank: 1,
    shortAnswer: 1,
    duration: '18 到 24',
  }),
  'linear-algebra-lecture-12-unit-1-chapter-1': createAssignmentContent({
    total: 4,
    singleChoice: 1,
    multipleChoice: 1,
    fillBlank: 1,
    shortAnswer: 1,
    duration: '16 到 22',
  }),
}
