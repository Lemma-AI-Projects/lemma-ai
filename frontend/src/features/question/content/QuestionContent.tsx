import { ChevronDown } from 'lucide-react'

import { RichHtml, type RichHtmlAnchor } from '@/components/RichHtml'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { hasRichHtmlAnchor } from '@/lib/richHtml/parse'
import { cn } from '@/lib/utils'
import type { ResponseSlot, SubQuestion } from '@/types/question'
import { SubQuestionReview } from '../views/QuizReviewPanel'
import {
  BlankInput,
  ChoiceBlankChip,
  EssayInput,
  JudgeToggle,
  StaticBlank,
} from './InlineSlots'
import { MediaList } from './MediaList'
import { OptionGroupView } from './OptionGroupView'
import { PoolAssignBlank } from './PoolAssignBlank'
import { domIdOf, useQuestionRender } from './renderModel'

// 后端本应剥离的题号（span.ques-no）若残留则整块移除，避免和契约 label 双显。
const PARSED_DROP_CLASS_NAMES = ['ques-no'] as const

function renderQuestionAnchor({ attribute, id }: RichHtmlAnchor) {
  if (attribute === 'data-slot-id') return <SlotAnchor slotId={id} />
  if (attribute === 'data-og-id') return <OptionGroupView groupId={id} />
  if (attribute === 'data-sq-id') return <SubQuestionAnchor subQuestionId={id} />
  return undefined
}

function QuestionRichHtml({ html, className }: { html: string; className?: string }) {
  return (
    <RichHtml
      html={html}
      renderAnchor={renderQuestionAnchor}
      dropClassNames={PARSED_DROP_CLASS_NAMES}
      className={className}
    />
  )
}

/** 题干里的答题空锚点 → 对应机制的行内控件。 */
function SlotAnchor({ slotId }: { slotId: string }) {
  const model = useQuestionRender()
  const slot = model.slotsById.get(slotId)

  // 锚点在题干里、槽位却不存在：只画空位，不伪造可作答能力。
  if (!slot) {
    if (import.meta.env.DEV) console.warn('[QuestionContent] 题干锚点没有对应槽位：', slotId)
    return <StaticBlank slot={null} />
  }
  if (model.mode === 'preview' && slot.mechanism !== 'essay') {
    return <StaticBlank slot={slot} />
  }

  switch (slot.mechanism) {
    case 'text':
      return <BlankInput slot={slot} />
    case 'judge':
      return <JudgeToggle slot={slot} />
    case 'essay':
      return <EssayInput slot={slot} />
    case 'choice':
      return <ChoiceBlankChip slot={slot} />
    case 'pool-assign':
      return <PoolAssignBlank slot={slot} />
    case 'unsupported':
      return <StaticBlank slot={slot} />
  }
}

/** 没有锚点的槽位，放在所属题干末尾。选择类的控件就是选项组本身，这里不重复画。 */
function LooseSlot({ slot }: { slot: ResponseSlot }) {
  const model = useQuestionRender()
  const label = model.slotLabels.get(slot.id) ?? '作答'

  switch (slot.mechanism) {
    case 'choice':
    case 'pool-assign':
      return null
    case 'essay':
      return <EssayInput slot={slot} />
    case 'unsupported':
      return (
        <p className="mt-4 text-sm text-zinc-400">
          {label}：暂不支持在线作答
        </p>
      )
    case 'text':
    case 'judge':
      return (
        <p className="mt-4 text-[17px] leading-8 text-zinc-900">
          <span className="text-zinc-500">{label}：</span>
          {model.mode === 'preview' ? (
            <StaticBlank slot={slot} />
          ) : slot.mechanism === 'text' ? (
            <BlankInput slot={slot} />
          ) : (
            <JudgeToggle slot={slot} />
          )}
        </p>
      )
  }
}

function SubQuestionBlock({ sub }: { sub: SubQuestion }) {
  const model = useQuestionRender()
  const mainHtml = model.question.stem.html
  const stemHtml = sub.stem?.html ?? ''

  const looseGroups = sub.optionGroups.filter(
    (group) => !hasRichHtmlAnchor(stemHtml, 'data-og-id', group.id)
  )
  // 完形题的空锚点在公共题干里、却归属本小题，两处都要查。
  const looseSlots = sub.slots.filter(
    (slot) =>
      !hasRichHtmlAnchor(stemHtml, 'data-slot-id', slot.id) &&
      !hasRichHtmlAnchor(mainHtml, 'data-slot-id', slot.id)
  )

  return (
    <section
      id={domIdOf(sub.id)}
      aria-label={model.slotLabels.get(sub.slots[0]?.id ?? '') ?? sub.label}
      className="mt-7 scroll-mt-24"
    >
      <div className="flex gap-1 text-[17px] leading-8 text-zinc-900">
        <span className="shrink-0 font-medium">{sub.label}</span>
        <div className="min-w-0 flex-1">
          {stemHtml ? <QuestionRichHtml html={stemHtml} /> : null}
          {looseGroups.map((group) => (
            <OptionGroupView key={group.id} groupId={group.id} />
          ))}
          {looseSlots.map((slot) => (
            <LooseSlot key={slot.id} slot={slot} />
          ))}
          <MediaList media={sub.media} />
          <SubQuestionReview subQuestionId={sub.id} />
        </div>
      </div>
    </section>
  )
}

function SubQuestionAnchor({ subQuestionId }: { subQuestionId: string }) {
  const model = useQuestionRender()
  const sub = model.subsById.get(subQuestionId)
  return sub ? <SubQuestionBlock sub={sub} /> : null
}

function RawQuestionContent() {
  const { question } = useQuestionRender()
  const raw = question.raw

  return (
    <>
      <p role="note" className="mb-5 rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-500">
        本题来自无法拆分结构的来源，仅支持查看，不能在线作答。
      </p>
      {raw ? (
        <RichHtml html={raw.stem.html} className="text-[17px] leading-8 text-zinc-900" />
      ) : (
        <p className="text-sm text-zinc-400">题目内容缺失。</p>
      )}
      {raw && (raw.answer || raw.explanation) ? (
        <Collapsible className="mt-6">
          <CollapsibleTrigger className="group inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900">
            查看答案与解析
            <ChevronDown className="size-4 transition-transform group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white/60 px-4 py-3 text-[15px] leading-7 text-zinc-700">
            {raw.answer ? <RichHtml html={raw.answer.html} /> : null}
            {raw.explanation ? <RichHtml html={raw.explanation.html} /> : null}
          </CollapsibleContent>
        </Collapsible>
      ) : null}
    </>
  )
}

/** 一道题的题面：按原文顺序渲染材料、行内空、选项组与小题。 */
export function QuestionContent({ className }: { className?: string }) {
  const model = useQuestionRender()
  const { question } = model

  if (question.structure === 'raw') {
    return (
      <div className={className}>
        <RawQuestionContent />
      </div>
    )
  }

  const stemHtml = question.stem.html
  const looseGroups = question.optionGroups.filter(
    (group) => !hasRichHtmlAnchor(stemHtml, 'data-og-id', group.id)
  )
  const looseSlots = question.slots.filter(
    (slot) => !hasRichHtmlAnchor(stemHtml, 'data-slot-id', slot.id)
  )
  const looseSubs = question.subQuestions.filter(
    (sub) => !hasRichHtmlAnchor(stemHtml, 'data-sq-id', sub.id)
  )

  return (
    <div className={cn('text-[17px] leading-8 text-zinc-900', className)}>
      <QuestionRichHtml html={stemHtml} />
      {looseGroups.map((group) => (
        <OptionGroupView key={group.id} groupId={group.id} />
      ))}
      {looseSlots.map((slot) => (
        <LooseSlot key={slot.id} slot={slot} />
      ))}
      {looseSubs.map((sub) => (
        <SubQuestionBlock key={sub.id} sub={sub} />
      ))}
      <MediaList media={question.media} />
    </div>
  )
}
