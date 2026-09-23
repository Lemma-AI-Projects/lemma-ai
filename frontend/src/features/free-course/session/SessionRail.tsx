/**
 * The right-hand conversation: what the teacher just said, the question it is
 * waiting on, and every way out of it.
 *
 * Layout follows what the reference session actually offers, and refuses what
 * it does not:
 *
 * - there is always a way to **interrupt** (a Stop control plus a composer),
 *   because "speak to ask or interrupt" is a first-class interaction there;
 * - there is a one-click **"I don't understand"**, because that is the signal
 *   that genuinely changes the teaching and it must not be hidden behind
 *   phrasing the learner has to guess;
 * - there is **no skip, no next, no jump**. The observed product has none, and
 *   the only ways forward are answering or asking. Progress is not the learner's
 *   control here — it is the lesson's.
 */

import {
  Lightbulb,
  MousePointerClick,
  SendHorizontal,
  Square,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import { CONFUSED_PROMPT } from './confusion'
import type { SaidLine } from './useTeachingPlayback'
import type { TeachingQuestion } from './types'

export interface RailFeedback {
  verdict?: string | null
  text: string
}

const VERDICT_STYLE: Record<string, string> = {
  correct: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  partial: 'border-amber-200 bg-amber-50 text-amber-900',
  incorrect: 'border-rose-200 bg-rose-50 text-rose-900',
}

const VERDICT_LABEL: Record<string, string> = {
  correct: '答对了',
  partial: '答对一半',
  incorrect: '这次没对',
}

export function SessionRail({
  said,
  question,
  awaiting,
  awaitingClick,
  clickHint,
  thinking,
  muted,
  voiceAvailable,
  feedbacks,
  answered,
  error,
  onSetMuted,
  onAnswerChoice,
  onAnswerText,
  onConfused,
  onAsk,
  onStop,
}: {
  said: SaidLine[]
  question: TeachingQuestion | null
  awaiting: boolean
  /** 时间线停在白板上的某个元素上，等学习者去点它。 */
  awaitingClick: boolean
  /** 等的时候屏幕上要说的话（来自动作本身，或一个默认提示）。 */
  clickHint: string | null
  thinking: boolean
  muted: boolean
  voiceAvailable: boolean
  feedbacks: RailFeedback[]
  /** True once this stopping point has been answered — the question is done. */
  answered: boolean
  error: string | null
  onSetMuted: (muted: boolean) => void
  onAnswerChoice: (optionId: string) => void
  onAnswerText: (text: string) => void
  onConfused: () => void
  onAsk: (text: string) => void
  onStop: () => void
}) {
  const [draft, setDraft] = useState('')
  // The chosen option is stored WITH the prompt it belongs to, so a new question
  // simply does not match it. Resetting it from an effect would be a second
  // render for something that is already derivable.
  const [choice, setChoice] = useState<{ prompt: string; id: string } | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = scrollRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [said.length, feedbacks.length, awaiting, thinking])

  const isChoice = question?.kind === 'choice' && question.options.length > 0
  const chosenId = choice && question && choice.prompt === question.prompt ? choice.id : null
  const canSubmit = !thinking && draft.trim().length > 0

  return (
    <aside
      className="flex min-h-0 w-[22rem] shrink-0 flex-col border-l border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-950"
      data-session-rail
    >
      <header className="flex items-center gap-2 border-b border-zinc-200/80 px-4 py-2.5 dark:border-zinc-800">
        <span className="text-[13px] font-medium text-zinc-700 dark:text-zinc-200">
          教学对话
        </span>
        <div className="ml-auto flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              'h-7 gap-1.5 rounded-full px-2 text-[12px] font-normal text-zinc-500',
              !voiceAvailable && 'invisible'
            )}
            onClick={() => onSetMuted(!muted)}
            aria-pressed={muted}
            title={muted ? '取消静音' : '静音'}
          >
            {muted ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
            {muted ? '已静音' : '语音'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 rounded-full px-2 text-[12px] font-normal text-zinc-500"
            onClick={onStop}
            title="停止当前讲解，然后提问"
          >
            <Square className="size-3.5" />
            Stop
          </Button>
        </div>
      </header>

      <div
        ref={scrollRef}
        className="scrollbar-fade min-h-0 flex-1 overflow-y-auto px-4 py-3"
      >
        <div className="flex flex-col gap-2">
          {said.map((line, index) => (
            <p
              key={`${line.stepId}-${index}`}
              className="text-[12.5px] leading-5 text-zinc-500 dark:text-zinc-400"
            >
              {line.text}
            </p>
          ))}

          {feedbacks.map((feedback, index) => (
            <div
              key={`feedback-${index}`}
              className={cn(
                'rounded-lg border px-3 py-2 text-[12.5px] leading-5',
                VERDICT_STYLE[feedback.verdict ?? ''] ??
                  'border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200'
              )}
            >
              {feedback.verdict && (
                <p className="mb-1 text-[11px] font-medium tracking-wide uppercase opacity-70">
                  {VERDICT_LABEL[feedback.verdict] ?? feedback.verdict}
                </p>
              )}
              {feedback.text}
            </div>
          ))}

          {thinking && (
            <p className="flex items-center gap-2 text-[12.5px] text-zinc-400">
              <Spinner className="size-3.5" />
              正在准备下一段…
            </p>
          )}
        </div>
      </div>

      {error && (
        <p className="border-t border-rose-200 bg-rose-50 px-4 py-2 text-[12px] leading-4 text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300">
          {error}
        </p>
      )}

      <div className="border-t border-zinc-200/80 px-4 py-3 dark:border-zinc-800">
        {/* 等点击：提示学习者在白板上动手，而不是在对话框里打字。打断提问的口子
            依然开着 —— 原文里"随时可以打断"和"停在这里等你点"是同时成立的。 */}
        {awaitingClick && (
          <div
            className="mb-2 flex items-start gap-2 rounded-lg border border-[#ceddec] bg-[#edf4ff] px-3 py-2 text-[12.5px] leading-5 text-[#4c6694]"
            data-session-awaiting-click
          >
            <MousePointerClick className="mt-0.5 size-3.5 shrink-0" />
            <span>{clickHint || '点一下白板上高亮的那个元素。'}</span>
          </div>
        )}

        {awaiting && question && !answered ? (
          <div className="flex flex-col gap-2">
            <p className="text-[12px] font-medium text-zinc-900 dark:text-zinc-100">
              {question.prompt}
            </p>
            {isChoice ? (
              <div className="flex flex-col gap-1.5">
                {question.options.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    disabled={thinking}
                    onClick={() => {
                      if (question) setChoice({ prompt: question.prompt, id: option.id })
                      onAnswerChoice(option.id)
                    }}
                    className={cn(
                      'rounded-lg border px-3 py-2 text-left text-[12.5px] leading-5 transition-colors disabled:opacity-60',
                      chosenId === option.id
                        ? 'border-[#4c6694] bg-[#edf4ff] text-[#4c6694]'
                        : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900'
                    )}
                  >
                    <span className="mr-1.5 text-zinc-400">{option.id}.</span>
                    {option.text}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="用你自己的话说说看…"
                  rows={3}
                  className="text-[13px]"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                      event.preventDefault()
                      if (draft.trim()) onAnswerText(draft.trim())
                    }
                  }}
                />
                <Button
                  type="button"
                  disabled={!canSubmit}
                  className="h-8 rounded-full px-3 text-[13px]"
                  onClick={() => onAnswerText(draft.trim())}
                >
                  提交回答
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="有问题随时打断…"
              rows={2}
              className="text-[13px]"
            />
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={thinking}
                className="h-8 flex-1 gap-1.5 rounded-full px-3 text-[12.5px] font-normal"
                onClick={onConfused}
                title={CONFUSED_PROMPT}
              >
                <Lightbulb className="size-3.5" />
                我没懂，换个讲法
              </Button>
              <Button
                type="button"
                disabled={!canSubmit}
                className="h-8 shrink-0 gap-1.5 rounded-full px-3 text-[12.5px]"
                onClick={() => {
                  const text = draft.trim()
                  if (text) onAsk(text)
                  setDraft('')
                }}
              >
                <SendHorizontal className="size-3.5" />
                问
              </Button>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
