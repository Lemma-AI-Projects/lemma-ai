import { useEffect, useMemo, useRef, useState } from 'react'

import { ConversationLayout } from '@/features/conversation/ConversationLayout'
import { ConversationMessageList } from '@/features/conversation/ConversationMessageList'
import { ConversationMoreMenu } from '@/features/conversation/ConversationMoreMenu'
import {
  ConversationToolShell,
  type QuestionnaireAnswers,
} from '@/features/conversation/ConversationToolShell'
import {
  createConversationTurns,
  type ConversationSourceMessage,
} from '@/features/conversation/createConversationTurns'
import {
  chatSandboxMessages,
  chatSandboxQuestionnaire,
} from '@/mock/chatSandboxMessages'

export function ChatSandboxPage() {
  const [draft, setDraft] = useState('')
  const [followUpMessages, setFollowUpMessages] = useState<
    ConversationSourceMessage[]
  >([])
  const [answers, setAnswers] = useState<QuestionnaireAnswers>({})
  const scrollRef = useRef<HTMLDivElement>(null)

  const initialTurns = useMemo(
    () => createConversationTurns('chat-sandbox', chatSandboxMessages),
    []
  )
  const followUpTurns = useMemo(
    () => createConversationTurns('chat-sandbox-followup', followUpMessages),
    [followUpMessages]
  )

  useEffect(() => {
    if (followUpMessages.length === 0) return
    const scroller = scrollRef.current
    scroller?.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' })
  }, [followUpMessages.length])

  const handleSend = (text: string) => {
    const date = new Date().toISOString()
    setFollowUpMessages((current) => [
      ...current,
      { role: 'user', message: text, date },
    ])
  }

  const handleAnswerChange = (questionId: string, option: string) => {
    setAnswers((current) => ({
      ...current,
      [questionId]: current[questionId] === option ? null : option,
    }))
  }

  return (
    <ConversationLayout
      scrollRef={scrollRef}
      input={{
        value: draft,
        onValueChange: setDraft,
        isStreaming: false,
        onSend: handleSend,
        onStop: () => undefined,
      }}
      moreMenu={<ConversationMoreMenu projects={[]} onDeleted={() => undefined} />}
    >
      <div className="flex flex-col gap-8 py-6">
        <ConversationMessageList turns={initialTurns} className="py-0" />
        <ConversationToolShell
          title="二分查找练习定制"
          stage="questionnaire"
          size="full"
          questions={chatSandboxQuestionnaire}
          answers={answers}
          onAnswerChange={handleAnswerChange}
          onSubmitAnswers={() => undefined}
        />
        <ConversationMessageList turns={followUpTurns} className="py-0" />
      </div>
    </ConversationLayout>
  )
}
