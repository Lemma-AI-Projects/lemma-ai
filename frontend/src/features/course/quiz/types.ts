// 测验 / 作业的本地类型。
//
// 测验能力还没有后端契约（生成、提交、评分都未实现），所以这套组件
// 仅在 sandbox 预览，未接入正式课程路由。类型原先住在
// mock/course/courseItems.ts 里，那份 mock 已随课程域重构删除，因此就近搬到这里。
// 未来接后端时，以 backend/schemas 为准重新定义，不要把这些形状当契约。

export type CourseQuizQuestionType =
  | 'single-choice'
  | 'multiple-choice'
  | 'fill-blank'
  | 'short-answer'

export interface CourseQuizQuestionOption {
  id: string
  label: string
  text: string
}

export interface CourseQuizQuestion {
  id: string
  order: number
  type: CourseQuizQuestionType
  stem?: string
  options?: CourseQuizQuestionOption[]
  correctAnswer?: string
}

export interface CourseQuizCopy {
  instructions: string
  resultMarkdown?: string
  rules: string
}

export interface CourseQuiz {
  questions: CourseQuizQuestion[]
  copy: CourseQuizCopy
}

/** 一次答题流程（测验或作业）需要的全部输入。 */
export interface CourseQuestionFlowContent {
  /** 稳定 id，用于给答案分桶、切换内容时重挂组件。 */
  id: string
  type: 'quiz' | 'assignment'
  title: string
  data: CourseQuiz
}
