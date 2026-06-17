import { useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Ellipsis, Share2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ConversationInput } from '@/features/conversation/ConversationInput'
import { ConversationMessageList } from '@/features/conversation/ConversationMessageList'
import {
  ConversationToolShell,
  type QuestionnaireAnswers,
} from '@/features/conversation/ConversationToolShell'
import { ConversationStreamingTurn } from '@/features/conversation/ConversationStreamingTurn'
import { createConversationTurns } from '@/features/conversation/createConversationTurns'
import {
  courseQueryKey,
  mapCourseToToolShellData,
  useCourseBuildStream,
  useCourseQuery,
  useCreateCoursePlanMutation,
  useStartCourseBuildMutation,
  useSubmitCourseIntakeMutation,
  type CourseIntakeAnswer,
  type QuestionnaireQuestion,
} from '@/features/coursePlanner/courseApi'

function createEmptyAnswers(
  questions: QuestionnaireQuestion[]
): QuestionnaireAnswers {
  return Object.fromEntries(
    questions.map((question) => [question.id, null])
  ) as QuestionnaireAnswers
}

// [sandbox] 课程编排端到端调试页：真实请求课程 plan/intake/build/stream，
// 用于验证 ConversationToolShell 的后端驱动四态。
export function ConversationSandboxPage() {
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState('')
  const [topic, setTopic] = useState<string | null>(null)
  const [sentAt, setSentAt] = useState<string | null>(null)
  const [courseId, setCourseId] = useState<string | undefined>()
  const [answers, setAnswers] = useState<QuestionnaireAnswers>({})
  const scrollRef = useRef<HTMLDivElement>(null)

  const createPlanMutation = useCreateCoursePlanMutation()
  const submitIntakeMutation = useSubmitCourseIntakeMutation()
  const startBuildMutation = useStartCourseBuildMutation()
  const courseQuery = useCourseQuery(courseId, { enabled: Boolean(courseId) })
  const courseShellData = courseQuery.data
    ? mapCourseToToolShellData(courseQuery.data)
    : null
  const buildStream = useCourseBuildStream(courseId, {
    enabled: courseShellData?.stage === 'in-progress',
  })

  const questions = createPlanMutation.data?.questionnaire.questions ?? []
  const toolStage =
    courseShellData?.stage ?? (createPlanMutation.data ? 'questionnaire' : null)
  const toolTitle =
    courseShellData?.title ?? (topic ? `${topic} 学习计划` : '课程规划')
  const toolUnits = courseShellData?.units ?? []
  const toolProgress = courseShellData?.progress ?? 0
  const toolFailed = courseShellData?.failed ?? false

  const turns = useMemo(
    () =>
      topic && sentAt
        ? createConversationTurns('course-planner-sandbox', [
            {
              role: 'user',
              message: topic,
              date: sentAt,
            },
          ])
        : [],
    [sentAt, topic]
  )
  const messageList = useMemo(
    () => (turns.length > 0 ? <ConversationMessageList turns={turns} /> : null),
    [turns]
  )

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [
    createPlanMutation.isPending,
    courseShellData?.stage,
    toolProgress,
    turns.length,
  ])

  const resetPlanner = () => {
    if (courseId) {
      queryClient.removeQueries({ queryKey: courseQueryKey(courseId) })
    }
    setTopic(null)
    setSentAt(null)
    setCourseId(undefined)
    setAnswers({})
    setDraft('')
    createPlanMutation.reset()
    submitIntakeMutation.reset()
    startBuildMutation.reset()
  }

  const handleSend = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || createPlanMutation.isPending) {
      return
    }

    resetPlanner()
    const nextSentAt = new Date().toISOString()
    setTopic(trimmed)
    setSentAt(nextSentAt)

    createPlanMutation.mutate(
      { topic: trimmed },
      {
        onSuccess: (plan) => {
          setCourseId(plan.courseId)
          setAnswers(createEmptyAnswers(plan.questionnaire.questions))
        },
      }
    )
  }

  const handleAnswerChange = (questionId: string, option: string) => {
    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [questionId]: currentAnswers[questionId] === option ? null : option,
    }))
  }

  const handleSubmitAnswers = (selectedAnswers: CourseIntakeAnswer[]) => {
    if (!courseId || selectedAnswers.length === 0) {
      return
    }

    submitIntakeMutation.mutate({
      courseId,
      answers: selectedAnswers,
    })
  }

  const handleApproveBuild = () => {
    if (!courseId) {
      return
    }

    startBuildMutation.mutate(courseId, {
      onSuccess: () => {
        void courseQuery.refetch()
      },
    })
  }

  const toolErrorMessage =
    createPlanMutation.isError
      ? '生成问卷失败，请重试'
      : submitIntakeMutation.isError
        ? '生成大纲失败，请重试'
        : startBuildMutation.isError
          ? '启动课程构建失败，请重试'
          : buildStream.error
            ? '构建进度连接中断，正在尝试恢复'
            : null

  return (
    <div className="relative flex h-full flex-col rounded-md border border-zinc-200/80 bg-zinc-50">
      <div className="absolute right-3.75 top-3.75 z-10 flex items-center gap-2.75">
        <Button
          variant="outline"
          aria-label="Share conversation"
          className="size-[34px] rounded-full bg-transparent p-0 hover:bg-muted"
        >
          <Share2 className="size-4" />
        </Button>
        <Button
          variant="outline"
          aria-label="More actions"
          className="size-[34px] rounded-full bg-transparent p-0 hover:bg-muted"
        >
          <Ellipsis className="size-4" />
        </Button>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col pt-16">
        <div
          ref={scrollRef}
          className="scrollbar-fade min-h-0 flex-1 overflow-y-auto"
        >
          <div className="mx-auto flex min-h-full w-full max-w-[55rem] flex-col px-6 pb-40">
            {messageList ?? (
              <div className="flex flex-1 items-center justify-center py-10">
                <p className="text-sm text-zinc-400">
                  输入一个主题，开始真实课程编排流程。
                </p>
              </div>
            )}

            {createPlanMutation.isPending ? (
              <div className="py-6">
                <p className="text-sm text-zinc-500">正在生成问卷…</p>
              </div>
            ) : createPlanMutation.isError ? (
              <div className="py-6">
                <p className="text-sm text-destructive">
                  {toolErrorMessage ?? '生成问卷失败，请重试'}
                </p>
              </div>
            ) : toolStage ? (
              <div className="py-6">
                <ConversationToolShell
                  title={toolTitle}
                  stage={toolStage}
                  questions={questions}
                  answers={answers}
                  units={toolUnits}
                  progress={toolProgress}
                  failed={toolFailed}
                  errorMessage={toolErrorMessage}
                  isSubmittingAnswers={submitIntakeMutation.isPending}
                  isStartingBuild={startBuildMutation.isPending}
                  onAnswerChange={handleAnswerChange}
                  onSubmitAnswers={handleSubmitAnswers}
                  onApproveBuild={handleApproveBuild}
                  onCancel={resetPlanner}
                />
              </div>
            ) : null}

            <ConversationStreamingTurn
              status="idle"
              text=""
              errorMessage={null}
              canRetry={false}
              onRetry={() => undefined}
            />
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col">
          <div className="pointer-events-auto relative z-10 px-6">
            <ConversationInput
              className="mx-auto w-full max-w-[52rem]"
              value={draft}
              onValueChange={setDraft}
              isStreaming={createPlanMutation.isPending}
              onSend={handleSend}
              onStop={() => undefined}
            />
          </div>
          <div aria-hidden className="relative z-0 -mt-6 px-6">
            <div className="mx-auto h-12 w-full max-w-[52rem] bg-zinc-50" />
          </div>
        </div>
      </div>
    </div>
  )
}
