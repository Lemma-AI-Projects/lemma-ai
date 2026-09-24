// 构造 fixture（F13–F18）：文档没有样例、为验证边界而写。题目内容为本项目自拟，
// 结构字段按提案契约（src/types/question.ts）。首期是数学 + 物理，F13/F14 取这两科。
import type { QuestionMeta } from '@/types/question'
import type { QuestionFixture } from './types'

function meta(id: string, typeName: string, courseName: string): QuestionMeta {
  return {
    source: { provider: 'xkw', externalId: `constructed-${id}`, sourceKind: 'other' },
    typeId: null,
    typeName,
    difficulty: null,
    difficultyLevel: null,
    knowledgePoints: [],
    years: [],
    sourcePapers: [],
    courseName,
  }
}

const mathT = '<math latex="$t=10\\,\\mathrm{s}$"><mrow><mi>t</mi><mo>=</mo><mn>10</mn><mtext>&nbsp;s</mtext></mrow></math>'
const mathV = '<math latex="$v=20\\,\\mathrm{m/s}$"><mrow><mi>v</mi><mo>=</mo><mn>20</mn><mtext>&nbsp;m/s</mtext></mrow></math>'

/** F13：无显式空的解答题（隐式 essay），高中物理。 */
export const f13ImplicitEssay: QuestionFixture = {
  view: {
    id: 'q_f13',
    contentVersion: 'fixture-v1',
    structure: 'parsed',
    numbering: 'none',
    stem: {
      html: `<p>一辆汽车从静止开始做匀加速直线运动，经过 ${mathT} 速度达到 ${mathV}。求：</p><p>汽车的加速度大小，以及这段时间内通过的位移。</p>`,
    },
    slots: [
      {
        id: 'q_f13:bk',
        mechanism: 'essay',
        grading: 'none',
        optionGroupId: null,
        select: null,
        blank: null,
        anchored: false,
      },
    ],
    optionGroups: [],
    subQuestions: [],
    media: [],
    meta: meta('f13', '解答题', '高中物理'),
    raw: null,
  },
  review: {
    questionId: 'q_f13',
    contentVersion: 'fixture-v1',
    referenceAnswers: [
      {
        slotId: 'q_f13:bk',
        answer: {
          kind: 'rich',
          content: {
            html: '<p>加速度 <math latex="$a=2\\,\\mathrm{m/s^2}$"><mrow><mi>a</mi><mo>=</mo><mn>2</mn><mtext>&nbsp;m/s²</mtext></mrow></math>，位移 <math latex="$x=100\\,\\mathrm{m}$"><mrow><mi>x</mi><mo>=</mo><mn>100</mn><mtext>&nbsp;m</mtext></mrow></math>。</p>',
          },
        },
      },
    ],
    answerFallback: null,
    explanation: [
      {
        name: '详解',
        content: {
          html: '<p>由 <math latex="$v=at$"><mrow><mi>v</mi><mo>=</mo><mi>a</mi><mi>t</mi></mrow></math> 得 <math latex="$a=\\frac{v}{t}=\\frac{20}{10}=2\\,\\mathrm{m/s^2}$"><mrow><mi>a</mi><mo>=</mo><mfrac><mi>v</mi><mi>t</mi></mfrac><mo>=</mo><mfrac><mn>20</mn><mn>10</mn></mfrac><mo>=</mo><mn>2</mn></mrow></math>；</p><p>由 <math latex="$x=\\frac{1}{2}at^2$"><mrow><mi>x</mi><mo>=</mo><mfrac><mn>1</mn><mn>2</mn></mfrac><mi>a</mi><msup><mi>t</mi><mn>2</mn></msup></mrow></math> 得 <math latex="$x=100\\,\\mathrm{m}$"><mrow><mi>x</mi><mo>=</mo><mn>100</mn></mrow></math>。</p>',
        },
        scope: { kind: 'question' },
      },
    ],
    media: [],
  },
}

const oddIncreasingOptions = [
  { label: 'A', html: '<math latex="$y={{x}^{3}}$"><mrow><mi>y</mi><mo>=</mo><msup><mi>x</mi><mn>3</mn></msup></mrow></math>' },
  { label: 'B', html: '<math latex="$y=x-\\frac{1}{x}$"><mrow><mi>y</mi><mo>=</mo><mi>x</mi><mo>−</mo><mfrac><mn>1</mn><mi>x</mi></mfrac></mrow></math>' },
  { label: 'C', html: '<math latex="$y=\\sin x$"><mrow><mi>y</mi><mo>=</mo><mi>sin</mi><mo>&#x2061;</mo><mi>x</mi></mrow></math>' },
  { label: 'D', html: '<math latex="$y={{x}^{2}}$"><mrow><mi>y</mi><mo>=</mo><msup><mi>x</mi><mn>2</mn></msup></mrow></math>' },
]

function oddIncreasingQuestion(
  id: string,
  select: 'multiple' | 'unknown',
  contentVersion = 'fixture-v1'
): QuestionFixture {
  const og = `${id}:og1`
  return {
    view: {
      id,
      contentVersion,
      structure: 'parsed',
      numbering: 'none',
      stem: {
        html: `<p>下列函数中，既是奇函数又在 <math latex="$(0,+\\infty )$"><mrow><mo>(</mo><mn>0</mn><mo>,</mo><mo>+</mo><mi>∞</mi><mo>)</mo></mrow></math> 上单调递增的是（<span qml-space-size="3">&nbsp;&nbsp;&nbsp;</span>）</p><span data-og-id="${og}"></span>`,
      },
      slots: [
        {
          id: `${id}:bk`,
          mechanism: 'choice',
          grading: 'auto',
          optionGroupId: og,
          select,
          blank: null,
          anchored: false,
        },
      ],
      optionGroups: [
        {
          id: og,
          options: oddIncreasingOptions.map((option) => ({
            id: `${og}:${option.label}`,
            label: option.label,
            content: { html: option.html },
          })),
          cols: 4,
          layout: 'table',
          reuse: null,
          anchored: true,
        },
      ],
      subQuestions: [],
      media: [],
      meta: meta(id, select === 'multiple' ? '多选题' : '选择题', '高中数学'),
      raw: null,
    },
    review: {
      questionId: id,
      contentVersion: 'fixture-v1',
      referenceAnswers: [
        { slotId: `${id}:bk`, answer: { kind: 'options', optionIds: [`${og}:A`, `${og}:B`] } },
      ],
      answerFallback: null,
      explanation: [
        {
          name: '详解',
          content: {
            html: '<p>A、B 都是奇函数，且导数在 <math latex="$(0,+\\infty )$"><mrow><mo>(</mo><mn>0</mn><mo>,</mo><mo>+</mo><mi>∞</mi><mo>)</mo></mrow></math> 上恒为正；C 不单调；D 是偶函数。故选 AB。</p>',
          },
          scope: { kind: 'question' },
        },
      ],
      media: [],
    },
  }
}

/** F14a：多选题，后端明确 select = multiple。 */
export const f14MultipleChoice = oddIncreasingQuestion('q_f14a', 'multiple')

/** F14b：同一题，后端无法判定单/多选（select = unknown），前端按多选呈现。 */
export const f14UnknownSelect = oddIncreasingQuestion('q_f14b', 'unknown')

const listeningAudio = {
  kind: 'audio' as const,
  src: 'https://img.xkw.com/dksih/QBM/2020/4/22/2446810145964032/2446836295442432/STEM/17f4974913624373ada3ee58adef479c.mp3',
  title: null,
  durationSeconds: 11,
  poster: null,
}

function listeningSub(n: number, question: string, options: string[], answer: string) {
  const id = `q_f15:sq${n}`
  const og = `${id}:og1`
  return {
    sub: {
      id,
      label: `${n}.`,
      stem: { html: `<p>${question}</p><span data-og-id="${og}"></span>` },
      slots: [
        {
          id: `${id}:bk`,
          mechanism: 'choice' as const,
          grading: 'auto' as const,
          optionGroupId: og,
          select: 'single' as const,
          blank: null,
          anchored: false,
        },
      ],
      optionGroups: [
        {
          id: og,
          options: options.map((text, index) => {
            const label = String.fromCharCode(65 + index)
            return { id: `${og}:${label}`, label, content: { html: text } }
          }),
          cols: 3,
          layout: 'table' as const,
          reuse: null,
          anchored: true,
        },
      ],
      media: [listeningAudio],
    },
    answer: { slotId: `${id}:bk`, answer: { kind: 'options' as const, optionIds: [`${og}:${answer}`] } },
  }
}

const f15Subs = [
  listeningSub(1, 'Where does the conversation most probably take place?', ['At a ticket office.', 'In a concert hall.', 'At a bus stop.'], 'A'),
  listeningSub(2, 'How long have people been waiting in line?', ['For one hour.', 'For two hours.', 'For three hours.'], 'B'),
]

/**
 * F15：每道小题各带一段音频（对应 /medias 的 sub_question_medias，方案 §3.2）。
 * 音频沿用 F03 文档样例里的真实地址。
 */
export const f15SubQuestionAudio: QuestionFixture = {
  view: {
    id: 'q_f15',
    contentVersion: 'fixture-v1',
    structure: 'parsed',
    numbering: 'sequential',
    stem: {
      html: '<p>听下面一段对话，回答两个小题。</p><span data-sq-id="q_f15:sq1"></span><span data-sq-id="q_f15:sq2"></span>',
    },
    slots: [],
    optionGroups: [],
    subQuestions: f15Subs.map((entry) => entry.sub),
    media: [],
    meta: meta('f15', '听力理解', '初中英语'),
    raw: null,
  },
  review: {
    questionId: 'q_f15',
    contentVersion: 'fixture-v1',
    referenceAnswers: f15Subs.map((entry) => entry.answer),
    answerFallback: null,
    explanation: [],
    media: [],
  },
}

/**
 * F17：结构异常与降级。
 * - bk1 标记 anchored:true，但题干里没有它的锚点 → 渲染在题干末尾；
 * - 题干里有 bk9 的锚点，但 slots 里没有 → 静态空位；
 * - bk2 机制 unsupported → 静态空位，不计入完成度；
 * - og1 标记 anchored:true 却没有锚点 → 渲染在题干末尾；
 * - 解析归属 unknown、参考答案 missing。
 */
export const f17Anomalies: QuestionFixture = {
  view: {
    id: 'q_f17',
    contentVersion: 'fixture-v1',
    structure: 'parsed',
    numbering: 'none',
    stem: {
      html: '<p>已知集合 <math latex="$A=\\{1,2,3\\}$"><mrow><mi>A</mi><mo>=</mo><mo>{</mo><mn>1</mn><mo>,</mo><mn>2</mn><mo>,</mo><mn>3</mn><mo>}</mo></mrow></math>，则 A 的真子集个数为<span class="qml-bk" data-slot-id="q_f17:bk9"></span>，画出韦恩图<span class="qml-bk" data-slot-id="q_f17:bk2"></span>。</p><p>下列说法正确的是：</p>',
    },
    slots: [
      {
        id: 'q_f17:bk1',
        mechanism: 'text',
        grading: 'auto',
        optionGroupId: null,
        select: null,
        blank: { style: 'underline', size: 4, inlineLabel: null },
        anchored: true,
      },
      {
        id: 'q_f17:bk2',
        mechanism: 'unsupported',
        grading: 'none',
        optionGroupId: null,
        select: null,
        blank: { style: 'underline', size: 6, inlineLabel: null },
        anchored: true,
      },
      {
        id: 'q_f17:bk3',
        mechanism: 'choice',
        grading: 'auto',
        optionGroupId: 'q_f17:og1',
        select: 'single',
        blank: null,
        anchored: false,
      },
    ],
    optionGroups: [
      {
        id: 'q_f17:og1',
        options: [
          { id: 'q_f17:og1:A', label: 'A', content: { html: '空集是任何集合的真子集' } },
          { id: 'q_f17:og1:B', label: 'B', content: { html: '空集是任何非空集合的真子集' } },
        ],
        cols: null,
        layout: 'unknown',
        reuse: null,
        anchored: true,
      },
    ],
    subQuestions: [],
    media: [],
    meta: meta('f17', '填空题', '高中数学'),
    raw: null,
  },
  review: {
    questionId: 'q_f17',
    contentVersion: 'fixture-v1',
    referenceAnswers: [
      { slotId: 'q_f17:bk1', answer: { kind: 'exact', accepted: ['7'], display: { html: '7' } } },
      { slotId: 'q_f17:bk2', answer: { kind: 'missing' } },
      { slotId: 'q_f17:bk3', answer: { kind: 'options', optionIds: ['q_f17:og1:B'] } },
    ],
    answerFallback: null,
    explanation: [
      {
        name: '备注',
        content: { html: '<p>这段解析的归属无法判定（scope: unknown），归入整题解析。</p>' },
        scope: { kind: 'unknown' },
      },
    ],
    media: [],
  },
}

/**
 * F18（版本过期）：用户手里的题面是 fixture-v0，模拟后端已更新到 fixture-v1，
 * 提交会被拒绝（content_version_mismatch）。
 */
export const f18StaleVersion = oddIncreasingQuestion('q_f18', 'multiple', 'fixture-v0')
