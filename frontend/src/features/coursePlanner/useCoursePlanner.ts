import { useState } from 'react'

import { useCourseDetailQuery } from '@/hooks/useCourseDetail'
import { isNotFoundError } from '@/lib/apiUtils'
import {
  mapCourseToToolShellData,
  useCourseOrganizeStream,
  useCourseQuestionnaireQuery,
  useSubmitCourseIntakeMutation,
  type CourseIntakeAnswer,
  type CoursePlannerStage,
  type CourseToolModule,
  type QuestionnaireAnswers,
  type QuestionnaireQuestion,
} from './courseApi'
import type { CourseSearchProgress } from './streamCourseOrganize'

// The presentational props the course tool card needs. The connected views
// (in-conversation card, sandbox) spread this and add context-specific handlers
// like onCancel / onEnterCourse.
export interface CoursePlannerView {
  stage: CoursePlannerStage | undefined
  title: string
  questions: QuestionnaireQuestion[]
  answers: QuestionnaireAnswers
  modules: CourseToolModule[]
  failed: boolean
  // The searching window (决策②/⑤): real search hits + live compose
  // reasoning, streamed over /organize/stream. Only meaningful at stage
  // 'searching'.
  search: CourseSearchProgress | null
  reasoningText: string
  errorMessage: string | null
  isLoading: boolean
  /** 课程已不存在（清库 / 用户删课）：卡片渲染「不存在」而不是无限骨架屏。 */
  isMissing: boolean
  isSubmittingAnswers: boolean
  onAnswerChange: (questionId: string, option: string) => void
  onSubmitAnswers: (answers: CourseIntakeAnswer[]) => void
}

/**
 * The single source of behaviour for the course-planning tool, driven by just a
 * courseId. Both the in-conversation card and the sandbox use it, so live and
 * reload exercise the exact same code path:
 *
 *   GET /courses/{id}          -> stage / title / tree
 *   GET /courses/{id}/questionnaire (only at the questionnaire stage)
 *   POST /intake               -> organize starts in the worker
 *   GET /organize/stream       -> live organize SSE (searching: real search
 *                                 hits + compose reasoning -> materializing ->
 *                                 ready)
 *
 * The DB snapshot is the truth; this hook only orchestrates the calls and holds
 * the transient answer selections.
 */
export function useCoursePlanner(courseId: string | undefined): CoursePlannerView {
  // The course query self-polls while the questionnaire is generating (see
  // useCourseDetailQuery), so stage/questionnaireReady stay fresh with no extra
  // logic here.
  const courseQuery = useCourseDetailQuery(courseId)
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
  // Live organize SSE: real search hits + compose reasoning, then materialization
  // — one continuous stream from organizing through materializing. It writes each
  // live snapshot into the course cache (materializing -> the live tree;
  // done -> ready/failed), so the stage flips with no polling (无轮询).
  const organize = useCourseOrganizeStream(courseId, {
    enabled: stage === 'searching' || stage === 'materializing',
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

  // A transient organize-stream drop (organize.error) is deliberately NOT shown:
  // useCourseOrganizeStream auto-reconnects silently, and a genuine course
  // failure still flips the card to the failed stage via the terminal-code path
  // (a scary red banner for a self-healing blip just hurts the experience). Only
  // real, actionable errors surface here.
  // 课程 404（清库 / 用户删课）单独走 isMissing，不当成可重试的加载失败。
  const isMissing = courseQuery.isError && isNotFoundError(courseQuery.error)
  const errorMessage = submitIntake.isError
    ? '提交问卷失败，请重试'
    : courseQuery.isError && !isMissing
      ? '加载课程失败，请重试'
      : null

  return {
    stage,
    title: shellData?.title ?? '课程规划',
    questions,
    answers,
    modules: shellData?.modules ?? [],
    failed: shellData?.failed ?? false,
    search: organize.search,
    reasoningText: organize.reasoningText,
    errorMessage,
    isLoading: courseQuery.isPending,
    isMissing,
    isSubmittingAnswers: submitIntake.isPending,
    onAnswerChange,
    onSubmitAnswers,
  }
}
