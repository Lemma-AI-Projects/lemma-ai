import { QuizFlow, type QuizFlowPhase } from '@/features/question'
import { CourseQuizInstructionsMarkdown } from './CourseQuizInstructionsMarkdown'

// 课程章节测验的场景文案；题量、作答方式由题组本身决定，不在这里写死。
const COURSE_QUIZ_RULES = `### 规则

- 测验期间右侧 AI 伴学会暂时关闭。
- 如果现在不方便，可以先跳过，但建议趁内容还新鲜时完成。`

/**
 * 课程场景下的测验：题库流程 + 课程规则 +「下一章」。页面据 onPhaseChange
 * 在作答期间禁用伴学输入框。
 */
export function CourseQuizView({
  questionSetId,
  nextHref,
  onExit,
  onPhaseChange,
}: {
  questionSetId: string
  nextHref?: string
  onExit?: () => void
  onPhaseChange?: (phase: QuizFlowPhase) => void
}) {
  return (
    <QuizFlow
      setId={questionSetId}
      instructions={<CourseQuizInstructionsMarkdown>{COURSE_QUIZ_RULES}</CourseQuizInstructionsMarkdown>}
      nextHref={nextHref}
      nextLabel="下一章"
      onExit={onExit}
      onPhaseChange={onPhaseChange}
    />
  )
}
