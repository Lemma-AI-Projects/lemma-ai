import { useEffect, useRef, useState } from 'react'
import { Wand2 } from 'lucide-react'
import { Tldraw, getSnapshot, loadSnapshot, type Editor } from 'tldraw'
import 'tldraw/tldraw.css'
import './board.css'
import { useBoardSnapshotQuery, saveBoardSnapshot } from './boardApi'
import { apiClient } from '@/lib/apiClient'
import { isNotFoundError } from '@/lib/apiUtils'
import { boardShapeUtils } from './shapes'
import { SemanticPanel } from './semantic/SemanticPanel'
import { analyzeRegion } from './semantic/analyzer'
import { projectShapesToRegion, type AdapterBinding } from './semantic/tldraw-adapter'
import { generateSuggestions } from './semantic/suggestions'
import { applySuggestion, undoSnapshot, type PositionSnapshot } from './semantic/applier'
import { buildBoardSemanticRequest, mergeSemanticEnrichment, type BoardSemanticResponse } from './semantic/llm'
import type { BoardAnalysisResult, SemanticCluster } from './semantic/types'

/** 语义整理按钮需要的最少选中形状数 */
const MIN_SELECTED_FOR_ANALYSIS = 2

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

// 旧版（后端持久化前）画板仅存本机 localStorage 的 key，用于一次性迁移不丢图
const LEGACY_BOARD_KEY = (learnSpaceId: string) => `lemma-board-${learnSpaceId}`

/**
 * Board 画布（learn space 的 Board 组件，正式版）
 * - 数据按 learn space 隔离：快照经后端 /projects/{id}/board/snapshot 持久化
 *   （P0：摆脱单一 localStorage，支持多端/分享；后端 IDOR 保证归属），
 *   前端以服务器为唯一权威，挂载时拉取 / 操作防抖 400ms 写入。
 * - 保存合并防乱序：同一时刻只允许一个 PUT 在途，队列有更新则落定后再补发，
 *   避免后写先到的旧快照覆盖新快照。
 * - 保存失败可见（P1）：失败不再是静默降级，短暂提示「保存失败」，成功提示
 *   「已保存」并自动隐藏；不阻塞用户操作。
 * - 语义整理（S2.4）：右上工具条 → 分析选中形状 → 面板显示质量/问题/建议 → 显式应用/撤销
 * - 语义细化（S3）：规则结果先行展示，后台并发调后端 LLM → 成功则原位更新簇名/意图
 * - 由父级用 key={learnSpaceId} 渲染，保证空间切换时整体重挂载
 */
export function BoardCanvas({
  learnSpaceId,
  fullBleed = false,
}: {
  learnSpaceId: string
  fullBleed?: boolean
}) {
  const editorRef = useRef<Editor | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // 保存队列合并：同一刻至多一个 PUT 在途；dirty 记录在此期间的待存更新
  const savingRef = useRef(false)
  const dirtyRef = useRef(false)
  // 快照只 hydration 一次（挂载拉取后填充），避免 query 重取重复覆盖用户当前操作
  const hydratedRef = useRef(false)

  const [saveState, setSaveState] = useState<SaveState>('idle')

  // 语义整理状态（S2.4）
  const [selectedCount, setSelectedCount] = useState(0)
  const [analysisResult, setAnalysisResult] = useState<BoardAnalysisResult | null>(null)
  const [appliedSuggestionId, setAppliedSuggestionId] = useState<string | null>(null)
  // S3：LLM 增强结果（后到，原位更新）
  const [llmClusters, setLlmClusters] = useState<SemanticCluster[] | null>(null)
  const [llmIntentDescription, setLlmIntentDescription] = useState<string | null>(null)
  const [llmEnriched, setLlmEnriched] = useState(false)
  const undoSnapshotRef = useRef<PositionSnapshot | null>(null)
  const analysisInFlightRef = useRef(false)
  const llmInFlightRef = useRef(false)

  const snapshotQuery = useBoardSnapshotQuery(learnSpaceId)

  /** 短暂展示保存状态后自动隐藏（成功/失败都非侵入） */
  const showSaveState = (state: Exclude<SaveState, 'idle' | 'saving'>) => {
    setSaveState(state)
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    hideTimerRef.current = setTimeout(() => setSaveState('idle'), 2600)
  }

  /** 把当前画布写回后端。notify=false 时（卸载尽人力）不触碰状态，避免卸载后 setState */
  const flushSave = (editor: Editor, notify: boolean) => {
    if (savingRef.current) {
      dirtyRef.current = true
      return
    }
    savingRef.current = true
    dirtyRef.current = false
    const snapshot = getSnapshot(editor.store) as unknown as Record<string, unknown>
    if (notify) setSaveState('saving')
    saveBoardSnapshot(learnSpaceId, snapshot)
      .then(() => {
        if (notify) showSaveState('saved')
      })
      .catch(() => {
        if (notify) showSaveState('error')
      })
      .finally(() => {
        savingRef.current = false
        // 队列在途期间有新编辑 → 补发一次，保证最新画布最终落库
        if (dirtyRef.current && editorRef.current) {
          flushSave(editorRef.current, notify)
        }
      })
  }

  /**
   * 把权威快照灌入画布，只执行一次。来源优先级（服务器为唯一权威）：
   * 1. 服务器有快照 → 用它（换机/多端正确拿到）。
   * 2. 服务器 404（从未存过）且有旧版本地库存 → 一次性迁移：加载并上传后删副本。
   * 3. 服务器网络错误 → 离线兜底读本地，但保留副本（不删），下次成功再迁。
   */
  const tryHydrate = () => {
    const editor = editorRef.current
    if (!editor || hydratedRef.current) return
    if (snapshotQuery.isLoading) return
    hydratedRef.current = true

    const safeGetLocal = (): string | null => {
      try {
        return localStorage.getItem(LEGACY_BOARD_KEY(learnSpaceId))
      } catch {
        return null
      }
    }
    const safeRemoveLocal = () => {
      try {
        localStorage.removeItem(LEGACY_BOARD_KEY(learnSpaceId))
      } catch {
        // ignore
      }
    }

    if (snapshotQuery.data) {
      try {
        loadSnapshot(editor.store, snapshotQuery.data.snapshot as never)
      } catch {
        // 快照损坏则保留空白画布
      }
      return
    }

    const raw = safeGetLocal()
    if (!raw) return

    const local = JSON.parse(raw) as never
    if (isNotFoundError(snapshotQuery.error)) {
      // 服务器无该空间快照 → 旧版本地副本一次性迁移，权威移交服务器
      try {
        loadSnapshot(editor.store, local)
        flushSave(editor, false)
        safeRemoveLocal()
      } catch {
        // 损坏快照则忽略，保留空白画布
      }
    } else {
      // 网络错误：离线读到本地，不删除副本，等下次成功再决定
      try {
        loadSnapshot(editor.store, local)
      } catch {
        // 损坏则忽略
      }
    }
  }

  // 服务器查询 settle 或编辑器就绪后尝试填充（两者先后到达皆收敛到 tryHydrate）
  useEffect(() => {
    tryHydrate()
  })

  // 卸载时尽人力：若无在途保存，直接补发一次（不触碰状态）
  useEffect(() => {
    return () => {
      const editor = editorRef.current
      if (editor && !savingRef.current) flushSave(editor, false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** 收集选中形状的语义区域并分析（S2.2/S2.4 主流程） */
  const runSemanticAnalysis = (editor: Editor) => {
    if (analysisInFlightRef.current) return
    analysisInFlightRef.current = true
    try {
      const selected = editor.getSelectedShapes()
      if (selected.length < MIN_SELECTED_FOR_ANALYSIS) return

      const bindings: AdapterBinding[] = []
      for (const shape of selected) {
        for (const b of editor.getBindingsInvolvingShape(shape.id)) {
          if (!selected.some((s) => s.id === b.fromId || s.id === b.toId)) continue
          if (b.fromId !== shape.id && b.toId !== shape.id) continue
          const fromId = b.fromId
          const toId = b.toId
          if (fromId && toId) bindings.push({ fromId, toId })
        }
      }

      const region = projectShapesToRegion({
        shapes: selected.map((s) => ({
          id: s.id,
          type: s.type,
          x: s.x,
          y: s.y,
          rotation: s.rotation,
          isLocked: s.isLocked,
          props: s.props as Record<string, unknown>,
        })),
        bindings,
      })

      const analysis = analyzeRegion(region)
      const suggestions = generateSuggestions(region, analysis)
      setAnalysisResult({
        region,
        quality: analysis.quality,
        clusters: analysis.clusters,
        intent: analysis.intent,
        suggestions,
        processingTimeMs: 0,
        timestamp: new Date().toISOString(),
      })
      setLlmClusters(null)
      setLlmIntentDescription(null)
      setLlmEnriched(false)
      setAppliedSuggestionId(null)
      undoSnapshotRef.current = null

      if (!llmInFlightRef.current) {
        llmInFlightRef.current = true
        const request = buildBoardSemanticRequest(region.shapes, analysis.clusters)
        apiClient
          .post<BoardSemanticResponse | null>('/api/v1/board/semantic', request)
          .then(({ data }) => {
            if (data) {
              const merged = mergeSemanticEnrichment(analysis.clusters, data)
              setLlmClusters(merged.enrichedClusters)
              setLlmIntentDescription(merged.intentDescription)
              setLlmEnriched(true)
            }
          })
          .catch(() => {
            // LLM 细化失败 → 保持规则结果（降级透明，无用户打扰）
          })
          .finally(() => {
            llmInFlightRef.current = false
          })
      }
    } finally {
      analysisInFlightRef.current = false
    }
  }

  /** 显式应用一条建议（红线：永不自动应用） */
  const handleApply = (editor: Editor, suggestionId: string) => {
    if (!analysisResult) return
    const suggestion = analysisResult.suggestions.find((s) => s.id === suggestionId)
    if (!suggestion) return
    const provider = {
      getShapePosition: (id: string) => {
        const shape = editor.getShape(id as never)
        return shape ? { x: shape.x, y: shape.y } : null
      },
      updateShapes: (partials: Array<{ id: string; x: number; y: number } | null | undefined>) => {
        editor.updateShapes(
          partials
            .filter((p): p is { id: string; x: number; y: number } => Boolean(p))
            .map((p) => ({ id: p.id as never, type: 'knowledgeCard' as const, x: p.x, y: p.y }))
        )
      },
    }
    undoSnapshotRef.current = applySuggestion(suggestion, provider)
    setAppliedSuggestionId(suggestionId)
  }

  /** 撤销上次应用（快照还原） */
  const handleUndo = (editor: Editor) => {
    const snapshot = undoSnapshotRef.current
    if (!snapshot) return
    const provider = {
      getShapePosition: () => null,
      updateShapes: (partials: Array<{ id: string; x: number; y: number } | null | undefined>) => {
        editor.updateShapes(
          partials
            .filter((p): p is { id: string; x: number; y: number } => Boolean(p))
            .map((p) => ({ id: p.id as never, type: 'knowledgeCard' as const, x: p.x, y: p.y }))
        )
      },
    }
    undoSnapshot(snapshot, provider)
    undoSnapshotRef.current = null
    setAppliedSuggestionId(null)
  }

  const saveStateLabel: Record<Exclude<SaveState, 'idle' | 'saving'>, string> = {
    saved: '已保存',
    error: '保存失败',
  }
  const saveStateClass: Record<Exclude<SaveState, 'idle' | 'saving'>, string> = {
    saved: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    error: 'text-red-700 bg-red-50 border-red-200',
  }

  return (
    <div
      className={
        fullBleed
          ? // 全铺变体：Learn space 工作台的底层画布，无卡片化外壳，填满父容器
            'lemma-board relative h-full w-full overflow-hidden bg-zinc-50'
          : // 卡片变体（BoardDemoPage 等嵌入场景）
            'lemma-board relative overflow-hidden rounded-xl border border-zinc-200/80 bg-zinc-50'
      }
      style={
        fullBleed
          ? undefined
          : { height: 'min(60vh, 640px)', minHeight: 420 }
      }
    >
      <Tldraw
        shapeUtils={boardShapeUtils}
        onMount={(editor) => {
          editorRef.current = editor
          // 服务器快照若已 settle 则填充（data 晚到时由上方 effect 补 tryHydrate）
          tryHydrate()
          // 用户操作 → 防抖自动保存 + 选中数同步
          editor.store.listen(
            () => {
              if (saveTimerRef.current) {
                clearTimeout(saveTimerRef.current)
              }
              saveTimerRef.current = setTimeout(() => {
                flushSave(editor, true)
              }, 400)
            },
            { source: 'user' }
          )
          const syncSelection = () => {
            setSelectedCount(editor.getSelectedShapes().length)
          }
          editor.store.listen(syncSelection, { source: 'user' })
        }}
      />

      {/* 语义整理工具条（S2.4）：右上角，选中 ≥2 形状才可用 */}
      {selectedCount >= MIN_SELECTED_FOR_ANALYSIS && !analysisResult ? (
        <button
          type="button"
          onClick={() => {
            const editor = editorRef.current
            if (editor) runSemanticAnalysis(editor)
          }}
          className={`absolute z-[90] flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 ${
            // fullBleed 下让出顶部悬浮 chrome（标题+tab 带），避免被其 pointer-events 头带遮住/截获点击
            fullBleed ? 'right-4 top-[86px]' : 'right-3 top-3'
          }`}
        >
          <Wand2 className="size-3.5" />
          语义整理
        </button>
      ) : null}

      {/* 结果面板（S2.4） */}
      {analysisResult ? (
        <SemanticPanel
          result={{
            ...analysisResult,
            // S3：LLM 增强结果后到 → 原位覆盖规则簇（不重算坐标）
            clusters: llmClusters ?? analysisResult.clusters,
          }}
          appliedSuggestionId={appliedSuggestionId}
          llmIntentDescription={llmIntentDescription}
          llmEnriched={llmEnriched}
          onApply={(suggestion) => {
            const editor = editorRef.current
            if (editor) handleApply(editor, suggestion.id)
          }}
          onUndo={() => {
            const editor = editorRef.current
            if (editor) handleUndo(editor)
          }}
          onClose={() => {
            setAnalysisResult(null)
            setAppliedSuggestionId(null)
            undoSnapshotRef.current = null
          }}
          positionClass={fullBleed ? 'right-4 top-[86px]' : 'right-3 top-3'}
        />
      ) : null}

      {/* 保存状态指示（P1）：失败/成功短暂可见并自动隐藏，非侵入不阻塞 */}
      {(saveState === 'saved' || saveState === 'error') && (
        <div
          className={`pointer-events-none absolute bottom-3 left-3 z-[60] flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium shadow-sm ${saveStateClass[saveState]}`}
          role="status"
          aria-live="polite"
        >
          {saveStateLabel[saveState]}
        </div>
      )}
    </div>
  )
}