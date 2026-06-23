import { Check, CircleCheckBig } from 'lucide-react'
import type { ReactNode } from 'react'

import { BacklogStatusIcon } from '@/components/BacklogStatusIcon'
import { CircularProgress } from '@/components/CircularProgress'
import {
  ProgressStatusIcon,
  type ProgressStatus,
} from '@/components/ProgressStatusIcon'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import type { QuestionnaireAnswers } from '@/features/coursePlanner/courseApi'
import type { CourseSearchProgress } from '@/features/coursePlanner/streamCourseOrganize'
import { ConversationToolSearching } from './ConversationToolSearching'
import {
  ConversationOutlineSkeleton,
  ConversationQuestionnaireSkeleton,
} from './ConversationToolSkeleton'
import type {
  ConversationToolAnswer,
  ConversationToolQuestion,
  ConversationToolStage,
  ConversationToolUnit,
} from './types'

// Re-exported so existing importers keep a single import site; the type itself
// is owned by the course domain (coursePlanner/courseApi).
export type { QuestionnaireAnswers }

// 工具卡片底部按钮尺寸：h-[33px] 控制 33px 高度，px-[12.5px] 控制横向内边距。
const actionButtonClassName =
  'h-[33px] rounded-full px-[12.5px] text-[14px] font-normal'
const secondaryActionButtonClassName = `${actionButtonClassName} border-zinc-300 bg-transparent text-zinc-800 hover:bg-zinc-100 hover:text-zinc-950`
const primaryActionButtonClassName = `${actionButtonClassName} bg-zinc-950 text-white hover:bg-zinc-800`

function normalizeProgress(progress: number | undefined): number {
  return Math.min(Math.max(Math.round(progress ?? 0), 0), 100)
}

function getSelectedAnswers(
  questions: ConversationToolQuestion[],
  answers: QuestionnaireAnswers
): ConversationToolAnswer[] {
  return questions.flatMap((question) => {
    const answer = answers[question.id]
    return answer ? [{ questionId: question.id, answer }] : []
  })
}

function QuestionnaireOption({
  id,
  label,
  checked,
  disabled,
  onSelect,
}: {
  id: string
  label: string
  checked: boolean
  disabled: boolean
  onSelect: () => void
}) {
  return (
    <label
      data-slot="field-label"
      onClick={(event) => {
        event.preventDefault()
        if (!disabled) {
          onSelect()
        }
      }}
      className={cn(
        'group/field-label flex h-[34px] w-fit items-center gap-2 rounded-full border text-sm font-medium leading-snug whitespace-nowrap select-none',
        disabled && 'cursor-not-allowed opacity-60',
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
          role="radio"
          aria-checked={checked}
          disabled={disabled}
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
          type="radio"
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
  questions,
  answers,
  disabled,
  onAnswerChange,
}: {
  questions: ConversationToolQuestion[]
  answers: QuestionnaireAnswers
  disabled: boolean
  onAnswerChange?: (questionId: string, option: string) => void
}) {
  if (questions.length === 0) {
    // Questionnaire still generating in the background -> shadcn form skeleton
    // (never the "generating questionnaire" text).
    return <ConversationQuestionnaireSkeleton />
  }

  return (
    <div className="mt-4 flex flex-col gap-5">
      {questions.map((question) => (
        <section key={question.id}>
          <h4 className="flex min-h-9 items-start py-2 text-[16.5px] font-medium text-zinc-800">
            <span className="min-w-0 flex-1 whitespace-normal break-words leading-5">
              {question.title}
            </span>
          </h4>
          <div className="mt-1 flex flex-row flex-wrap gap-2">
            {question.options.map((option) => (
              <QuestionnaireOption
                key={option}
                id={`${question.id}-${option}`}
                label={option}
                checked={answers[question.id] === option}
                disabled={disabled}
                onSelect={() => onAnswerChange?.(question.id, option)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

type OutlineItem = { status?: ProgressStatus; progress?: number }

// The default per-item icon for the outline stages (pending / in-progress /
// ready-failed): a terminal item (completed / failed) wins over the stage so a
// chapter shows its check / red-X even while siblings are still building.
function renderOutlineStatusIcon(
  stage: ConversationToolStage,
  { status, progress }: OutlineItem
): ReactNode {
  if (status === 'completed' || status === 'failed') {
    return <ProgressStatusIcon status={status} />
  }
  if (stage === 'in-progress') {
    return (
      <CircularProgress
        value={normalizeProgress(progress)}
        size={15}
        strokeWidth={2.25}
        progressColor="#18181b"
        animated
      />
    )
  }
  if (stage === 'ready') {
    return (
      <ProgressStatusIcon
        status={status ?? 'not-started'}
        value={normalizeProgress(progress)}
      />
    )
  }
  return <BacklogStatusIcon />
}

// 物料化: a spinner while a chapter is still researching, a black check once its
// video + overview are ready (与 sandbox 一致).
function renderMaterializingIcon({ status }: OutlineItem): ReactNode {
  if (status === 'completed') {
    return <CircleCheckBig className="size-4 text-zinc-950" />
  }
  return <Spinner className="size-[15px] text-zinc-900" />
}

// The unit/chapter tree shared by every outline-shaped stage; `renderIcon`
// supplies the leading icon (status / spinner / backlog) per item.
function OutlineTree({
  units,
  renderIcon,
}: {
  units: ConversationToolUnit[]
  renderIcon: (item: OutlineItem) => ReactNode
}) {
  if (units.length === 0) {
    // Outline arrives with the intake response, so this only flashes briefly.
    return <ConversationOutlineSkeleton />
  }

  return (
    <div className="mt-4 flex flex-col gap-1">
      {units.map((unit) => (
        <section key={unit.id}>
          <div className="flex min-h-9 items-start gap-2 py-2 text-[16.5px] font-medium text-zinc-800">
            <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center">
              {renderIcon(unit)}
            </span>
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
                <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center">
                  {renderIcon(chapter)}
                </span>
                <span className="min-w-0 flex-1 whitespace-normal break-words leading-5">
                  {chapter.title}
                </span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function OutlineContent({
  stage,
  units,
}: {
  stage: ConversationToolStage
  units: ConversationToolUnit[]
}) {
  return (
    <OutlineTree
      units={units}
      renderIcon={(item) => renderOutlineStatusIcon(stage, item)}
    />
  )
}

function getOutlineTitlePrefix({
  failed,
  stage,
}: {
  failed: boolean
  stage: ConversationToolStage
}) {
  if (stage === 'ready') {
    return failed ? '课程生成未完成：' : '您的课程已就绪：'
  }

  return ''
}

export function ConversationToolShell({
  title,
  stage,
  questions = [],
  answers = {},
  units = [],
  progress = 0,
  failed = false,
  search = null,
  reasoningText = '',
  errorMessage,
  isSubmittingAnswers = false,
  onAnswerChange,
  onSubmitAnswers,
  onCancel,
  onEnterCourse,
}: {
  title: string
  stage: ConversationToolStage
  questions?: ConversationToolQuestion[]
  answers?: QuestionnaireAnswers
  units?: ConversationToolUnit[]
  progress?: number
  // The build finished but produced no usable course (every chapter failed);
  // only meaningful when stage === 'ready'.
  failed?: boolean
  // The searching window (decision ②/⑤): real search hits + live compose
  // reasoning. Only meaningful when stage === 'searching'.
  search?: CourseSearchProgress | null
  reasoningText?: string
  errorMessage?: string | null
  isSubmittingAnswers?: boolean
  onAnswerChange?: (questionId: string, option: string) => void
  onSubmitAnswers?: (answers: ConversationToolAnswer[]) => void
  onCancel?: () => void
  onEnterCourse?: () => void
}) {
  const normalizedProgress = normalizeProgress(progress)
  const selectedAnswers = getSelectedAnswers(questions, answers)
  const canSubmitAnswers =
    selectedAnswers.length > 0 && Boolean(onSubmitAnswers) && !isSubmittingAnswers
  const titlePrefix = getOutlineTitlePrefix({ failed, stage })

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
            questions={questions}
            answers={answers}
            disabled={isSubmittingAnswers}
            onAnswerChange={onAnswerChange}
          />
          {errorMessage ? (
            <p className="mt-3 text-sm text-destructive">{errorMessage}</p>
          ) : null}
          <div className="-mx-1 -mb-1 mt-auto flex justify-end pt-4">
            <Button
              type="button"
              disabled={!canSubmitAnswers}
              className={`${actionButtonClassName} bg-zinc-950 text-white hover:bg-zinc-800`}
              onClick={() => onSubmitAnswers?.(selectedAnswers)}
            >
              {isSubmittingAnswers ? '提交中…' : '继续'}
            </Button>
          </div>
        </div>
      ) : stage === 'searching' ? (
        <ConversationToolSearching
          title={title}
          search={search}
          reasoningText={reasoningText}
          errorMessage={errorMessage}
        />
      ) : stage === 'materializing' ? (
        <div key="materializing" data-stage="materializing" className="flex flex-col">
          <h3 className="flex items-center gap-2 text-[19.5px] font-semibold leading-7 tracking-tight text-zinc-900">
            <span className="flex size-5 translate-y-[1px] shrink-0 items-center justify-center">
              <Spinner
                aria-label="正在准备课程内容"
                className="size-[17px] text-zinc-900"
              />
            </span>
            <span>{title}</span>
          </h3>

          <OutlineTree units={units} renderIcon={renderMaterializingIcon} />

          {errorMessage ? (
            <p className="mt-3 text-sm text-destructive">{errorMessage}</p>
          ) : null}

          <div className="-mx-1 -mb-1 mt-auto flex items-center justify-between gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              disabled
              className={secondaryActionButtonClassName}
            >
              编辑
            </Button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className={secondaryActionButtonClassName}
                onClick={onCancel}
              >
                取消
              </Button>
              <Button
                type="button"
                disabled
                className={primaryActionButtonClassName}
              >
                开始
              </Button>
            </div>
          </div>
        </div>
      ) : stage === 'ready' && !failed ? (
        <div key="ready" data-stage="ready" className="flex flex-col">
          <h3 className="text-[19.5px] font-semibold leading-7 tracking-tight text-zinc-900">
            <span>您的课程已就绪：{title}</span>
          </h3>

          <OutlineTree units={units} renderIcon={() => <BacklogStatusIcon />} />

          {errorMessage ? (
            <p className="mt-3 text-sm text-destructive">{errorMessage}</p>
          ) : null}

          <div className="-mx-1 -mb-1 mt-auto flex justify-end pt-4">
            <Button
              type="button"
              disabled={!onEnterCourse}
              className={primaryActionButtonClassName}
              onClick={onEnterCourse}
            >
              进入课程
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
              <ProgressStatusIcon status={failed ? 'failed' : 'completed'} />
            </span>
            <span>
              {titlePrefix}
              {title}
            </span>
          </h3>

          <OutlineContent stage={stage} units={units} />

          {errorMessage ? (
            <p className="mt-3 text-sm text-destructive">{errorMessage}</p>
          ) : null}

          {stage === 'in-progress' ? (
            <div className="-mx-1 -mb-1 mt-auto flex items-center gap-4 pt-4">
              <Progress
                value={normalizedProgress}
                aria-label={`课程总进度 ${normalizedProgress}%`}
                className="min-w-0 flex-1 bg-zinc-200 [&_[data-slot=progress-indicator]]:bg-black [&_[data-slot=progress-indicator]]:duration-500 [&_[data-slot=progress-indicator]]:ease-out [&_[data-slot=progress-indicator]]:motion-reduce:transition-none"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled
                aria-label="构建由后端任务执行，暂不支持暂停"
                className="size-9 rounded-full bg-zinc-100 p-0 hover:bg-zinc-100"
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
                disabled={!onEnterCourse || failed}
                className={`${actionButtonClassName} bg-zinc-950 text-white hover:bg-zinc-800`}
                onClick={onEnterCourse}
              >
                进入课程
              </Button>
            </div>
          ) : (
            <div className="-mx-1 -mb-1 mt-auto flex items-center justify-between gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                disabled
                className={secondaryActionButtonClassName}
              >
                编辑
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className={secondaryActionButtonClassName}
                  onClick={onCancel}
                >
                  取消
                </Button>
                <Button
                  type="button"
                  disabled
                  className={primaryActionButtonClassName}
                >
                  开始
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
