import { useState } from 'react'

import {
  applyAnswer,
  type QuestionnaireDraft,
  type QuestionnaireQuestion,
} from './questionnaire'

// 一份问卷的作答过程：现在停在第几题，以及每道题记下了什么。
// 状态放在页面这一层，而不是问卷面板里：收起问卷时面板会卸载，草稿和题号要留着；
// 聊天输入框里发来的文字，也要能记成当前这道题的回答。
export function useQuestionnaire(questions: QuestionnaireQuestion[]) {
  const [index, setIndex] = useState(0)
  const [draft, setDraft] = useState<QuestionnaireDraft>({})

  const lastIndex = questions.length - 1
  const currentIndex = Math.min(index, lastIndex)

  const goTo = (next: number) => {
    setIndex(Math.max(0, Math.min(next, lastIndex)))
  }

  // 给当前这道题记下一条回答：点一个选项，或发来一句自己写的话，规则相同。
  // 单选题答完自动翻到下一题；最后一题留在原地，等用户点「提交」。
  const answer = (value: string) => {
    const question = questions[currentIndex]
    const text = value.trim()
    if (!question || text === '') {
      return
    }
    setDraft((current) => applyAnswer(current, question, text))
    if (!question.multiple && currentIndex < lastIndex) {
      setIndex(currentIndex + 1)
    }
  }

  return { index: currentIndex, draft, goTo, answer }
}
