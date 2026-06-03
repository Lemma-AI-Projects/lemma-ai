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
        className="mt-7 min-h-36 resize-none rounded-xl border-zinc-200 bg-transparent px-4 py-3 text-[17px] font-normal leading-8 text-zinc-900 shadow-none transition-colors duration-150 ease-out focus-visible:border-zinc-900 focus-visible:ring-0 focus-visible:ring-offset-0 md:text-[17px]"
      />
    </CourseQuizQuestionLayout>
  )
}
