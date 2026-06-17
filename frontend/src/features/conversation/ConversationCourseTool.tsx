import { useNavigate } from 'react-router-dom'

import { useCoursePlanner } from '@/features/coursePlanner/useCoursePlanner'
import { ConversationToolShell } from './ConversationToolShell'

// Binds a course-planning tool block (just a courseId) to its live data and the
// presentational shell. The conversation feature hosts the course tool, so it
// depends on the coursePlanner feature one way (coursePlanner never imports
// conversation).
export function ConversationCourseTool({ courseId }: { courseId: string }) {
  const navigate = useNavigate()
  const view = useCoursePlanner(courseId)

  // Until the first course snapshot lands we don't know the stage; show a
  // neutral card skeleton instead of guessing a stage (which would flash the
  // wrong layout on reload of a built course).
  if (!view.stage) {
    return (
      <div
        data-slot="conversation-tool-shell"
        aria-hidden
        className="flex w-full max-w-[36rem] flex-col gap-3 rounded-2xl border border-zinc-200/80 px-5 py-5"
      >
        <div className="h-5 w-1/2 animate-pulse rounded bg-zinc-100" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-zinc-100" />
      </div>
    )
  }

  return (
    <ConversationToolShell
      title={view.title}
      stage={view.stage}
      questions={view.questions}
      answers={view.answers}
      units={view.units}
      progress={view.progress}
      failed={view.failed}
      errorMessage={view.errorMessage}
      isSubmittingAnswers={view.isSubmittingAnswers}
      isStartingBuild={view.isStartingBuild}
      onAnswerChange={view.onAnswerChange}
      onSubmitAnswers={view.onSubmitAnswers}
      onApproveBuild={view.onApproveBuild}
      onEnterCourse={() => navigate(`/course/${courseId}`)}
    />
  )
}
