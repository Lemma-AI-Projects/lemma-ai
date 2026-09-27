/**
 * onboarding 的状态机。
 *
 * 只管三件事：当前在第几屏、draft 里有什么、能不能继续。
 * 「能不能继续」按屏的类型分：配置屏要选后确认，评估屏一触即走（由屏自己推进）。
 */

import { useCallback, useMemo, useState } from 'react'

import { INITIAL_DRAFT, PHASES, STEPS } from './mock'
import type { OnboardingDraft, PhaseId, StepDef } from './types'

export interface PhaseProgress {
  /** 阶段序号，从 0 起。 */
  phaseIndex: number
  phaseLabel: string
  /** 本阶段内的第几屏，从 0 起。 */
  inPhaseIndex: number
  phaseStepCount: number
}

export interface OnboardingFlowState {
  step: StepDef
  index: number
  total: number
  draft: OnboardingDraft
  phase: PhaseProgress
  /** 当前屏是否允许前进。评估屏与确认屏自己推进，这里恒为 false。 */
  canContinue: boolean
  patch: (patch: Partial<OnboardingDraft>) => void
  next: () => void
  back: () => void
  reset: () => void
  /** 是否处在不可后退的位置（第一屏）。 */
  isFirst: boolean
}

function phaseStepsOf(phase: PhaseId): StepDef[] {
  return STEPS.filter((s) => s.phase === phase)
}

export function useOnboardingFlow(): OnboardingFlowState {
  const [index, setIndex] = useState(0)
  const [draft, setDraft] = useState<OnboardingDraft>(INITIAL_DRAFT)

  const step = STEPS[index]

  const patch = useCallback((next: Partial<OnboardingDraft>) => {
    setDraft((prev) => ({ ...prev, ...next }))
  }, [])

  const next = useCallback(() => {
    setIndex((i) => Math.min(i + 1, STEPS.length - 1))
  }, [])

  const back = useCallback(() => {
    setIndex((i) => Math.max(i - 1, 0))
  }, [])

  const reset = useCallback(() => {
    setIndex(0)
    setDraft(INITIAL_DRAFT)
  }, [])

  const phase = useMemo<PhaseProgress>(() => {
    const steps = phaseStepsOf(step.phase)
    return {
      phaseIndex: PHASES.findIndex((p) => p.id === step.phase),
      phaseLabel: PHASES.find((p) => p.id === step.phase)?.label ?? '',
      inPhaseIndex: steps.findIndex((s) => s.id === step.id),
      phaseStepCount: steps.length,
    }
  }, [step])

  const canContinue = useMemo(() => {
    switch (step.id) {
      // 称呼可以跳过 —— 第一屏只要求一次点击。
      case 'greeting':
        return true
      case 'age':
        return draft.age !== null
      case 'purpose':
        return draft.purpose !== null
      case 'subject':
        return draft.subject.trim().length > 0
      case 'depth':
        return draft.depth !== null && draft.timeHorizon !== null
      default:
        return false
    }
  }, [step.id, draft])

  return {
    step,
    index,
    total: STEPS.length,
    draft,
    phase,
    canContinue,
    patch,
    next,
    back,
    reset,
    isFirst: index === 0,
  }
}