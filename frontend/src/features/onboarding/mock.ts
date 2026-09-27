/**
 * 沙盒用的 mock 数据与流程定义。
 *
 * 全部是 Lemma 自己的内容与中文文案：不取自任何外部产品的题目、文案或学科结构。
 * 第 4 屏的学科是开放输入 + 建议，不是有限枚举 —— Lemma 能处理任何学习对象。
 */

import type {
  DraftCandidate,
  OnboardingDraft,
  PhaseDef,
  StepDef,
} from './types'

export const PHASES: PhaseDef[] = [
  { id: 'meet', label: '认识你' },
  { id: 'calibrate', label: '校准' },
  { id: 'commit', label: '确认' },
]

export const STEPS: StepDef[] = [
  { id: 'greeting', phase: 'meet', kind: 'config' },
  { id: 'age', phase: 'meet', kind: 'config' },
  { id: 'purpose', phase: 'meet', kind: 'config' },
  { id: 'subject', phase: 'meet', kind: 'config' },
  { id: 'level', phase: 'calibrate', kind: 'assess' },
  { id: 'depth', phase: 'calibrate', kind: 'config' },
  { id: 'confirm', phase: 'commit', kind: 'confirm' },
]

export const INITIAL_DRAFT: OnboardingDraft = {
  nickname: '',
  age: null,
  purpose: null,
  subject: '',
  level: null,
  probe: null,
  depth: null,
  timeHorizon: null,
  decisions: {},
}

/** 第 2 屏：你多大了。分档，不填具体生日 —— 只用来决定例子落在哪种生活里。 */
export const AGE_OPTIONS: { id: string; text: string; hint: string }[] = [
  { id: 'u18', text: '18 岁以下', hint: '例子贴近课本' },
  { id: 'a18-24', text: '18–24', hint: '例子贴近课程与实习' },
  { id: 'a25-34', text: '25–34', hint: '例子贴近工作' },
  { id: 'a35-44', text: '35–44', hint: '例子贴近工作与生活' },
  { id: 'a45+', text: '45 岁以上', hint: '例子贴近长期兴趣' },
]

/** 第 3 屏：你为什么来。 */
export const PURPOSE_OPTIONS: { id: string; text: string; hint: string }[] = [
  { id: 'work', text: '工作里马上要用', hint: '先能上手，边用边补' },
  { id: 'exam', text: '为了考试或认证', hint: '按考纲走，要能自测' },
  { id: 'switch', text: '换个方向，重新打基础', hint: '从根上重来一遍' },
  { id: 'curious', text: '纯粹想弄明白', hint: '没有截止日期，跟着兴趣走' },
  { id: 'lifelong', text: '终生学习', hint: '学的是长在身上的东西，不赶时间' },
]

/** 第 4 屏：想学什么。开放输入为主，下面是随手可点的建议。 */
export const SUBJECT_SUGGESTIONS = [
  '线性代数',
  'Python 数据分析',
  '概率论',
  '宏观经济学',
  '认知科学',
  '学术写作',
  '哲学导论',
  'SQL',
]

/** 第 5 屏：你现在在哪。 */
export const LEVEL_OPTIONS: { id: string; text: string; hint: string }[] = [
  { id: 'new', text: '全新', hint: '基本没接触过' },
  { id: 'rusty', text: '有点印象', hint: '学过，但忘了大半' },
  { id: 'working', text: '能上手', hint: '常见的事能自己做' },
  { id: 'solid', text: '比较熟', hint: '想补的是边角和深度' },
]

/**
 * 第 5 屏的探测题。沙盒里是一道固定的示例题，并明确标出它是示例：
 * 正式版会按第 4 屏说的内容实时生成，而不是从题库里挑。
 */
export const PROBE_SAMPLE = {
  label: '示例题',
  prompt: '所有 A 都是 B，有些 B 是 C。下面哪句一定成立？',
  options: ['有些 A 是 C', '没有 A 是 C', '以上都不一定成立'],
  answerIndex: 2,
  note: '正式版会按你在上一步说的内容实时出题，而不是从固定题库里挑。',
}

/** 第 6 屏：想学到什么程度。 */
export const DEPTH_OPTIONS: { id: string; text: string; hint: string }[] = [
  { id: 'enough', text: '够用就行', hint: '能把事做完，不追根究底' },
  { id: 'systematic', text: '系统学一遍', hint: '按顺序走完，不留缺口' },
  { id: 'derive', text: '学到能自己推导', hint: '要理解为什么，而不只是会用' },
]

/**
 * 第 6 屏：时间视野。
 *
 * `short` 不是文案，是给推断用的：时间碎的时候，讲法只能一次讲一个点。
 * 这条推断会变成最后一屏的一条 agent 候选 —— 我们不再开口问风格，而是从
 * 你的时间预算里推出来，再请你过目。
 */
export const TIME_OPTIONS: { id: string; text: string; short: boolean }[] = [
  { id: 't10', text: '每天 10 分钟', short: true },
  { id: 't20', text: '每天 20 分钟', short: true },
  { id: 't30', text: '每天 30 分钟', short: false },
  { id: 'tflex', text: '每周几次，不固定', short: false },
]

const MOCK_NOW = '2026-09-27T00:00:00.000Z'

function candidate(
  id: string,
  kind: DraftCandidate['kind'],
  text: string,
  origin: DraftCandidate['origin']
): DraftCandidate {
  return {
    id,
    kind,
    text,
    status: 'candidate',
    origin,
    sourceSpaceId: null,
    createdAt: MOCK_NOW,
    confirmedAt: null,
  }
}

/**
 * 由 draft 推出候选条目 —— 这是最后一屏要用户过目的东西。
 *
 * 关键：`origin` 区分「你说的」和「我们猜的」。用户显式输入的标 `user`，
 * agent 推断的标 `agent`，两者在界面上必须能分辨（计划 §4 原则 1）。
 *
 * 这里只有一条 `user` 候选（学科），其余都是推断 —— 因为风格那一屏已经删掉：
 * 与其问，不如从已有的信号里推，然后把推断摆出来让人否决。
 */
export function buildCandidates(draft: OnboardingDraft): DraftCandidate[] {
  const out: DraftCandidate[] = []

  const subject = draft.subject.trim()
  if (subject) out.push(candidate('c-subject', 'interest', subject, 'user'))

  const time = TIME_OPTIONS.find((option) => option.id === draft.timeHorizon)
  if (time) {
    out.push(
      candidate(
        'c-agent-pace',
        'preference',
        time.short ? '一次只讲一个点，讲透' : '先给例子，再讲抽象',
        'agent'
      )
    )
  }

  // 一条与任何输入都无关的推断：让「我们猜的」在界面上真的与「你说的」并存。
  out.push(candidate('c-agent-guess', 'preference', '回答尽量简洁一点', 'agent'))

  return out
}