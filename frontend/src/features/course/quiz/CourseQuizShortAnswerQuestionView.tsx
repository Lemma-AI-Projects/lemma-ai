import type { CourseQuizQuestionViewProps } from '@/features/course/quiz/courseQuizQuestionViewMap'
import { CourseQuizQuestionLayout } from '@/features/course/quiz/CourseQuizQuestionLayout'
import { Textarea } from '@/components/ui/textarea'

export function CourseQuizShortAnswerQuestionView(
  props: CourseQuizQuestionViewProps
) {
  const answer =
    typeof props.answerValue === 'string' ? props.answerValue : ''

  return (
    <CourseQuizQuestionLayout
      {...props}
      canContinue={answer.trim().length > 0}
      title="简答题"
    >
      <Textarea
        value={answer}
        onChange={(event) => props.onAnswerValueChange(event.target.value)}
        placeholder="请输入答案"
        className="mt-7 min-h-36 resize-none rounded-xl border-zinc-200 bg-transparent px-4 py-3 text-[16px] leading-7 shadow-none focus-visible:ring-zinc-300"
      />
    </CourseQuizQuestionLayout>
  )
}
