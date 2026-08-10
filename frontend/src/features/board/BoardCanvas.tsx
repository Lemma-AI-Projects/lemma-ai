import { useEffect, useRef, useState } from 'react'
import { Wand2 } from 'lucide-react'
import { Tldraw, getSnapshot, loadSnapshot, type Editor } from 'tldraw'
import 'tldraw/tldraw.css'
import './board.css'
import { boardShapeUtils } from './shapes'
import { SemanticPanel } from './semantic/SemanticPanel'
import { analyzeRegion } from './semantic/analyzer'
import { projectShapesToRegion, type AdapterBinding } from './semantic/tldraw-adapter'
import { generateSuggestions } from './semantic/suggestions'
import { applySuggestion, undoSnapshot, type PositionSnapshot } from './semantic/applier'
import type { BoardAnalysisResult } from './semantic/types'

const boardKey = (learnSpaceId: string) => `lemma-board-${learnSpaceId}`
/** 语义整理按钮需要的最少选中形状数 */
const MIN_SELECTED_FOR_ANALYSIS = 2

/**
 * Board 画布（learn space 的 Board 组件，正式版）
 * - 数据按 learn space 隔离：localStorage key = lemma-board-{learnSpaceId}
 * - 自动保存：用户操作防抖 400ms 写快照，卸载时 flush 一次（不丢尾帧）
 * - 挂载时自动恢复该空间的快照（刷新不丢）
 * - UI 已魔改为 Lemma zinc 风格（board.css 覆盖 tldraw 主题变量）
 * - 语义整理（S2.4）：右上工具条 → 分析选中形状 → 面板显示质量/问题/建议 → 显式应用/撤销
 * - 由父级用 key={learnSpaceId} 渲染，保证空间切换时整体重挂载
 */
export function BoardCanvas({ learnSpaceId }: { learnSpaceId: string }) {
  const editorRef = useRef<Editor | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 语义整理状态（S2.4）
  const [selectedCount, setSelectedCount] = useState(0)
  const [analysisResult, setAnalysisResult] = useState<BoardAnalysisResult | null>(null)
  const [appliedSuggestionId, setAppliedSuggestionId] = useState<string | null>(null)
  const undoSnapshotRef = useRef<PositionSnapshot | null>(null)
  const analysisInFlightRef = useRef(false)

  const flushSave = (editor: Editor) => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
    try {
      const snapshot = getSnapshot(editor.store)
      localStorage.setItem(boardKey(learnSpaceId), JSON.stringify(snapshot))
    } catch {
      // localStorage 不可用/超限时静默降级（画布仍可用，只是不持久）
    }
  }

  // 卸载时 flush 一次，避免防抖尾帧丢失
  useEffect(() => {
    return () => {
      const editor = editorRef.current
      if (editor) flushSave(editor)
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
      setAppliedSuggestionId(null)
      undoSnapshotRef.current = null
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

  return (
    <div
      className="lemma-board relative overflow-hidden rounded-xl border border-zinc-200/80 bg-zinc-50"
      style={{ height: 'min(60vh, 640px)', minHeight: 420 }}
    >
      <Tldraw
        shapeUtils={boardShapeUtils}
        onMount={(editor) => {
          editorRef.current = editor
          // 恢复该 learn space 的快照
          try {
            const raw = localStorage.getItem(boardKey(learnSpaceId))
            if (raw) {
              loadSnapshot(editor.store, JSON.parse(raw) as never)
            }
          } catch {
            // 快照损坏则忽略，留空白画布
          }
          // 用户操作 → 防抖自动保存 + 选中数同步
          editor.store.listen(
            () => {
              if (saveTimerRef.current) {
                clearTimeout(saveTimerRef.current)
              }
              saveTimerRef.current = setTimeout(() => {
                flushSave(editor)
              }, 400)
            },
            { source: 'user' }
          )
          // 选中变化 → 更新工具条状态（选择是用户的显式意图，不作隐藏门槛）
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
          className="absolute right-3 top-3 z-[90] flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50"
        >
          <Wand2 className="size-3.5" />
          语义整理
        </button>
      ) : null}

      {/* 结果面板（S2.4） */}
      {analysisResult ? (
        <SemanticPanel
          result={analysisResult}
          appliedSuggestionId={appliedSuggestionId}
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
        />
      ) : null}
    </div>
  )
}
