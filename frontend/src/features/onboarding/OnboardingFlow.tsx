/**
 * Onboarding 沙盒外壳。
 *
 * 它承载的是「节奏」，不是内容 —— 三条与内容无关的不变量都在这里：
 *   1. 阶段化进度：进度条按阶段分段，进入新阶段时分母归零。
 *   2. 双速提交：配置屏「选后确认」，评估屏「一触即走」（不出现继续按钮）。
 *   3. 逐步暴露：不显示总步数，只显示本阶段走到哪。
 *
 * 屏与屏的顺序只是沙盒的默认序列，将来应由模型动态决定。
 */

import { type ComponentType } from 'react'
import { ChevronLeft, RotateCcw } from 'lucide-react'

import { cn } from '@/lib/utils'

import { PHASES } from './mock'
import { Step01Greeting } from './steps/Step01Greeting'
import { Step02Age } from './steps/Step02Age'
import { Step03Purpose } from './steps/Step03Purpose'
import { Step04Subject } from './steps/Step04Subject'
import { Step05Level } from './steps/Step05Level'
import { Step06Depth } from './steps/Step06Depth'
import { Step07Confirm } from './steps/Step07Confirm'
import type { StepProps } from './steps/shared'
import type { StepId } from './types'
import { useOnboardingFlow } from './useOnboardingFlow'

const STEP_VIEWS: Record<StepId, ComponentType<StepProps>> = {
  greeting: Step01Greeting,
  age: Step02Age,
  purpose: Step03Purpose,
  subject: Step04Subject,
  level: Step05Level,
  depth: Step06Depth,
  confirm: Step07Confirm,
}

function PhaseProgress({
  phaseIndex,
  inPhaseIndex,
  phaseStepCount,
}: {
  phaseIndex: number
  inPhaseIndex: number
  phaseStepCount: number
}) {
  return (
    <div
      className="flex items-center gap-2"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={phaseStepCount}
      aria-valuenow={inPhaseIndex + 1}
      aria-label="本阶段进度"
    >
      {PHASES.map((phase, index) => {
        const fill =
          index < phaseIndex
            ? 1
            : index === phaseIndex
              ? (inPhaseIndex + 1) / phaseStepCount
              : 0

        return (
          <div
            key={phase.id}
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${fill * 100}%` }}
            />
          </div>
        )
      })}
    </div>
  )
}

export function OnboardingFlow() {
  const {
    step,
    draft,
    phase,
    canContinue,
    patch,
    next,
    back,
    reset,
    isFirst,
  } = useOnboardingFlow()

  const StepView = STEP_VIEWS[step.id]

  return (
    <div className="flex h-full flex-col bg-background">
      <header className="flex items-center gap-4 px-6 py-5 sm:px-10">
        {isFirst ? (
          <span className="size-8 shrink-0" aria-hidden />
        ) : (
          <button
            type="button"
            onClick={back}
            aria-label="返回上一步"
            className="-ml-2 flex size-8 shrink-0 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-accent hover:text-zinc-700"
          >
            <ChevronLeft className="size-5" />
          </button>
        )}

        <div className="min-w-0 flex-1">
          <PhaseProgress
            phaseIndex={phase.phaseIndex}
            inPhaseIndex={phase.inPhaseIndex}
            phaseStepCount={phase.phaseStepCount}
          />
          <div className="mt-2 text-[12px] text-zinc-400">
            {phase.phaseLabel} · {phase.inPhaseIndex + 1}/{phase.phaseStepCount}
          </div>
        </div>

        <button
          type="button"
          onClick={reset}
          className="flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] text-zinc-400 transition-colors hover:bg-accent hover:text-zinc-700"
        >
          <RotateCcw className="size-3.5" />
          重来
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[560px] px-6 pb-12 pt-4 sm:px-10">
          <StepView key={step.id} draft={draft} patch={patch} next={next} />
        </div>
      </div>

      {step.kind === 'config' ? (
        <footer className="border-t border-border px-6 py-4 sm:px-10">
          <div className="mx-auto flex w-full max-w-[560px] items-center gap-4">
            <button
              type="button"
              disabled={!canContinue}
              onClick={next}
              className={cn(
                'rounded-full px-6 py-2.5 text-[14px] font-medium transition-colors',
                canContinue
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'cursor-not-allowed bg-muted text-zinc-400'
              )}
            >
              继续
            </button>
            {!canContinue ? (
              <span className="text-[13px] text-zinc-400">选一个就能继续</span>
            ) : null}
          </div>
        </footer>
      ) : null}

      {step.kind === 'assess' ? (
        <footer className="border-t border-border px-6 py-4 sm:px-10">
          <div className="mx-auto w-full max-w-[560px] text-[13px] text-zinc-400">
            这一屏不用按继续 —— 选一个就往前走。
          </div>
        </footer>
      ) : null}
    </div>
  )
}