import { RichHtml } from '@/components/RichHtml'
import { cn } from '@/lib/utils'
import type {
  ExplanationScope,
  ExplanationSegment,
  ReferenceAnswer,
  ResponseSlot,
  SlotVerdict,
} from '@/types/question'
import { formatResponse, hasVisibleContent, optionLabelOf, verdictText } from '../content/format'
import { MediaList } from '../content/MediaList'
import { useQuestionRender } from '../content/renderModel'

function verdictClassName(verdict: SlotVerdict | undefined) {
  if (verdict === 'correct') return 'text-emerald-700'
  if (verdict === 'incorrect' || verdict === 'partial') return 'text-red-600'
  return 'text-zinc-500'
}

function ReferenceAnswerView({ answer }: { answer: ReferenceAnswer | undefined }) {
  const model = useQuestionRender()
  if (!answer) return <span className="text-zinc-400">暂无</span>

  switch (answer.kind) {
    case 'options':
      return <span>{answer.optionIds.map((id) => optionLabelOf(model, id)).join('')}</span>
    case 'exact':
      return <span>{answer.accepted.join(' / ')}</span>
    case 'judge':
      return <span>{answer.value === null ? '未指定' : answer.value ? '√' : '×'}</span>
    case 'rich':
      return <RichHtml html={answer.content.html} className="text-[15px] leading-7" />
    case 'missing':
      return (
        <span className="text-zinc-400">
          {model.review?.answerFallback ? '未能对应到本空，见下方整体答案' : '暂无参考答案'}
        </span>
      )
  }
}

export function ExplanationList({ segments }: { segments: readonly ExplanationSegment[] }) {
  const visible = segments.filter((segment) => hasVisibleContent(segment.content.html))
  if (visible.length === 0) return null
  return (
    <div className="flex flex-col gap-3">
      {visible.map((segment, index) => (
        <section key={`${segment.name}-${index}`}>
          <h4 className="text-sm font-medium text-zinc-900">{segment.name}</h4>
          <RichHtml html={segment.content.html} className="mt-1 text-[15px] leading-7 text-zinc-700" />
        </section>
      ))}
    </div>
  )
}

function scopeMatches(scope: ExplanationScope, target: ExplanationScope['kind'], id?: string) {
  if (scope.kind !== target) return false
  if (scope.kind === 'sub-question') return scope.subQuestionId === id
  if (scope.kind === 'slot') return scope.slotId === id
  return true
}

/** 按归属取解析段：整题（含归属未知）、某小题、某槽位。 */
function useExplanations(target: ExplanationScope['kind'], id?: string) {
  const model = useQuestionRender()
  const segments = model.review?.explanation ?? []
  if (target === 'question') {
    return segments.filter((segment) => segment.scope.kind === 'question' || segment.scope.kind === 'unknown')
  }
  return segments.filter((segment) => scopeMatches(segment.scope, target, id))
}

function SlotReviewRow({ slot }: { slot: ResponseSlot }) {
  const model = useQuestionRender()
  const result = model.results.get(slot.id)
  const response = formatResponse(model, result?.response)
  const explanations = useExplanations('slot', slot.id)
  const isEssay = slot.mechanism === 'essay'

  return (
    <li className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0">
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium text-zinc-900">{model.slotLabels.get(slot.id)}</span>
        <span className={cn('text-xs', verdictClassName(result?.verdict))}>
          {slot.mechanism === 'unsupported' ? '暂不支持作答' : verdictText(slot, result?.verdict)}
        </span>
      </div>
      {!isEssay && slot.mechanism !== 'unsupported' ? (
        <div className="text-sm text-zinc-600">
          你的答案：<span className={cn(!response && 'text-zinc-400')}>{response ?? '未作答'}</span>
        </div>
      ) : null}
      <div className="flex gap-1 text-sm text-zinc-600">
        <span className="shrink-0">参考答案：</span>
        <div className="min-w-0 flex-1 text-zinc-900">
          <ReferenceAnswerView answer={model.references.get(slot.id)} />
        </div>
      </div>
      {explanations.length > 0 ? (
        <div className="mt-1">
          <ExplanationList segments={explanations} />
        </div>
      ) : null}
    </li>
  )
}

/** 一组槽位的逐空复盘；只在 review 态渲染。 */
export function SlotReviewList({ slots }: { slots: readonly ResponseSlot[] }) {
  const model = useQuestionRender()
  if (model.mode !== 'review' || slots.length === 0) return null
  return (
    <ul className="mt-5 divide-y divide-zinc-200/80 rounded-xl border border-zinc-200 bg-white/60 px-4 py-3">
      {slots.map((slot) => (
        <SlotReviewRow key={slot.id} slot={slot} />
      ))}
    </ul>
  )
}

/** 小题下方：本小题各空的复盘与本小题的解析。 */
export function SubQuestionReview({ subQuestionId }: { subQuestionId: string }) {
  const model = useQuestionRender()
  const explanations = useExplanations('sub-question', subQuestionId)
  const sub = model.subsById.get(subQuestionId)
  if (model.mode !== 'review' || !sub) return null
  return (
    <>
      <SlotReviewList slots={sub.slots} />
      {explanations.length > 0 ? (
        <div className="mt-3">
          <ExplanationList segments={explanations} />
        </div>
      ) : null}
    </>
  )
}

/** 整题尾部：顶层槽位复盘、整题解析、整体参考答案、解题媒体。 */
export function QuestionReviewFooter() {
  const model = useQuestionRender()
  const explanations = useExplanations('question')
  if (model.mode !== 'review') return null

  const { review } = model
  if (!review) {
    return (
      <p className="mt-8 text-sm text-zinc-400">参考答案与解析暂不可见。</p>
    )
  }

  const hasEssay = [...model.slotsById.values()].some((slot) => slot.mechanism === 'essay')

  return (
    <div className="mt-8 flex flex-col gap-5">
      <SlotReviewList slots={model.question.slots} />
      {hasEssay ? (
        <p className="text-xs text-zinc-500">主观题只提供参考答案，不评阅、不计分。</p>
      ) : null}
      {review.answerFallback ? (
        <section className="rounded-xl border border-zinc-200 bg-white/60 px-4 py-3">
          <h4 className="text-sm font-medium text-zinc-900">参考答案（整体）</h4>
          <RichHtml html={review.answerFallback.html} className="mt-1 text-[15px] leading-7 text-zinc-700" />
        </section>
      ) : null}
      {explanations.length > 0 ? (
        <section className="border-t border-zinc-200 pt-5">
          <h3 className="mb-3 text-[15px] font-semibold text-zinc-950">解析</h3>
          <ExplanationList segments={explanations} />
        </section>
      ) : null}
      <MediaList media={review.media} />
    </div>
  )
}
