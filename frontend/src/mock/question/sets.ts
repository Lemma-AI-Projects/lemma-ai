import type { QuestionSetKind, QuestionSetMode, RichHtml } from '@/types/question'
import {
  f13ImplicitEssay,
  f14MultipleChoice,
  f14UnknownSelect,
  f15SubQuestionAudio,
  f17Anomalies,
  f18StaleVersion,
} from './constructed'
import {
  f01ChineseIdiomSingle,
  f02BiologyLabBlanks,
  f03ListeningSingle,
  f04ChemistrySingle,
  f05ClassicReadingBlanks,
  f06ReadingCompound,
  f07Cloze,
  f08PoemSubquestions,
  f09Judge,
  f10SevenChooseFive,
  f11ExactBlanks,
  f12MathmlSubquestions,
  f16RawMassive,
} from './docSamples'
import type { QuestionFixture } from './types'

export interface QuestionSetFixture {
  id: string
  title: string
  kind: QuestionSetKind
  mode: QuestionSetMode
  instructions: RichHtml | null
  questions: QuestionFixture[]
}

export const questionSetFixtures: QuestionSetFixture[] = [
  {
    id: 'set-doc-samples',
    title: '文档样例 F01–F12',
    kind: 'quiz',
    mode: 'batch',
    instructions: {
      html: '<p>学科网《试题HTML渲染说明》里的 12 道样例，覆盖单选、实验填空、听力、名著填空、阅读理解、完形填空、诗歌小问、判断、七选五、机阅填空与 MathML。</p>',
    },
    questions: [
      f01ChineseIdiomSingle,
      f02BiologyLabBlanks,
      f03ListeningSingle,
      f04ChemistrySingle,
      f05ClassicReadingBlanks,
      f06ReadingCompound,
      f07Cloze,
      f08PoemSubquestions,
      f09Judge,
      f10SevenChooseFive,
      f11ExactBlanks,
      f12MathmlSubquestions,
    ],
  },
  {
    id: 'set-math-physics',
    title: '首期数学 + 物理',
    kind: 'practice',
    mode: 'immediate',
    instructions: {
      html: '<p>逐题提交，提交后立即看到对错、参考答案与解析。主观题只给参考答案，不计分。</p>',
    },
    questions: [f14MultipleChoice, f14UnknownSelect, f13ImplicitEssay, f12MathmlSubquestions],
  },
  {
    id: 'set-f19-batch',
    title: 'F19 · 统一提交',
    kind: 'quiz',
    mode: 'batch',
    instructions: null,
    questions: [f06ReadingCompound, f08PoemSubquestions, f13ImplicitEssay],
  },
  {
    id: 'set-f19-immediate',
    title: 'F19 · 逐题即时反馈',
    kind: 'practice',
    mode: 'immediate',
    instructions: null,
    questions: [f06ReadingCompound, f08PoemSubquestions, f13ImplicitEssay],
  },
  {
    id: 'set-constructed',
    title: '构造边界 F13–F17',
    kind: 'quiz',
    mode: 'batch',
    instructions: {
      html: '<p>无空解答题、多选与单/多选未知、小题音频、锚点异常与不支持的机制。</p>',
    },
    questions: [f13ImplicitEssay, f14MultipleChoice, f14UnknownSelect, f15SubQuestionAudio, f17Anomalies],
  },
  {
    id: 'set-f18-results',
    title: 'F18 · 结果状态',
    kind: 'quiz',
    mode: 'batch',
    instructions: {
      html: '<p>一道可判分、一道客观 + 主观混合、一道只能查看的海量版原题。</p>',
    },
    questions: [f01ChineseIdiomSingle, f08PoemSubquestions, f16RawMassive],
  },
  {
    id: 'set-f18-stale',
    title: 'F18 · 题目版本过期',
    kind: 'practice',
    mode: 'immediate',
    instructions: {
      html: '<p>第 1 题的题面版本已过期，提交会被拒绝；第 2 题正常。</p>',
    },
    questions: [f18StaleVersion, f01ChineseIdiomSingle],
  },
]
