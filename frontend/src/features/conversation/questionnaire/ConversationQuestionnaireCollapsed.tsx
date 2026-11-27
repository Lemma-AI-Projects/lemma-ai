import { ChevronRight } from 'lucide-react'

import {
  countAnsweredQuestions,
  type QuestionnaireDraft,
  type QuestionnaireQuestion,
} from './questionnaire'

// 问卷收起之后留在消息流里的一行：停在第几题、那道题的题干，点一下回到问卷。
// 收起只是把输入框让出来（比如先问点别的），已经答的题和停在的位置都还在。
export function ConversationQuestionnaireCollapsed({
  draft,
  index,
  onRestore,
  questions,
}: {
  draft: QuestionnaireDraft
  index: number
  onRestore: () => void
  questions: QuestionnaireQuestion[]
}) {
  const started = countAnsweredQuestions(questions, draft) > 0

  return (
    <button
      type="button"
      onClick={onRestore}
      className="group flex w-full items-center gap-3 rounded-2xl border border-zinc-200/80 px-4 py-2.5 text-left outline-none transition-colors hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-zinc-300"
    >
      <span className="shrink-0 text-[13px] leading-6 text-zinc-500 tabular-nums">
        {index + 1} / {questions.length}
      </span>
      <span className="min-w-0 flex-1 truncate text-[15px] leading-6 text-zinc-900">
        {questions[index].title}
      </span>
      <span className="flex shrink-0 items-center gap-0.5 text-[14px] leading-6 text-zinc-500 transition-colors group-hover:text-zinc-950">
        {started ? '继续回答' : '开始回答'}
        <ChevronRight className="size-4" />
      </span>
    </button>
  )
}
