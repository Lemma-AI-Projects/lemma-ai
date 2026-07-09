import { useEffect, useRef, useState } from 'react'

import { Skeleton } from '@/components/ui/skeleton'
import { useDesmosGraphQuery, useSaveGraphMutation } from './desmosApi'
import { loadDesmos } from './desmosLoader'
import type { DesmosCalculator } from './desmosTypes'
import {
  CALCULATOR_OPTIONS,
  toExpressionStates,
  toGraphSettings,
  toMathBounds,
  type AiGraphParams,
} from './translator'

// User edits save at most this often; the trailing edit always lands.
const SAVE_THROTTLE_MS = 2000

/**
 * The AI-drawn interactive graph card (tool_json thin ref -> hydrate by id).
 *
 * Render path (official six-step sequence):
 * 1. construct with FIXED instance options (product decisions, never AI's);
 * 2/3/4. user-edited `state` present -> setState(blob); otherwise translate
 *    the AI params into updateSettings + setMathBounds + setExpressions;
 * 5. setDefaultState(AI translation) — the on-paper reset button always
 *    returns to the AI original, not the user's last edit;
 * 6. observeEvent('change') -> throttled PATCH of {state, expressions}
 *    (only isUserInitiated changes; API-driven setup must not save).
 */
export function DesmosGraphCard({ graphId }: { graphId: string }) {
  const graphQuery = useDesmosGraphQuery(graphId)
  const saveMutation = useSaveGraphMutation(graphId)
  const containerRef = useRef<HTMLDivElement>(null)
  const [setupError, setSetupError] = useState<string | null>(null)

  const saveRef = useRef(saveMutation.mutate)
  useEffect(() => {
    saveRef.current = saveMutation.mutate
  })

  const graph = graphQuery.data

  useEffect(() => {
    const element = containerRef.current
    if (!graph || !element) {
      return
    }

    let calculator: DesmosCalculator | null = null
    let disposed = false
    let throttleTimer: number | null = null
    let pendingSave = false

    const flushSave = () => {
      throttleTimer = null
      if (!pendingSave || !calculator) return
      pendingSave = false
      saveRef.current({
        state: calculator.getState(),
        expressions: calculator.getExpressions(),
      })
    }

    void loadDesmos()
      .then((desmos) => {
        if (disposed) return
        calculator = desmos.GraphingCalculator(element, CALCULATOR_OPTIONS)

        const aiParams: AiGraphParams = graph.aiParams
        const applyAiParams = () => {
          if (!calculator) return
          calculator.updateSettings(toGraphSettings(aiParams))
          const bounds = toMathBounds(aiParams)
          if (bounds) calculator.setMathBounds(bounds)
          calculator.setExpressions(toExpressionStates(aiParams))
        }

        // The AI original is ALWAYS materialized once so setDefaultState can
        // anchor the reset button to it; a saved user state then replaces it
        // as the visible content.
        applyAiParams()
        calculator.setDefaultState(calculator.getState())
        if (graph.state != null) {
          calculator.setState(graph.state)
        }

        calculator.observeEvent('change', (_eventName, event) => {
          if (!event.isUserInitiated || !calculator) return
          pendingSave = true
          if (throttleTimer == null) {
            throttleTimer = window.setTimeout(flushSave, SAVE_THROTTLE_MS)
          }
        })
      })
      .catch((error: unknown) => {
        if (!disposed) {
          setSetupError(
            error instanceof Error ? error.message : '图形加载失败'
          )
        }
      })

    return () => {
      disposed = true
      if (throttleTimer != null) {
        window.clearTimeout(throttleTimer)
        // Unmount flush: the trailing edit must not be lost.
        flushSave()
      }
      calculator?.unobserveEvent('change')
      calculator?.destroy()
      calculator = null
    }
  }, [graph])

  if (graphQuery.isError || setupError) {
    return (
      <div
        data-slot="desmos-graph-card"
        className="rounded-2xl border border-border bg-zinc-50 px-4 py-6 text-center text-sm text-muted-foreground"
      >
        {setupError ?? '图形不存在或已删除'}
      </div>
    )
  }

  return (
    <div
      data-slot="desmos-graph-card"
      className="overflow-hidden rounded-2xl border border-border"
    >
      {graph ? (
        <div ref={containerRef} className="h-[360px] w-full" />
      ) : (
        <Skeleton className="h-[360px] w-full rounded-none" />
      )}
    </div>
  )
}
