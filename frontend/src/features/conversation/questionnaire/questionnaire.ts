import { type ConversationToolQuestion } from '@/features/conversation/types'

// 一道问卷题：题干加一组预设选项；`multiple` 为真时可以选多个。
export interface QuestionnaireQuestion extends ConversationToolQuestion {
  multiple?: boolean
}

// 作答草稿：每道题当前记下了哪些回答，按题目 id 存。
// 一条回答就是一个字符串：可以是预设选项，也可以是用户自己写的一句话
// （不在预设选项里的就是自己写的）。单选题最多一条；没答过的题没有这一项，或是空数组。
export type QuestionnaireDraft = Record<string, string[]>

export function getQuestionAnswers(
  draft: QuestionnaireDraft,
  question: QuestionnaireQuestion
): string[] {
  return draft[question.id] ?? []
}

// 这道题的回答里，用户自己写的那几条。
export function getCustomAnswers(
  question: QuestionnaireQuestion,
  answers: string[]
): string[] {
  return answers.filter((answer) => !question.options.includes(answer))
}

// 给一道题记下一条回答，返回新的草稿。
// 点一个选项和发来一条自己写的回答走的是同一条规则：
// - 单选：换成这一条；
// - 多选：还没有就加上，已经有了就去掉。
export function applyAnswer(
  draft: QuestionnaireDraft,
  question: QuestionnaireQuestion,
  value: string
): QuestionnaireDraft {
  const current = getQuestionAnswers(draft, question)
  if (!question.multiple) {
    return { ...draft, [question.id]: [value] }
  }
  return {
    ...draft,
    [question.id]: current.includes(value)
      ? current.filter((answer) => answer !== value)
      : [...current, value],
  }
}

// 已经答了几道题。
export function countAnsweredQuestions(
  questions: QuestionnaireQuestion[],
  draft: QuestionnaireDraft
): number {
  return questions.filter((question) => getQuestionAnswers(draft, question).length > 0)
    .length
}
