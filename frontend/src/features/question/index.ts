// 题库 feature 的唯一公共入口。其他 feature 只能从这里引用（rules 第三章）；
// 槽位组件、作答草稿等内部实现不导出。
export { QuestionPlayer } from './views/QuestionPlayer'
export { QuizFlow, type QuizFlowPhase } from './views/QuizFlow'
export { QuestionSetBrowser } from './views/QuestionSetBrowser'
export type { QuestionPlayerMode } from './content/renderModel'
export {
  useQuestionSetQuery,
  useQuestionSetsQuery,
  useSubmitAttemptsMutation,
  useAttemptResultsQuery,
} from './questionApi'
