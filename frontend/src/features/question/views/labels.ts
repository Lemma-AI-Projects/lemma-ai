import type { QuestionSetKind, QuestionSetMode } from '@/types/question'

export const questionSetKindTitle: Record<QuestionSetKind, string> = {
  quiz: '测验',
  assignment: '作业',
  practice: '练习',
  paper: '试卷',
}

export const questionSetModeLabel: Record<QuestionSetMode, string> = {
  batch: '全部作答后统一提交',
  immediate: '逐题提交，即时反馈',
}
