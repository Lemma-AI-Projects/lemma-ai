import { useNavigate } from 'react-router-dom'

import { useCoursePlanner } from '@/features/coursePlanner/useCoursePlanner'
import { ConversationToolShell } from './ConversationToolShell'
import { ConversationToolCardSkeleton } from './ConversationToolSkeleton'

// Binds a course-planning tool block (just a courseId) to its live data and the
// presentational shell. The conversation feature hosts the course tool, so it
// depends on the coursePlanner feature one way (coursePlanner never imports
// conversation).
export function ConversationCourseTool({ courseId }: { courseId: string }) {
  const navigate = useNavigate()
  const view = useCoursePlanner(courseId)

  // The course is gone (deleted by the user, or wiped in development). Without
  // this branch `stage` stays undefined and the card would spin forever.
  if (view.isMissing) {
    return (
      <div
        data-slot="conversation-tool-shell"
        className="flex w-full max-w-[36rem] flex-col rounded-2xl border border-zinc-200/80 px-5 py-5"
      >
        <p className="text-sm text-zinc-400">课程不存在或已删除</p>
      </div>
    )
  }

  // Until the first course snapshot lands we don't know the stage; show a
  // neutral card skeleton instead of guessing a stage (which would flash the
  // wrong layout on reload of a built course).
  if (!view.stage) {
    return <ConversationToolCardSkeleton />
  }

  return (
    <ConversationToolShell
      title={view.title}
      stage={view.stage}
      questions={view.questions}
      answers={view.answers}
      modules={view.modules}
      failed={view.failed}
      search={view.search}
      reasoningText={view.reasoningText}
      errorMessage={view.errorMessage}
      isSubmittingAnswers={view.isSubmittingAnswers}
      onAnswerChange={view.onAnswerChange}
      onSubmitAnswers={view.onSubmitAnswers}
      onEnterCourse={() => navigate(`/courses/${courseId}`)}
    />
  )
}
