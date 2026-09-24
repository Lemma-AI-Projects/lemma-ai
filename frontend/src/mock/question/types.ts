import type { QuestionReview, QuestionView } from '@/types/question'

/**
 * 一道题的 fixture：作答视图 + 模拟后端持有的批阅数据。review 只由模拟后端在
 * 判分后下发，业务代码拿不到它。
 */
export interface QuestionFixture {
  view: QuestionView
  review: QuestionReview
}
