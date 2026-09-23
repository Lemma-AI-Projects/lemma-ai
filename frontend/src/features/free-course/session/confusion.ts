/**
 * Which of the two "say something" signals is this?
 *
 * The reference research is blunt about this being the product's real adaptive
 * trigger: getting an answer wrong only earns a correction, while saying "I
 * don't get it" is what actually changes the explanation and the board. So the
 * distinction matters more than any other classification in this feature.
 *
 * V0 decides it from explicit phrasing — a fixed list of Chinese and English
 * ways of saying "explain that differently" — plus a one-click button that
 * sends the signal outright, so the behaviour never depends on the heuristic
 * being clever. Anything else is treated as an interruption: the learner asked
 * their own question, which is the other thing the session supports.
 *
 * What this deliberately is NOT: a sentiment model, or a judgement about
 * whether the learner "really" understands. Language signals are the input;
 * guessing at comprehension is Learner State's job, and that is deliberately
 * elsewhere.
 */

import type { SessionSignalKind } from './types'

const CONFUSED_PHRASES = [
  '不懂',
  '不明白',
  '没听懂',
  '没理解',
  '不理解',
  '听不懂',
  '看不明白',
  '换个方式',
  '换一种方式',
  '换个讲法',
  '换种讲法',
  '换一种讲法',
  '再讲一遍',
  '重新讲',
  '讲得再简单',
  '太抽象',
  '跟不上',
  "don't understand",
  "don't get it",
  'do not understand',
  'another way',
  'explain differently',
  'confused',
]

export function classifyLearnerMessage(text: string): SessionSignalKind {
  const normalised = text.toLowerCase().replace(/\s+/g, '')
  return CONFUSED_PHRASES.some((phrase) =>
    normalised.includes(phrase.toLowerCase().replace(/\s+/g, ''))
  )
    ? 'confused'
    : 'interrupt'
}

/** The one-click phrasing the demo (and the acceptance test) uses. */
export const CONFUSED_PROMPT = '我还是不太明白，能不能换个方式讲？'
