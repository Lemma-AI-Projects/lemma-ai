import { useRef } from 'react'
import { Tldraw, getSnapshot, loadSnapshot, type Editor } from 'tldraw'
import 'tldraw/tldraw.css'
import { boardShapeUtils } from './shapes'

const SNAPSHOT_KEY = 'lemma-board-demo-snapshot'

/**
 * [board-demo] Board 底座验证页面（执行计划 E0.1 + E0.2 + E0.3）
 * 临时调试入口：
 * - E0.1 最小无限画布（tldraw v5）
 * - E0.2 自定义 shape：KnowledgeCard（文本+KaTeX 公式+掌握度）/ ConceptNode
 * - E0.3 快照存取：保存 → localStorage，加载 → 恢复（刷新不丢）
 * E0 验证完成后随路由整体移除，或并入 learn space 正式页面。
 */
export function BoardDemoPage() {
  const editorRef = useRef<Editor | null>(null)

  const handleSave = () => {
    const editor = editorRef.current
    if (!editor) return
    const snapshot = getSnapshot(editor.store)
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot))
  }

  const handleLoad = () => {
    const editor = editorRef.current
    if (!editor) return
    try {
      const raw = localStorage.getItem(SNAPSHOT_KEY)
      if (raw) {
        loadSnapshot(editor.store, JSON.parse(raw) as never)
      }
    } catch {
      // 快照损坏则忽略，留空白画布
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--color-background-tertiary, #fafafa)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          borderBottom: '1px solid rgba(0,0,0,0.08)',
          background: '#fff',
          fontSize: 13,
          zIndex: 100,
        }}
      >
        <span style={{ fontWeight: 500 }}>Board Demo · E0.1-0.3</span>
        <button style={{ marginLeft: 'auto' }} onClick={handleSave}>
          保存快照
        </button>
        <button onClick={handleLoad}>加载快照</button>
      </div>
      <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
        <Tldraw
          shapeUtils={boardShapeUtils}
          onMount={(editor) => {
            editorRef.current = editor
            // E0.3：挂载时自动恢复上次快照（刷新不丢）
            try {
              const raw = localStorage.getItem(SNAPSHOT_KEY)
              if (raw) {
                loadSnapshot(editor.store, JSON.parse(raw) as never)
              }
            } catch {
              // 快照损坏则忽略，留空白画布
            }
          }}
        />
      </div>
    </div>
  )
}
