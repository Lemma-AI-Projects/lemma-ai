import { useCallback, useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { BacklogStatusIcon } from '@/components/BacklogStatusIcon'
import { CircularProgress } from '@/components/CircularProgress'
import {
  ProgressStatusIcon,
  type ProgressStatus,
} from '@/components/ProgressStatusIcon'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import type { ConversationToolUnit } from './types'

const countdownDurationMs = 60_000
type ToolStage = 'questionnaire' | 'pending' | 'in-progress' | 'ready'

const questionnaireQuestions = [
  {
    id: 'calculus-level',
    title: '你当前对于微积分的掌握程度是？',
    options: ['零基础', '只了解一些基础概念', '有一定的知识基础'],
  },
  {
    id: 'calculus-goal',
    title: '你学习微积分的目的是？',
    options: ['应对考试', '个人兴趣', '课外竞赛'],
  },
  {
    id: 'calculus-duration',
    title: '你想花多长时间进行学习？',
    options: ['1-2周', '1-2个月', '一学期'],
  },
] as const

type QuestionnaireAnswers = Record<string, string | null>

const initialQuestionnaireAnswers = Object.fromEntries(
  questionnaireQuestions.map((question) => [
    question.id,
    question.options[0],
  ])
) as QuestionnaireAnswers

// 工具卡片底部按钮尺寸：h-[33px] 控制 33px 高度，px-[12.5px] 控制横向内边距，
// text-[14px] 控制字号，rounded-full 控制胶囊圆角，font-normal 控制字重。
const actionButtonClassName =
  'h-[33px] rounded-full px-[12.5px] text-[14px] font-normal'

// 次要按钮颜色：variant="outline" 提供基础描边样式；以下类控制边框、背景、
// 默认文字颜色，以及 hover 时的背景和文字颜色。
const secondaryActionButtonClassName = `${actionButtonClassName} border-zinc-300 bg-transparent text-zinc-800 hover:bg-zinc-100 hover:text-zinc-950`

// 主按钮颜色与计时器间距：gap-1.5 控制文字和圆环间距，左侧沿用普通按钮内边距，
// pr-[3px] 让圆环贴近按钮右侧；其余类控制黑色背景、白色文字和 hover 背景。
const primaryActionButtonClassName = `${actionButtonClassName} gap-1.5 bg-zinc-950 pl-[12.5px] pr-[3px] text-white hover:bg-zinc-800`

function QuestionnaireOption({
  id,
  label,
  checked,
  onSelect,
}: {
  id: string
  label: string
  checked: boolean
  onSelect: () => void
}) {
  return (
    <label
      data-slot="field-label"
      onClick={(event) => {
        event.preventDefault()
        onSelect()
      }}
      className={cn(
        'group/field-label flex h-[34px] w-fit items-center gap-2 rounded-full border text-sm font-medium leading-snug whitespace-nowrap select-none',
        checked
          ? 'border-primary/30 bg-primary/5'
          : 'border-input bg-transparent'
      )}
    >
      <div
        role="group"
        data-slot="field"
        data-orientation="horizontal"
        className={cn(
          'group/field flex h-8 w-full flex-row items-center gap-1.5 overflow-hidden py-1.5 transition-all duration-100 ease-linear',
          checked ? 'px-2' : 'px-3'
        )}
      >
        <button
          id={id}
          type="button"
          role="checkbox"
          aria-checked={checked}
          data-state={checked ? 'checked' : 'unchecked'}
          data-slot="checkbox"
          value={label}
          className={cn(
            'peer relative flex size-4 shrink-0 items-center justify-center rounded-full border outline-none transition-all duration-100 ease-linear after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
            checked
              ? 'ml-0 translate-x-0 border-primary bg-primary text-primary-foreground'
              : '-ml-6 -translate-x-1 border-input bg-transparent'
          )}
        >
          {checked && (
            <span
              data-state="checked"
              data-slot="checkbox-indicator"
              className="grid place-content-center text-current transition-none [&>svg]:size-3.5"
            >
              <Check aria-hidden strokeWidth={2} />
            </span>
          )}
        </button>
        <input
          aria-hidden="true"
          tabIndex={-1}
          type="checkbox"
          value={label}
          checked={checked}
          readOnly
          style={{
            position: 'absolute',
            pointerEvents: 'none',
            opacity: 0,
            margin: 0,
            transform: 'translateX(-100%)',
            width: 16,
            height: 16,
          }}
        />
        <div
          data-slot="field-label"
          className="flex w-fit items-center gap-2 text-sm font-medium whitespace-nowrap"
        >
          {label}
        </div>
      </div>
    </label>
  )
}

function QuestionnaireContent({
  answers,
  onAnswerChange,
}: {
  answers: QuestionnaireAnswers
  onAnswerChange: (questionId: string, option: string) => void
}) {
  return (
    <div className="mt-4 flex flex-col gap-5">
      {questionnaireQuestions.map((question) => (
        <section key={question.id}>
          <h4 className="flex min-h-9 items-start py-2 text-[16.5px] font-medium text-zinc-800">
            <span className="min-w-0 flex-1 whitespace-normal break-words leading-5">
              {question.title}
            </span>
          </h4>
          <div className="mt-1 flex flex-row flex-wrap gap-2">
            {question.options.map((option) => {
              const optionId = `${question.id}-${option}`

              return (
                <QuestionnaireOption
                  key={option}
                  id={optionId}
                  label={option}
                  checked={answers[question.id] === option}
                  onSelect={() => onAnswerChange(question.id, option)}
                />
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}

function StartCountdown({ onComplete }: { onComplete: () => void }) {
  const [remainingMs, setRemainingMs] = useState(countdownDurationMs)

  useEffect(() => {
    const endsAt = Date.now() + countdownDurationMs
    const intervalId = window.setInterval(() => {
      const nextRemainingMs = Math.max(0, endsAt - Date.now())
      setRemainingMs(nextRemainingMs)

      if (nextRemainingMs === 0) {
        window.clearInterval(intervalId)
        onComplete()
      }
    }, 100)

    return () => window.clearInterval(intervalId)
  }, [onComplete])

  const seconds = Math.ceil(remainingMs / 1000)
  const progress = (remainingMs / countdownDurationMs) * 100

  return (
    <span
      className="relative flex size-[26px] shrink-0 items-center justify-center"
      aria-label={`剩余 ${seconds} 秒`}
    >
      {/* size / strokeWidth 控制圆环直径和 1.75px 线宽；trackColor 是已流逝轨道，
          progressColor 是随时间缩短的白色进度弧。 */}
      <CircularProgress
        value={progress}
        size={26}
        strokeWidth={1.75}
        trackColor="rgb(255 255 255 / 0.28)"
        progressColor="#ffffff"
        className="absolute inset-0 size-[26px]"
      />
      <span
        aria-hidden
        className="relative text-[10.5px] font-medium tabular-nums leading-none text-white"
      >
        {seconds}
      </span>
    </span>
  )
}

function StatusIcon({
  stage,
  status,
  progress,
}: {
  stage: ToolStage
  status?: ProgressStatus
  progress: number
}) {
  return (
    <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center">
      {stage === 'in-progress' ? (
        <CircularProgress
          value={progress}
          size={15}
          strokeWidth={2.25}
          progressColor="#18181b"
        />
      ) : stage === 'ready' ? (
        <ProgressStatusIcon status={status ?? 'not-started'} value={progress} />
      ) : (
        <BacklogStatusIcon />
      )}
    </span>
  )
}

export function ConversationToolShell({
  title,
  units,
  progress = 0,
}: {
  title: string
  units: ConversationToolUnit[]
  progress?: number
}) {
  const [stage, setStage] = useState<ToolStage>('questionnaire')
  const [questionnaireAnswers, setQuestionnaireAnswers] = useState(
    initialQuestionnaireAnswers
  )
  const normalizedProgress = Math.min(Math.max(Math.round(progress), 0), 100)
  const handleQuestionnaireAnswerChange = useCallback(
    (questionId: string, option: string) => {
      setQuestionnaireAnswers((currentAnswers) => ({
        ...currentAnswers,
        [questionId]: currentAnswers[questionId] === option ? null : option,
      }))
    },
    []
  )
  const handleContinue = useCallback(() => setStage('pending'), [])
  const handleStart = useCallback(() => setStage('in-progress'), [])
  const handleReady = useCallback(() => setStage('ready'), [])

  return (
    <div
      data-slot="conversation-tool-shell"
      translate="no"
      className="flex w-full max-w-[36rem] flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-transparent px-5 py-5"
    >
      {stage === 'questionnaire' ? (
        <div
          key="questionnaire"
          data-stage="questionnaire"
          className="flex flex-col"
        >
          <h3 className="text-[19.5px] font-semibold leading-7 tracking-tight text-zinc-900">
            让我们进行一些更深入的了解：
          </h3>
          <QuestionnaireContent
            answers={questionnaireAnswers}
            onAnswerChange={handleQuestionnaireAnswerChange}
          />
          <div className="-mx-1 -mb-1 mt-auto flex justify-end pt-4">
            <Button
              type="button"
              className={`${actionButtonClassName} bg-zinc-950 text-white hover:bg-zinc-800`}
              onClick={handleContinue}
            >
              继续
            </Button>
          </div>
        </div>
      ) : (
        <div key={stage} data-stage={stage} className="flex flex-col">
          <h3 className="flex items-center gap-2 text-[19.5px] font-semibold leading-7 tracking-tight text-zinc-900">
            <span
              aria-hidden={stage !== 'ready'}
              className={cn(
                'flex size-5 translate-y-[1px] shrink-0 items-center justify-center [&_svg]:size-5',
                stage !== 'ready' && 'hidden'
              )}
            >
              <ProgressStatusIcon status="completed" />
            </span>
            <span>
              {stage === 'ready' && '您的课程已就绪：'}
              {title}
            </span>
          </h3>

          <div className="mt-4 flex flex-col gap-1">
            {units.map((unit) => (
              <section key={unit.id}>
                <div className="flex min-h-9 items-start gap-2 py-2 text-[16.5px] font-medium text-zinc-800">
                  <StatusIcon
                    stage={stage}
                    status={unit.status}
                    progress={
                      stage === 'ready'
                        ? Math.min(Math.max(unit.progress ?? 0, 0), 100)
                        : normalizedProgress
                    }
                  />
                  <span className="min-w-0 flex-1 whitespace-normal break-words leading-5">
                    {unit.title}
                  </span>
                </div>

                <div className="relative ml-1 flex flex-col gap-0.5 pl-7">
                  <div
                    aria-hidden
                    className="absolute bottom-1 left-[7px] top-1 w-px bg-zinc-200"
                  />
                  {unit.chapters.map((chapter) => (
                    <div
                      key={chapter.id}
                      className="flex min-h-9 items-start gap-2 py-2 text-[15.5px] text-zinc-600"
                    >
                      <StatusIcon
                        stage={stage}
                        status={chapter.status}
                        progress={
                          stage === 'ready'
                            ? Math.min(Math.max(chapter.progress ?? 0, 0), 100)
                            : normalizedProgress
                        }
                      />
                      <span className="min-w-0 flex-1 whitespace-normal break-words leading-5">
                        {chapter.title}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {/* 操作栏间距：-mx-1 / -mb-1 将按钮距左右、底部边界从 20px 减至 16px；
              pt-4 控制目录与操作栏间距。 */}
          {stage === 'in-progress' ? (
            <div className="-mx-1 -mb-1 mt-auto flex items-center gap-4 pt-4">
              {/* h-1 来自通用 Progress 默认高度；flex-1 让进度条占满暂停按钮左侧空间，
                  bg-zinc-200 控制轨道颜色，data-slot 选择器将进度部分改为黑色。 */}
              <Progress
                value={normalizedProgress}
                aria-label={`课程总进度 ${normalizedProgress}%`}
                className="min-w-0 flex-1 bg-zinc-200 [&_[data-slot=progress-indicator]]:bg-black"
              />
              {/* size-9 控制圆形按钮直径；rounded-full / bg-zinc-100 控制圆形浅灰底；
                  内层 size-2.5 / bg-zinc-950 控制居中的黑色正方形。 */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="暂停"
                className="size-9 rounded-full bg-zinc-100 p-0 hover:bg-zinc-200"
                onClick={handleReady}
              >
                <span
                  aria-hidden
                  className="size-2.5 rounded-[1px] bg-zinc-950"
                />
              </Button>
            </div>
          ) : stage === 'ready' ? (
            <div className="-mx-1 -mb-1 mt-auto flex justify-end pt-4">
              <Button
                type="button"
                className={`${actionButtonClassName} bg-zinc-950 text-white hover:bg-zinc-800`}
              >
                进入课程
              </Button>
            </div>
          ) : (
            <div className="-mx-1 -mb-1 mt-auto flex items-center justify-between gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                className={secondaryActionButtonClassName}
              >
                编辑
              </Button>
              {/* gap-2 控制“取消”和“开始”之间的 8px 间距。 */}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className={secondaryActionButtonClassName}
                >
                  取消
                </Button>
                <Button
                  type="button"
                  className={primaryActionButtonClassName}
                  onClick={handleStart}
                >
                  开始
                  <StartCountdown onComplete={handleStart} />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
