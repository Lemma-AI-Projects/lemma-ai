import { useEffect, useRef, useState } from 'react'

import { Skeleton } from '@/components/ui/skeleton'
import { useDesmosGraphQuery, useSaveGraphMutation } from './desmosApi'
import { loadDesmos } from './desmosLoader'
import type { DesmosCalculator } from './desmosTypes'
import {
  CALCULATOR_OPTIONS,
  toExpressionStates,
  toExpressionStates3D,
  toGraphSettings,
  toGraphSettings3D,
  toMathBounds,
  type AiGraph3DParams,
  type AiGraphParams,
} from './translator'

// User edits save at most this often; the trailing edit always lands.
const SAVE_THROTTLE_MS = 2000

/**
 * The AI-drawn interactive graph card (tool_json thin ref -> hydrate by id).
 * Renders BOTH kinds — `graph.kind` from the GET (DB truth, written by the
 * render tool) picks the constructor: '2d' -> GraphingCalculator,
 * '3d' -> Calculator3D. Everything else is the shared official API.
 *
 * Render path (official six-step sequence):
 * 1. construct with FIXED instance options (product decisions, never AI's);
 * 2/3/4. user-edited `state` present -> setState(blob); otherwise translate
 *    the AI params into updateSettings (+ setMathBounds, 2D only) +
 *    setExpressions;
 * 5. setDefaultState(AI translation) — the reset button always returns to
 *    the AI original, not the user's last edit;
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
        if (graph.kind === '3d' && typeof desmos.Calculator3D !== 'function') {
          // 3D availability is per API key (Desmos.enabledFeatures).
          setSetupError('当前 Desmos API key 未启用 3D 计算器')
          return
        }
        calculator =
          graph.kind === '3d'
            ? desmos.Calculator3D(element, CALCULATOR_OPTIONS)
            : desmos.GraphingCalculator(element, CALCULATOR_OPTIONS)

        const applyAiParams = () => {
          if (!calculator) return
          if (graph.kind === '3d') {
            const aiParams = graph.aiParams as AiGraph3DParams
            calculator.updateSettings(toGraphSettings3D(aiParams))
            calculator.setExpressions(toExpressionStates3D(aiParams))
            return
          }
          const aiParams = graph.aiParams as AiGraphParams
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
