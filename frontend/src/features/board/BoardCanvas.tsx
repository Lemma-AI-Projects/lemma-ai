import { useEffect, useRef } from 'react'
import { Tldraw, getSnapshot, loadSnapshot, type Editor } from 'tldraw'
import 'tldraw/tldraw.css'
import './board.css'
import { boardShapeUtils } from './shapes'

const boardKey = (learnSpaceId: string) => `lemma-board-${learnSpaceId}`

/**
 * Board 画布（learn space 的 Board 组件，正式版）
 * - 数据按 learn space 隔离：localStorage key = lemma-board-{learnSpaceId}
 *   （E1 后端持久化前的落点；后端 boards 表接入后换成 API 存取）
 * - 自动保存：用户操作防抖 400ms 写快照，卸载时 flush 一次（不丢尾帧）
 * - 挂载时自动恢复该空间的快照（刷新不丢）
 * - UI 已魔改为 Lemma zinc 风格（board.css 覆盖 tldraw 主题变量）
 * - 由父级用 key={learnSpaceId} 渲染，保证空间切换时整体重挂载
 */
export function BoardCanvas({ learnSpaceId }: { learnSpaceId: string }) {
  const editorRef = useRef<Editor | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  return (
    <div
      className="lemma-board overflow-hidden rounded-xl border border-zinc-200/80 bg-zinc-50"
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
          // 用户操作 → 防抖自动保存
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
        }}
      />
    </div>
  )
}
