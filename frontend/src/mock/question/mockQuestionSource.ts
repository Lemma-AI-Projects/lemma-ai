import {
  QuestionApiError,
  type QuestionSource,
} from '@/features/question/questionSource'
import type { QuestionSetView } from '@/types/question'
import { assertCurrentVersion, gradeSubmission } from './grading'
import { questionSetFixtures, type QuestionSetFixture } from './sets'

// fixture 适配器：模拟后端的题组读取与判分。业务代码已改用真实后端，这里只留给 vitest。

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

function findSet(setId: string): QuestionSetFixture {
  const set = questionSetFixtures.find((candidate) => candidate.id === setId)
  if (!set) throw new QuestionApiError('not_found', `题组 ${setId} 不存在`)
  return set
}

function toView(set: QuestionSetFixture): QuestionSetView {
  return {
    id: set.id,
    title: set.title,
    kind: set.kind,
    mode: set.mode,
    status: 'ready',
    sections: [
      {
        id: `${set.id}:section1`,
        title: null,
        instructions: set.instructions,
        questionIds: set.questions.map((question) => question.view.id),
      },
    ],
    // 下发副本：作答视图里永远没有 review。
    questions: set.questions.map((question) => structuredClone(question.view)),
  }
}

export const mockQuestionSource: QuestionSource = {
  async listQuestionSets() {
    await wait(120)
    return questionSetFixtures.map((set) => ({
      id: set.id,
      title: set.title,
      kind: set.kind,
      mode: set.mode,
      questionCount: set.questions.length,
      status: 'ready' as const,
    }))
  },

  async getQuestionSet(setId) {
    await wait(250)
    return toView(findSet(setId))
  },

  async submitAttempts(setId, submissions) {
    await wait(400)
    const set = findSet(setId)
    const fixtures = submissions.map((submission) => {
      const fixture = set.questions.find((question) => question.view.id === submission.questionId)
      if (!fixture) {
        throw new QuestionApiError('invalid_submission', `题组里没有题目 ${submission.questionId}`)
      }
      return fixture
    })
    // 整组提交是原子的：任何一题版本过期，整组都不判分。
    submissions.forEach((submission, index) => assertCurrentVersion(fixtures[index], submission))
    return submissions.map((submission, index) =>
      structuredClone(gradeSubmission(fixtures[index], submission))
    )
  },
}
