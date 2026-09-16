import { useCallback, useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import type { DocBlock, BlockIn } from './types'

interface TipTapNode {
  type: string
  content?: TipTapNode[]
  attrs?: Record<string, unknown>
  text?: string
}

// DocBlock.content 是 Record<string, unknown>，取值一律显式收窄。
// 别用 `?? ''`：`unknown ?? ''` 的类型是 `{} | string` 而不是 `string`，
// 塞给 TipTap 的 JSONContent 直接编译不过 —— 而且 TS 只报第一个不合法的联合成员，
// 把同文件里其它几处一样的错一起藏住了（构建就是被这里卡住的）。
function str(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function num(value: unknown, fallback: number): number {
  return typeof value === 'number' ? value : fallback
}

/**
 * 把一个节点子树里的**全部**文字拼起来。
 *
 * 为什么不能取 `content?.[0]?.text`：TipTap 里**带格式的文字会被拆成多个 text 节点** ——
 * `hello **world**` 存成 `[{text:'hello '},{text:'world',marks:[bold]}]`。
 * 只取第 0 个，用户看到的加粗部分在保存时就悄悄没了，刷新才发现。
 * 这里保证「一个字都不丢」；**格式（marks）后端的块模型是纯文本，暂不入库**。
 */
function flattenNodes(nodes: TipTapNode[] | undefined): string {
  return (nodes ?? [])
    .map((node) =>
      typeof node.text === 'string' ? node.text : flattenNodes(node.content)
    )
    .join('')
}

/** Convert backend DocBlock[] → TipTap JSON doc. */
function blocksToTipTap(blocks: DocBlock[]) {
  const content = blocks.map((b) => {
    switch (b.type) {
      case 'heading':
        return {
          type: 'heading',
          attrs: { level: num(b.content.level, 1) },
          content: [{ type: 'text', text: str(b.content.text) }],
        }
      case 'list': {
        const items = (b.content.items ?? []) as string[]
        const listType = b.content.ordered ? 'orderedList' : 'bulletList'
        return {
          type: listType,
          content: items.map((text: string) => ({
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
          })),
        }
      }
      case 'todo': {
        const items = (b.content.items ?? []) as { text: string; checked: boolean }[]
        return {
          type: 'taskList',
          content: items.map((item) => ({
            type: 'taskItem',
            attrs: { checked: item.checked },
            content: [{ type: 'paragraph', content: [{ type: 'text', text: item.text }] }],
          })),
        }
      }
      case 'code':
        return {
          type: 'codeBlock',
          attrs: { language: str(b.content.language) || null },
          content: [{ type: 'text', text: str(b.content.code) }],
        }
      case 'quote':
        return {
          type: 'blockquote',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: str(b.content.text) }],
            },
          ],
        }
      case 'divider':
        return { type: 'horizontalRule' }
      case 'image':
        return {
          type: 'image',
          attrs: {
            src: str(b.content.src),
            alt: str(b.content.alt),
          },
        }
      case 'paragraph':
      default: {
        const text = str(b.content.text)
        return {
          type: 'paragraph',
          content: text ? [{ type: 'text', text }] : [],
        }
      }
    }
  })
  return { type: 'doc', content }
}

/** Convert TipTap JSON doc → backend BlockIn[]. */
function tipTapToBlocks(editorJSON: { content?: TipTapNode[] }): BlockIn[] {
  if (!editorJSON?.content) return []
  const blocks: BlockIn[] = []
  let pos = 0

  for (const node of editorJSON.content) {
    const base = { position: pos++, meta: null }
    switch (node.type) {
      case 'heading':
        blocks.push({
          ...base,
          id: null,
          type: 'heading',
          content: {
            text: flattenNodes(node.content),
            level: num(node.attrs?.level, 1),
          },
        })
        break
      case 'bulletList':
      case 'orderedList':
        blocks.push({
          ...base,
          id: null,
          type: 'list',
          content: {
            items: (node.content ?? []).map((li) => flattenNodes(li.content)),
            ordered: node.type === 'orderedList',
          },
        })
        break
      case 'taskList':
        blocks.push({
          ...base,
          id: null,
          type: 'todo',
          content: {
            items: (node.content ?? []).map((ti) => ({
              text: flattenNodes(ti.content),
              checked: ti.attrs?.checked === true,
            })),
          },
        })
        break
      case 'codeBlock':
        blocks.push({
          ...base,
          id: null,
          type: 'code',
          content: {
            code: flattenNodes(node.content),
            language: str(node.attrs?.language) || null,
          },
        })
        break
      case 'blockquote':
        blocks.push({
          ...base,
          id: null,
          type: 'quote',
          content: {
            // 引用块里的多个段落用换行拼回去：后端 text 是单个字符串，
            // 直接 join('') 会把两段粘成一句，读起来就变了。
            text: (node.content ?? [])
              .map((paragraph) => flattenNodes(paragraph.content))
              .join('\n'),
          },
        })
        break
      case 'horizontalRule':
        blocks.push({ ...base, id: null, type: 'divider', content: {} })
        break
      case 'image':
        blocks.push({
          ...base,
          id: null,
          type: 'image',
          content: {
            src: str(node.attrs?.src),
            alt: str(node.attrs?.alt),
          },
        })
        break
      case 'paragraph':
      default:
        blocks.push({
          ...base,
          id: null,
          type: 'paragraph',
          content: { text: flattenNodes(node.content) },
        })
        break
    }
  }
  return blocks
}

export interface DocEditorProps {
  initialBlocks: DocBlock[]
  onSave: (blocks: BlockIn[]) => void
  disabled?: boolean
}

type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'

export function DocEditor({ initialBlocks, onSave, disabled }: DocEditorProps) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedJSONRef = useRef<string>('')

  const scheduleSave = useCallback(
    (e: Editor) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        const json = e.getJSON() as { content?: TipTapNode[] }
        const newJSON = JSON.stringify(json)
        if (newJSON === lastSavedJSONRef.current) return
        lastSavedJSONRef.current = newJSON
        setSaveStatus('saving')
        try {
          onSave(tipTapToBlocks(json))
          setSaveStatus('saved')
          setTimeout(() => setSaveStatus('idle'), 2000)
        } catch {
          setSaveStatus('error')
        }
      }, 2000)
    },
    [onSave]
  )

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({ placeholder: 'Start writing...' }),
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: blocksToTipTap(initialBlocks),
    editable: !disabled,
    onUpdate: ({ editor: e }) => {
      const json = JSON.stringify(e.getJSON())
      if (json !== lastSavedJSONRef.current) {
        setSaveStatus('dirty')
        scheduleSave(e)
      }
    },
  })

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  if (!editor) return null

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-zinc-200/80 px-4 py-1.5">
        <MenuBar editor={editor} />
        <div className="ml-auto flex items-center gap-2 text-xs text-zinc-400">
          {saveStatus === 'dirty' && <span>Unsaved changes</span>}
          {saveStatus === 'saving' && <span>Saving...</span>}
          {saveStatus === 'saved' && (
            <span className="text-emerald-500">Saved</span>
          )}
          {saveStatus === 'error' && (
            <span className="text-red-500">Save failed</span>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-8">
          <EditorContent editor={editor} className="prose prose-zinc max-w-none" />
        </div>
      </div>
    </div>
  )
}

function MenuBar({ editor }: { editor: Editor }) {
  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
          editor.isActive('bold')
            ? 'bg-zinc-200 text-zinc-900'
            : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
        }`}
      >
        B
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`rounded px-2 py-1 text-xs font-medium italic transition-colors ${
          editor.isActive('italic')
            ? 'bg-zinc-200 text-zinc-900'
            : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
        }`}
      >
        I
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={`rounded px-2 py-1 text-xs font-medium line-through transition-colors ${
          editor.isActive('strike')
            ? 'bg-zinc-200 text-zinc-900'
            : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
        }`}
      >
        S
      </button>
      <div className="mx-1 h-4 w-px bg-zinc-200" />
      {[1, 2, 3].map((level) => (
        <button
          key={level}
          type="button"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 }).run()
          }
          className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
            editor.isActive('heading', { level })
              ? 'bg-zinc-200 text-zinc-900'
              : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
          }`}
        >
          H{level}
        </button>
      ))}
      <div className="mx-1 h-4 w-px bg-zinc-200" />
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`rounded px-2 py-1 text-xs transition-colors ${
          editor.isActive('bulletList')
            ? 'bg-zinc-200 text-zinc-900'
            : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
        }`}
      >
        • List
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`rounded px-2 py-1 text-xs transition-colors ${
          editor.isActive('orderedList')
            ? 'bg-zinc-200 text-zinc-900'
            : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
        }`}
      >
        1. List
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        className={`rounded px-2 py-1 text-xs transition-colors ${
          editor.isActive('taskList')
            ? 'bg-zinc-200 text-zinc-900'
            : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
        }`}
      >
        ☐ Todo
      </button>
      <div className="mx-1 h-4 w-px bg-zinc-200" />
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        className={`rounded px-2 py-1 text-xs transition-colors ${
          editor.isActive('codeBlock')
            ? 'bg-zinc-200 text-zinc-900'
            : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
        }`}
      >
        &lt;/&gt;
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={`rounded px-2 py-1 text-xs transition-colors ${
          editor.isActive('blockquote')
            ? 'bg-zinc-200 text-zinc-900'
            : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
        }`}
      >
        " Quote
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        className="rounded px-2 py-1 text-xs text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
      >
        —
      </button>
    </div>
  )
}
