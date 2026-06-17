import { useState } from 'react'

import {
  mapCourseToToolShellData,
  useCourseBuildStream,
  useCourseQuery,
  useCourseQuestionnaireQuery,
  useStartCourseBuildMutation,
  useSubmitCourseIntakeMutation,
  type CourseIntakeAnswer,
  type CoursePlannerStage,
  type CourseToolUnit,
  type QuestionnaireAnswers,
  type QuestionnaireQuestion,
} from './courseApi'

// The presentational props the course tool card needs. The connected views
// (in-conversation card, sandbox) spread this and add context-specific handlers
// like onCancel / onEnterCourse.
export interface CoursePlannerView {
  stage: CoursePlannerStage | undefined
  title: string
  questions: QuestionnaireQuestion[]
  answers: QuestionnaireAnswers
  units: CourseToolUnit[]
  progress: number
  failed: boolean
  errorMessage: string | null
  isLoading: boolean
  isSubmittingAnswers: boolean
  isStartingBuild: boolean
  onAnswerChange: (questionId: string, option: string) => void
  onSubmitAnswers: (answers: CourseIntakeAnswer[]) => void
  onApproveBuild: () => void
}

/**
 * The single source of behaviour for the course-planning tool, driven by just a
 * courseId. Both the in-conversation card and the sandbox use it, so live and
 * reload exercise the exact same code path:
 *
 *   GET /courses/{id}          -> stage / title / progress / outline tree
 *   GET /courses/{id}/questionnaire (only at the questionnaire stage)
 *   POST /intake               -> outline (pending)
 *   POST /build + SSE stream   -> live build progress (in-progress -> ready)
 *
 * The DB snapshot is the truth; this hook only orchestrates the calls and holds
 * the transient answer selections.
 */
export function useCoursePlanner(courseId: string | undefined): CoursePlannerView {
  // The course query self-polls while the questionnaire is generating (see
  // useCourseQuery), so stage/questionnaireReady stay fresh without extra logic.
  const courseQuery = useCourseQuery(courseId, { enabled: Boolean(courseId) })
  const shellData = courseQuery.data
    ? mapCourseToToolShellData(courseQuery.data)
    : null
  const stage = shellData?.stage
  const questionnaireReady = courseQuery.data?.questionnaireReady ?? false

  // The questionnaire only matters at the intake stage, and only once it has
  // actually been generated — until then the card shows a skeleton (the poll
  // above keeps the snapshot fresh).
  const questionnaireQuery = useCourseQuestionnaireQuery(courseId, {
    enabled: Boolean(courseId) && stage === 'questionnaire' && questionnaireReady,
  })
  const questions = questionnaireQuery.data?.questions ?? []

  // Answers start empty and fill in as the user selects: the shell treats a
  // missing key exactly like null (unanswered), so no effect-based seeding is
  // needed (avoids a setState-in-effect cascade).
  const [answers, setAnswers] = useState<QuestionnaireAnswers>({})

  const submitIntake = useSubmitCourseIntakeMutation()
  const startBuild = useStartCourseBuildMutation()
  // Streams the live build snapshot into the course query cache while building.
  const buildStream = useCourseBuildStream(courseId, {
    enabled: stage === 'in-progress',
  })

  const onAnswerChange = (questionId: string, option: string) => {
    setAnswers((current) => ({
      ...current,
      [questionId]: current[questionId] === option ? null : option,
    }))
  }

  const onSubmitAnswers = (selected: CourseIntakeAnswer[]) => {
    if (courseId && selected.length > 0) {
      submitIntake.mutate({ courseId, answers: selected })
    }
  }

  const onApproveBuild = () => {
    if (courseId) {
      startBuild.mutate(courseId, {
        onSuccess: () => void courseQuery.refetch(),
      })
    }
  }

  const errorMessage = submitIntake.isError
    ? '生成大纲失败，请重试'
    : startBuild.isError
      ? '启动课程构建失败，请重试'
      : buildStream.error
        ? '构建进度连接中断，正在尝试恢复'
        : courseQuery.isError
          ? '加载课程失败，请重试'
          : null

  return {
    stage,
    title: shellData?.title ?? '课程规划',
    questions,
    answers,
    units: shellData?.units ?? [],
    progress: shellData?.progress ?? 0,
    failed: shellData?.failed ?? false,
    errorMessage,
    isLoading: courseQuery.isPending,
    isSubmittingAnswers: submitIntake.isPending,
    isStartingBuild: startBuild.isPending,
    onAnswerChange,
    onSubmitAnswers,
    onApproveBuild,
  }
}
