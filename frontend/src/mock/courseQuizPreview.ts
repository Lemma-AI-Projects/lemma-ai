import type { CourseQuestionFlowContent } from '@/features/course/quiz/types'

// 取自旧 courseQuizContent / courseQuizQuestionsContent 的同一条测验记录。
// 原 mock 的说明和结果写 8 题，实际只提供 3 道可交互样例；这里保留原貌用于视觉复原。
export const courseQuizPreview: CourseQuestionFlowContent = {
  id: 'linear-algebra-lecture-12-unit-1-chapter-1-quiz',
  type: 'quiz',
  title: 'Why Eigenvectors Matter',
  data: {
    copy: {
      instructions: `### 说明

这次测验用于检查你是否已经掌握当前内容的核心概念、关键步骤和常见误区。

- 题量：共 8 道题。
- 题型：5 道单选题、2 道多选题、1 道填空题。
- 预计用时：8 到 12 分钟。

建议独立完成，遇到不确定的地方先做标记，提交后再结合反馈复盘。`,
      rules: `### 规则

- 测验期间右侧 AI 功能会暂时禁用。
- 答题数据会在结束后归档，用于生成更贴合你的复习建议。
- 如果现在不方便，可以先跳过，但建议趁内容还新鲜时完成。`,
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
    questions: [
      {
        id: 'linear-algebra-lecture-12-unit-1-chapter-1-q1',
        order: 1,
        type: 'single-choice',
        stem: '为提高和展示学生的艺术水平，也为了激发学生的爱国热情，我校开展劳动节文艺汇演，共有 6 个节目，其中有两个舞蹈，三个唱歌，一个朗诵。若三个唱歌节目必须相邻，则有多少种不同排法？',
        options: [
          { id: 'A', label: 'A', text: '24' },
          { id: 'B', label: 'B', text: '36' },
          { id: 'C', label: 'C', text: '96' },
          { id: 'D', label: 'D', text: '144' },
        ],
        correctAnswer: 'D',
      },
      {
        id: 'linear-algebra-lecture-12-unit-1-chapter-1-q2',
        order: 2,
        type: 'multiple-choice',
        stem: '甲，乙，丙，丁四人并排站成一排，下列说法正确的是（     ）',
        options: [
          {
            id: 'A',
            label: 'A',
            text: '若甲，乙必须相邻，则不同的排法有 12 种',
          },
          {
            id: 'B',
            label: 'B',
            text: '若最左端只能排甲或乙，则不同的排法有 6 种',
          },
          {
            id: 'C',
            label: 'C',
            text: '甲乙不相邻的排法有 24 种',
          },
          {
            id: 'D',
            label: 'D',
            text: '甲乙按从左到右的顺序排列的排法有 12 种',
          },
        ],
        correctAnswer: 'AD',
      },
      {
        id: 'linear-algebra-lecture-12-unit-1-chapter-1-q3',
        order: 3,
        type: 'fill-blank',
        stem: '某校篮球队的成员是来自学校高一 10 个班的 12 位同学，其中高一（3）班、高一（7）班各出 2 人，其余班级各出 1 人。从这 12 人中要选 6 人作为主力队员，则这 6 名主力队员来自不同的班级的概率为________．',
        correctAnswer: '19/33',
      },
    ],
  },
}
