import { useState } from 'react'
import { Check, Pause, Play, RotateCw, X } from 'lucide-react'

import { ActionMenu, ActionMenuItem } from '@/components/ActionMenu'
import { cn } from '@/lib/utils'
import {
  useActiveGoalQuery,
  useCloseGoalMutation,
  useConfirmNewGoalMutation,
  useSetGoalStatusMutation,
  useUpdateGoalMutation,
  suggestGoal,
  type GoalDraftInput,
} from './goalApi'
import {
  PURPOSE_LABELS,
  USER_CLOSE_OPTIONS,
  describeDeadline,
  formatDeadline,
  restateGoal,
} from './goalText'
import type {
  GoalCloseReason,
  GoalPurpose,
  GoalSuggestion,
  SpaceGoal,
} from './types'

const FIELD =
  'w-full rounded-lg border border-zinc-200 bg-background px-2.5 py-1.5 text-[13px] text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus-visible:border-zinc-400 focus-visible:ring-[3px] focus-visible:ring-foreground/10'
const PRIMARY =
  'inline-flex h-7 items-center rounded-full bg-foreground px-3 text-[12px] font-medium text-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-foreground/20 disabled:opacity-40'
const QUIET =
  'inline-flex h-7 items-center gap-1 rounded-full px-2 text-[12px] text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-foreground/10 disabled:opacity-40'

/** 本地正在编辑的一句话目标 —— 还没落库，所以它有自己的形状。 */
export interface LocalGoalDraft {
  targetText: string
  purpose: GoalPurpose
  /** `YYYY-MM-DD`（`<input type="date">` 的格式），空串 = 没有截止日期。 */
  deadline: string
  context: string
  /** 系统从这句话里真的读到了东西吗（没读到也照样让人设，只是要说明）。 */
  heard: boolean
  /** 连读都没读成（模型不可用）。与"没读到"是两件事。 */
  readFailed: boolean
}

/**
 * 学习目标 —— 简报里的那一块，也是这个空间方向的**正式落点**。
 *
 * 一件刻意不做的事：**没有进度条、没有达成概率。** 对"考到 117 分"这种只有学习者
 * 能看到结果的目标，系统没有足够证据说"完成了多少"—— 编一个数字比不说更糟。
 * 这里会说的永远是：目标是什么、还有多久、系统在推还是先别推。
 *
 * 它自己取数（和知识结构块一样）：目标同时带文本、截止日期、状态与"为了什么"，
 * 简报里那一格字符串装不下，两处各读一次一定会有一段时间互相打架。
 */
export function GoalBlock({ projectId }: { projectId: string }) {
  const { goal, isPending, isError, refetch, isFetching } =
    useActiveGoalQuery(projectId)
  const confirm = useConfirmNewGoalMutation(projectId)
  const update = useUpdateGoalMutation(projectId)
  const setStatus = useSetGoalStatusMutation(projectId)
  const close = useCloseGoalMutation(projectId)

  return (
    <GoalBlockView
      goal={goal}
      isPending={isPending}
      isError={isError}
      isRetrying={isFetching}
      onRetry={() => void refetch()}
      onSuggest={(message) => suggestGoal(projectId, message)}
      onConfirm={(input) => confirm.mutateAsync(input)}
      confirmError={confirm.error}
      isConfirming={confirm.isPending}
      onUpdate={(input) =>
        update.mutate({ goalId: goal?.id ?? '', ...input })
      }
      onSetStatus={(action) => setStatus.mutate({ goalId: goal?.id ?? '', action })}
      onClose={(reason) => close.mutate({ goalId: goal?.id ?? '', reason })}
    />
  )
}

export interface GoalBlockViewProps {
  /** `undefined` = 读不到 / 没启用；`null` = 确实还没有目标。两者必须分得开。 */
  goal: SpaceGoal | null | undefined
  isPending?: boolean
  isError?: boolean
  isRetrying?: boolean
  onRetry?: () => void
  /** 读一句话看里面有没有目标。`undefined` = 这一步不可用（预览/后端未接）。 */
  onSuggest?: (message: string) => Promise<GoalSuggestion>
  onConfirm: (input: GoalDraftInput) => Promise<unknown>
  confirmError?: unknown
  isConfirming?: boolean
  onUpdate: (input: {
    targetText?: string
    deadlineAt?: string | null
    context?: string | null
    purpose?: GoalPurpose
  }) => void
  onSetStatus: (action: 'pause' | 'resume') => void
  onClose: (reason: GoalCloseReason) => void
}

/**
 * 目标这一块的**无数据版本** —— 数据由上面的 `GoalBlock` 取，交互由这里管。
 *
 * 分成两层是为了让它能被离屏渲染：`/preview/goal` 与离屏断言需要看到"空态 /
 * 回述卡 / 正在推的目标"这三屏到底长什么样，而那三屏不该要求一个登录态和后端。
 */
export function GoalBlockView({
  goal,
  isPending,
  isError,
  isRetrying,
  onRetry,
  onSuggest,
  onConfirm,
  confirmError,
  isConfirming,
  onUpdate,
  onSetStatus,
  onClose,
}: GoalBlockViewProps) {
  // 回述卡：从"我想…"到"确认"之间的那一屏。它不是库里的 `draft` —— 库里那条
  // 只在确认的那一次点击里存在（建立 + 确认是同一次交互）。
  const [draft, setDraft] = useState<LocalGoalDraft | null>(null)

  return (
    <section className="mt-4">
      <h3 className="text-[11px] font-medium tracking-wide text-zinc-400 uppercase">
        学习目标
      </h3>
      <div className="mt-2">
        {isPending ? (
          <div className="h-12 animate-pulse rounded-xl bg-muted" />
        ) : isError ? (
          <div className="rounded-xl border border-dashed border-amber-300 px-3 py-3">
            <p className="text-[13px] leading-5 text-zinc-600">
              读不到目标（后端没有回应）。
            </p>
            <button
              type="button"
              onClick={onRetry}
              disabled={isRetrying}
              className="mt-2 text-xs text-foreground underline-offset-2 hover:underline disabled:opacity-60"
            >
              重试
            </button>
          </div>
        ) : draft ? (
          <GoalRestatement
            draft={draft}
            onChange={setDraft}
            onCancel={() => setDraft(null)}
            onConfirm={onConfirm}
            confirmError={confirmError}
            isConfirming={isConfirming}
            onConfirmed={() => setDraft(null)}
          />
        ) : goal ? (
          <GoalCard
            goal={goal}
            onUpdate={onUpdate}
            onSetStatus={onSetStatus}
            onClose={onClose}
          />
        ) : (
          <GoalComposer onDraft={setDraft} onSuggest={onSuggest} />
        )}
      </div>
    </section>
  )
}

/**
 * 空态：一句话就说清"这里要什么"。
 *
 * 只有一个输入框、一个按钮 —— 学习者写一句人话，剩下的（截止日期、为了什么、
 * 场景）交给抽取，然后**回述一次让他确认**。没有"先建草稿再确认"的两步点击：
 * 他点的那一次就是确认。
 */
function GoalComposer({
  onDraft,
  onSuggest,
}: {
  onDraft: (draft: LocalGoalDraft) => void
  onSuggest?: (message: string) => Promise<GoalSuggestion>
}) {
  const [text, setText] = useState('')
  const [isReading, setReading] = useState(false)

  const read = async () => {
    const message = text.trim()
    if (!message || isReading) return

    // 抽取这一步是**可选**的：它只是帮我们把截止日期/为了什么填好。它不在时
    // （预览、或这个功能没上线），写下来的那句话照样能当目标用。
    if (!onSuggest) {
      onDraft({
        targetText: message,
        purpose: 'other',
        deadline: '',
        context: '',
        heard: false,
        readFailed: false,
      })
      return
    }

    setReading(true)
    try {
      const suggestion = await onSuggest(message)
      onDraft({
        targetText: suggestion.heard
          ? (suggestion.targetText ?? '').trim() || message
          : message,
        purpose: suggestion.purpose ?? 'other',
        deadline: (suggestion.deadlineAt ?? '').slice(0, 10),
        context: (suggestion.context ?? '').trim(),
        heard: suggestion.heard,
        readFailed: false,
      })
    } catch {
      // 读不出来不是"你这句话里没有目标"—— 两件事必须分开说。这里退回到
      // "就用你写的这一句当目标"，并让回述卡把原因写清楚。
      onDraft({
        targetText: message,
        purpose: 'other',
        deadline: '',
        context: '',
        heard: false,
        readFailed: true,
      })
    } finally {
      setReading(false)
    }
  }

  return (
    <div className="rounded-xl border border-dashed border-zinc-300 px-3 py-2.5">
      <p className="text-[13px] leading-5 text-zinc-500">
        还没有设置学习目标。用一句话说：你在这个空间想达到什么？
      </p>
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={2}
        aria-label="目标"
        placeholder="例如：两个月后 TOEFL 考到 117 分"
        className={cn(FIELD, 'mt-2 resize-none')}
      />
      <div className="mt-2 flex items-center gap-1">
        <button
          type="button"
          onClick={() => void read()}
          disabled={!text.trim() || isReading}
          className={PRIMARY}
        >
          {isReading ? '正在读…' : '读一遍，让我确认'}
        </button>
      </div>
    </div>
  )
}

/**
 * 回述卡 —— 确认之前唯一要读的东西。
 *
 * 那句回述是**用字段拼出来的**（`restateGoal`），不是让模型写一段：这段文字是给人
 * 改的，改完还得再解析一次，两边的说法迟早对不上；字段才是会被存下来的东西。
 *
 * 导出是为了评审页能把这一屏单独摆出来看（它是用户拍板的那一屏）。
 */
export function GoalRestatement({
  draft,
  onChange,
  onCancel,
  onConfirm,
  confirmError,
  isConfirming,
  onConfirmed,
}: {
  draft: LocalGoalDraft
  onChange: (draft: LocalGoalDraft) => void
  onCancel: () => void
  onConfirm: (input: GoalDraftInput) => Promise<unknown>
  confirmError?: unknown
  isConfirming?: boolean
  onConfirmed: () => void
}) {
  const note = draft.readFailed
    ? '我这次没能读这句话（模型不可用）。你可以直接把它当目标，也可以改一改。'
    : draft.heard
      ? '这是我从你这句话里读到的。不对就改。'
      : '这句话里我没读出具体的目标。你可以直接把它当目标，或者改一改。'

  return (
    <div className="rounded-xl bg-zinc-50 px-3 py-2.5">
      <p className="text-[13px] leading-5 text-zinc-900">{restateGoal(draft)}</p>
      <p className="mt-1 text-[11px] leading-4 text-zinc-400">{note}</p>

      <div className="mt-2.5 space-y-2">
        <textarea
          value={draft.targetText}
          onChange={(event) =>
            onChange({ ...draft, targetText: event.target.value })
          }
          rows={2}
          aria-label="目标"
          className={cn(FIELD, 'resize-none')}
        />
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={draft.deadline}
            aria-label="截止日期"
            onChange={(event) =>
              onChange({ ...draft, deadline: event.target.value })
            }
            className={cn(FIELD, 'w-auto flex-1')}
          />
          <input
            value={draft.context}
            placeholder="场景（如 TOEFL）"
            aria-label="场景"
            onChange={(event) =>
              onChange({ ...draft, context: event.target.value })
            }
            className={cn(FIELD, 'flex-1')}
          />
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[11px] text-zinc-400">为了</span>
          {(Object.keys(PURPOSE_LABELS) as GoalPurpose[]).map((purpose) => (
            <button
              key={purpose}
              type="button"
              onClick={() => onChange({ ...draft, purpose })}
              className={cn(
                'rounded-full px-2 py-0.5 text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-foreground/10',
                draft.purpose === purpose
                  ? 'bg-foreground text-background'
                  : 'border border-zinc-200 text-zinc-600 hover:bg-zinc-100'
              )}
            >
              {PURPOSE_LABELS[purpose]}
            </button>
          ))}
        </div>
      </div>

      {confirmError ? (
        <p className="mt-2 text-[11px] leading-4 text-amber-700">
          {describeWriteError(confirmError)}
        </p>
      ) : null}

      <div className="mt-2.5 flex items-center gap-1">
        <button
          type="button"
          onClick={() => {
            void onConfirm({
              targetText: draft.targetText.trim(),
              purpose: draft.purpose,
              deadlineAt: draft.deadline
                ? new Date(`${draft.deadline}T00:00:00`).toISOString()
                : null,
              context: draft.context.trim() || null,
              // 面板里填的走 `user_entered`（有人在界面上写的）。`user_stated`
              // 留给"从对话里听出来的"那条路 —— 它今天还没接。
              origin: 'user_entered',
            }).then(onConfirmed, () => undefined)
          }}
          disabled={!draft.targetText.trim() || isConfirming}
          className={PRIMARY}
        >
          {isConfirming ? '正在记…' : '对，就是这个'}
        </button>
        <button type="button" onClick={onCancel} className={QUIET}>
          重来
        </button>
      </div>
    </div>
  )
}

/** 已经在推进的目标：一句话说清"是什么 / 还有多久 / 为了什么"，外加三个动作。 */
function GoalCard({
  goal,
  onUpdate,
  onSetStatus,
  onClose,
}: {
  goal: SpaceGoal
  onUpdate: GoalBlockViewProps['onUpdate']
  onSetStatus: (action: 'pause' | 'resume') => void
  onClose: (reason: GoalCloseReason) => void
}) {
  const [isEditing, setEditing] = useState(false)
  const [text, setText] = useState(goal.targetText)

  const deadline = describeDeadline(goal.deadlineAt)
  const exactDate = formatDeadline(goal.deadlineAt)
  const paused = goal.status === 'paused'

  if (isEditing) {
    return (
      <div className="rounded-xl bg-zinc-50 px-3 py-2.5">
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={2}
          aria-label="目标"
          className={cn(FIELD, 'resize-none')}
        />
        <div className="mt-2 flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              onUpdate({ targetText: text.trim() })
              setEditing(false)
            }}
            disabled={!text.trim()}
            className={PRIMARY}
          >
            保存
          </button>
          <button
            type="button"
            onClick={() => {
              setText(goal.targetText)
              setEditing(false)
            }}
            className={QUIET}
          >
            取消
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-zinc-50 px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <p
          className={cn(
            'min-w-0 flex-1 text-[13px] leading-5',
            paused ? 'text-zinc-500' : 'text-zinc-900'
          )}
        >
          {goal.targetText}
        </p>
        <div className="flex shrink-0 items-center">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className={QUIET}
            aria-label="修改目标"
            title="修改目标"
          >
            <RotateCw className="size-3" />
          </button>
          <ActionMenu
            align="end"
            width="sm"
            trigger={
              <button
                type="button"
                className={QUIET}
                aria-label="结束这个目标"
                title="结束这个目标"
              >
                <X className="size-3" />
              </button>
            }
          >
            {USER_CLOSE_OPTIONS.map((option) => (
              <ActionMenuItem
                key={option.reason}
                label={option.label}
                onSelect={() => onClose(option.reason)}
              />
            ))}
          </ActionMenu>
        </div>
      </div>

      {paused ? (
        <p className="mt-1 text-[11px] leading-4 text-zinc-400">
          已暂停 —— 系统不会主动推它。下面可以接着推。
        </p>
      ) : null}

      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] leading-4 text-zinc-400">
        {deadline && (
          <span title={exactDate ?? undefined} className="tabular-nums">
            {deadline}
          </span>
        )}
        {goal.context && <span>{goal.context}</span>}
        <span>为了{PURPOSE_LABELS[goal.purpose]}</span>
      </div>

      {/* 结果只有学习者能看到的目标，系统不替它宣布达成 —— 说出来，别藏着。 */}
      {goal.outcomeKind === 'externally_reported' && (
        <p className="mt-1 text-[11px] leading-4 text-zinc-400">
          结果只有你自己看得到；系统不会替你判断有没有达成。
        </p>
      )}

      <div className="mt-2 flex items-center gap-1">
        <button
          type="button"
          onClick={() => onSetStatus(paused ? 'resume' : 'pause')}
          className={QUIET}
        >
          {paused ? <Play className="size-3" /> : <Pause className="size-3" />}
          {paused ? '继续推' : '先别推'}
        </button>
        {!paused && goal.confirmedAt && (
          <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-emerald-600">
            <Check className="size-3" strokeWidth={3} />
            你确认过
          </span>
        )}
      </div>
    </div>
  )
}

/** 把后端的拒绝说成人话。说不清的时候如实说不知道，不编原因。 */
function describeWriteError(error: unknown): string {
  const response =
    typeof error === 'object' && error !== null && 'response' in error
      ? (
          error as {
            response?: { status?: number; data?: { detail?: string } }
          }
        ).response
      : undefined
  const detail = response?.data?.detail
  if (detail === 'space_already_has_active_goal') {
    return '这个空间已经有一个在推的目标了 —— 先把它结束掉，再开新的。'
  }
  if (detail === 'goal_closed') return '这个目标已经结束了，不能改 —— 可以开一个新的。'
  return '没能记下来，稍后再试。'
}
