import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'

import { ContentPageLayout } from '@/components/ContentPageLayout'
import { cn } from '@/lib/utils'
import type { AttemptResult, QuestionSetView, QuestionView } from '@/types/question'
import { questionSlots } from '../attempt/responses'
import { questionSetKindTitle } from './labels'

function questionStatus(question: QuestionView, result: AttemptResult | undefined) {
  if (!result) return { text: '未提交', tone: 'muted' as const }
  if (question.structure === 'raw') return { text: '仅供查看', tone: 'muted' as const }

  const slots = questionSlots(question)
  const hasEssay = slots.some((slot) => slot.mechanism === 'essay')
  if (result.status === 'ungradable' || !result.score) {
    // 没有可判分的空：可能全是主观题，也可能是参考答案缺失或对不上。
    return slots.length > 0 && slots.every((slot) => slot.mechanism === 'essay')
      ? { text: '主观题 · 仅参考答案', tone: 'muted' as const }
      : { text: '不评阅', tone: 'muted' as const }
  }
  const { earned, total } = result.score
  return {
    text: `客观题 ${earned}/${total}${hasEssay ? ' · 含主观题' : ''}`,
    tone: earned === total ? ('good' as const) : ('bad' as const),
  }
}

/** 结果页由判分结果聚合；只统计客观题（grading = auto），主观题不计分。 */
export function QuizResultView({
  set,
  results,
  onReview,
  nextHref,
  nextLabel,
  footerStart,
}: {
  set: QuestionSetView
  results: ReadonlyMap<string, AttemptResult>
  onReview: (index: number) => void
  nextHref?: string
  nextLabel?: string
  footerStart?: ReactNode
}) {
  let earned = 0
  let total = 0
  for (const result of results.values()) {
    if (!result.score) continue
    earned += result.score.earned
    total += result.score.total
  }
  const submitted = set.questions.filter((question) => results.has(question.id)).length
  const accuracy = total > 0 ? Math.round((earned / total) * 100) : null

  return (
    <ContentPageLayout
      title={`${questionSetKindTitle[set.kind]}结果`}
      titleAlign="center"
      contentClassName="max-w-[560px]"
      nextHref={nextHref}
      nextLabel={nextLabel}
      footerStart={footerStart}
    >
      <section className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-xl border border-zinc-200 bg-white/60 px-3 py-4">
          <div className="text-2xl font-semibold text-zinc-950">
            {total > 0 ? `${earned}/${total}` : '—'}
          </div>
          <div className="mt-1 text-xs text-zinc-500">客观题得分</div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white/60 px-3 py-4">
          <div className="text-2xl font-semibold text-zinc-950">
            {accuracy === null ? '—' : `${accuracy}%`}
          </div>
          <div className="mt-1 text-xs text-zinc-500">正确率</div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white/60 px-3 py-4">
          <div className="text-2xl font-semibold text-zinc-950">
            {submitted}/{set.questions.length}
          </div>
          <div className="mt-1 text-xs text-zinc-500">已提交</div>
        </div>
      </section>
      <p className="mt-3 text-xs text-zinc-500">
        得分与正确率只统计可自动判分的客观题；主观题只提供参考答案，不计分。
      </p>

      <h2 className="mt-8 text-[15px] font-semibold text-zinc-950">逐题回看</h2>
      <ul className="mt-3 divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white/60">
        {set.questions.map((question, index) => {
          const result = results.get(question.id)
          const status = questionStatus(question, result)
          return (
            <li key={question.id}>
              <button
                type="button"
                onClick={() => onReview(index)}
                disabled={!result}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors enabled:hover:bg-zinc-100/70 disabled:cursor-default"
              >
                <span className="text-zinc-900">
                  {index + 1}. {question.meta.typeName ?? '题目'}
                </span>
                <span
                  className={cn(
                    'ml-auto text-xs',
                    status.tone === 'good' && 'text-emerald-700',
                    status.tone === 'bad' && 'text-red-600',
                    status.tone === 'muted' && 'text-zinc-500'
                  )}
                >
                  {status.text}
                </span>
                {result ? <ChevronRight className="size-4 text-zinc-400" /> : <span className="size-4" />}
              </button>
            </li>
          )
        })}
      </ul>
    </ContentPageLayout>
  )
}
