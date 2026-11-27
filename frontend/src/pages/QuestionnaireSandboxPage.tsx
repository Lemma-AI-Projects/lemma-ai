import { useEffect, useMemo, useRef, useState } from 'react'
import { RotateCcw } from 'lucide-react'

import { SandboxVariantSwitch } from '@/components/SandboxVariantSwitch'
import { ConversationLayout } from '@/features/conversation/ConversationLayout'
import { ConversationMessageList } from '@/features/conversation/ConversationMessageList'
import { ConversationMoreMenu } from '@/features/conversation/ConversationMoreMenu'
import { ConversationTurn } from '@/features/conversation/ConversationTurn'
import {
  createConversationTurns,
  type ConversationSourceMessage,
} from '@/features/conversation/createConversationTurns'
import { ConversationQuestionnaireCollapsed } from '@/features/conversation/questionnaire/ConversationQuestionnaireCollapsed'
import { ConversationQuestionnaireDock } from '@/features/conversation/questionnaire/ConversationQuestionnaireDock'
import { ConversationQuestionnaireReceipt } from '@/features/conversation/questionnaire/ConversationQuestionnaireReceipt'
import {
  type QuestionnaireDraft,
  type QuestionnaireQuestion,
} from '@/features/conversation/questionnaire/questionnaire'
import { useQuestionnaire } from '@/features/conversation/questionnaire/useQuestionnaire'
import { useStickToBottom } from '@/features/conversation/useStickToBottom'
import {
  questionnaireSandboxMessages,
  questionnaireSandboxReply,
  questionnaireSandboxSamples,
  type QuestionnaireSampleId,
} from '@/mock/questionnaireSandbox'

const SAMPLE_OPTIONS: { value: QuestionnaireSampleId; label: string }[] = [
  { value: 'single-last', label: '末题单选' },
  { value: 'multi-last', label: '末题多选' },
]

// 问卷现在处在哪一步：
// - open：展开在输入框上方，输入框里发的文字记成当前这道题的回答；
// - minimized：收起成消息流里的一行，输入框恢复成普通聊天；
// - submitted：已经提交，消息流里多出一条回执。
type QuestionnairePhase = 'open' | 'minimized' | 'submitted'

// 问卷出现之后消息流里新增的内容：普通消息，或一条问卷回执。
type StreamEntry =
  | { id: string; kind: 'message'; message: ConversationSourceMessage }
  | { id: string; kind: 'receipt'; draft: QuestionnaireDraft }

// 一轮完整的演示：一段对话，末尾助手发来一份问卷。换示例或点「重新开始」时整个重来。
function QuestionnaireDemo({ questions }: { questions: QuestionnaireQuestion[] }) {
  const [phase, setPhase] = useState<QuestionnairePhase>('open')
  const [inputText, setInputText] = useState('')
  const [entries, setEntries] = useState<StreamEntry[]>([])
  const questionnaire = useQuestionnaire(questions)
  const scrollRef = useRef<HTMLDivElement>(null)
  const followToBottom = useStickToBottom(scrollRef)
  const replyTimerRef = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(replyTimerRef.current), [])

  const initialTurns = useMemo(
    () => createConversationTurns('questionnaire-sandbox', questionnaireSandboxMessages),
    []
  )
  const entryTurns = useMemo(
    () =>
      entries.map((entry) => ({
        entry,
        turn:
          entry.kind === 'message'
            ? createConversationTurns(entry.id, [entry.message])[0]
            : null,
      })),
    [entries]
  )

  const appendMessage = (role: 'user' | 'assistant', message: string) => {
    followToBottom()
    setEntries((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        kind: 'message',
        message: { role, message, date: new Date().toISOString() },
      },
    ])
  }

  const handleSend = (text: string) => {
    // 问卷展开时，输入框里发来的文字就是当前这道题的回答；其余时候是普通聊天。
    if (phase === 'open') {
      questionnaire.answer(text)
    } else {
      appendMessage('user', text)
    }
  }

  const handleSubmit = () => {
    followToBottom()
    setPhase('submitted')
    setEntries((current) => [
      ...current,
      { id: crypto.randomUUID(), kind: 'receipt', draft: questionnaire.draft },
    ])
    // 没有后端，隔一小会儿补一句固定的回应，演示回执之后对话照常继续。
    replyTimerRef.current = window.setTimeout(
      () => appendMessage('assistant', questionnaireSandboxReply),
      700
    )
  }

  return (
    <ConversationLayout
      scrollRef={scrollRef}
      input={{
        value: inputText,
        onValueChange: setInputText,
        isStreaming: false,
        onSend: handleSend,
        onStop: () => undefined,
        placeholder:
          phase === 'open' ? '没有合适的选项？在这里写下你的回答' : undefined,
      }}
      inputDock={
        phase === 'open' ? (
          <ConversationQuestionnaireDock
            questions={questions}
            index={questionnaire.index}
            draft={questionnaire.draft}
            onIndexChange={questionnaire.goTo}
            onAnswer={questionnaire.answer}
            onMinimize={() => {
              followToBottom()
              setPhase('minimized')
            }}
            onSubmit={handleSubmit}
          />
        ) : null
      }
      moreMenu={<ConversationMoreMenu projects={[]} onDeleted={() => undefined} />}
    >
      <div className="flex flex-col gap-8 py-6">
        <ConversationMessageList turns={initialTurns} className="py-0" />
        {phase === 'minimized' && (
          // 往上收 16px，贴近助手发问卷的那条消息：这一行是那条消息带出来的，不是新的一轮。
          <div className="-mt-4">
            <ConversationQuestionnaireCollapsed
              questions={questions}
              index={questionnaire.index}
              draft={questionnaire.draft}
              onRestore={() => {
                followToBottom()
                setPhase('open')
              }}
            />
          </div>
        )}
        {entryTurns.map(({ entry, turn }) =>
          entry.kind === 'receipt' ? (
            <ConversationQuestionnaireReceipt
              key={entry.id}
              questions={questions}
              draft={entry.draft}
            />
          ) : (
            turn && <ConversationTurn key={entry.id} turn={turn} />
          )
        )}
      </div>
    </ConversationLayout>
  )
}

// [sandbox] 问卷调试页：一段示例对话，末尾助手发来一份问卷，用来看新的问卷交互。
// 问卷贴在输入框上方、一次一题，作答、收起、提交都在对话里完成。不发任何请求。
export function QuestionnaireSandboxPage() {
  const [sample, setSample] = useState<QuestionnaireSampleId>('single-last')
  // 每点一次「重新开始」加一，用来让演示整个重来。
  const [round, setRound] = useState(0)

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 rounded-md border border-zinc-200/80 bg-zinc-50 px-3 py-2">
        <span className="text-xs font-medium text-zinc-400">问卷调试</span>
        <SandboxVariantSwitch
          label="示例问卷"
          options={SAMPLE_OPTIONS}
          value={sample}
          onValueChange={setSample}
        />
        <button
          type="button"
          onClick={() => setRound((current) => current + 1)}
          className="ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs text-zinc-500 transition-colors hover:bg-zinc-200/60 hover:text-zinc-800"
        >
          <RotateCcw className="size-3" />
          重新开始
        </button>
      </div>
      <div className="min-h-0 flex-1">
        <QuestionnaireDemo
          key={`${sample}:${round}`}
          questions={questionnaireSandboxSamples[sample]}
        />
      </div>
    </div>
  )
}
