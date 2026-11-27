import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

import { cn } from '@/lib/utils'
import {
  getQuestionAnswers,
  type QuestionnaireDraft,
  type QuestionnaireQuestion,
} from './questionnaire'

// 回执里的一道题：灰色的题干，下面是用户的回答；没答的题写「未作答」。
// 点题干可以展开，看这道题当时还有哪些选项没选。
function ReceiptItem({
  answers,
  question,
}: {
  answers: string[]
  question: QuestionnaireQuestion
}) {
  const [open, setOpen] = useState(false)
  const otherOptions = question.options.filter((option) => !answers.includes(option))

  return (
    <div>
      {otherOptions.length > 0 ? (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
          className="flex w-full items-start gap-1.5 rounded-sm text-left text-[14px] leading-5 text-zinc-500 outline-none transition-colors hover:text-zinc-800 focus-visible:ring-2 focus-visible:ring-zinc-300"
        >
          <span className="min-w-0 flex-1">{question.title}</span>
          <ChevronDown
            className={cn(
              'mt-[3px] size-3.5 shrink-0 transition-transform duration-200 motion-reduce:transition-none',
              open && 'rotate-180'
            )}
          />
        </button>
      ) : (
        <p className="text-[14px] leading-5 text-zinc-500">{question.title}</p>
      )}

      {answers.length > 0 ? (
        <p className="mt-0.5 text-base leading-7 text-foreground [overflow-wrap:anywhere]">
          {answers.join('、')}
        </p>
      ) : (
        <p className="mt-0.5 text-base leading-7 text-zinc-400">未作答</p>
      )}

      {open && (
        <p className="mt-1 text-[14px] leading-5 text-zinc-500">
          {/* 一项都没选的题，列出来的就是全部选项，不叫「其他」。 */}
          {answers.length > 0 ? '其他选项' : '选项'}：{otherOptions.join('、')}
        </p>
      )}
    </div>
  )
}

// 问卷提交之后的回执：一条用户消息，逐题列出题干和回答。
// 没答的题也照样列出来，单看这一条就知道整份问卷交了什么、漏了什么。
export function ConversationQuestionnaireReceipt({
  draft,
  questions,
}: {
  draft: QuestionnaireDraft
  questions: QuestionnaireQuestion[]
}) {
  return (
    <div className="flex w-full justify-end">
      <div className="flex max-w-[70%] min-w-0 flex-col gap-3 rounded-[18px] bg-zinc-100 px-4 py-3">
        {questions.map((question) => (
          <ReceiptItem
            key={question.id}
            question={question}
            answers={getQuestionAnswers(draft, question)}
          />
        ))}
      </div>
    </div>
  )
}
