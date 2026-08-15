import { useEffect, useState } from 'react'
import {
  Bold,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Redo2,
  Save,
  Strikethrough,
  Undo2,
  Unplug,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'

import { cn } from '@/lib/utils'
import {
  useNoteContent,
  useUpdateNoteContent,
} from '@/features/knowledge/knowledgeBaseApi'

import './note-editor.css'

/** 工具条按钮（onMouseDown preventDefault：避免按钮聚焦致编辑器失焦） */
function ToolbarButton({
  active,
  onClick,
  disabled,
  title,
  children,
}: {
  active?: boolean
  onClick: () => void
  disabled?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        'rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-40',
        active && 'bg-indigo-50 text-indigo-600 hover:text-indigo-600'
      )}
    >
      {children}
    </button>
  )
}

/**
 * 笔记编辑器（K5.3：tiptap 富文本，Trilium text 笔记内容 = HTML）。
 * - 读：useNoteContent（GET /notes/:id/blob）
 * - 写：useUpdateNoteContent（PUT /notes/:id/data），脏检查 + Ctrl/Cmd+S + 手动保存
 * - fail-open：加载失败/门控关 → 「内容不可用」（树照常，不崩）；isStubbed → 同步裁剪提示
 */
export function NoteEditor({
  noteId,
  title,
}: {
  noteId: string
  title: string
}) {
  const { t } = useTranslation()
  const blob = useNoteContent(noteId, true)
  const save = useUpdateNoteContent(noteId)
  const [dirty, setDirty] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({
        placeholder: t('knowledge.editorPlaceholder', '开始输入…'),
      }),
    ],
    content: '',
    immediatelyRender: false,
    onUpdate: () => setDirty(true),
  })

  // 内容加载 / 切换笔记 → setContent（emitUpdate:false 不置脏）
  useEffect(() => {
    if (!editor) return
    const html = blob.data?.content ?? ''
    if (editor.getHTML() !== html) {
      editor.commands.setContent(html, { emitUpdate: false })
      setDirty(false)
    }
  }, [editor, blob.data?.content, noteId])

  // 切换笔记 → 清脏
  useEffect(() => {
    setDirty(false)
  }, [noteId])

  // Ctrl/Cmd+S 保存
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (dirty && editor && !save.isPending) {
          save.mutate(editor.getHTML())
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [dirty, editor, save])

  const toggleLink = () => {
    if (!editor) return
    const url = window.prompt(
      t('knowledge.editorLinkPrompt', '链接地址'),
      editor.getAttributes('link').href ?? 'https://'
    )
    if (url === null) return
    if (url === '') {
      editor.chain().focus().unsetLink().run()
    } else {
      editor.chain().focus().setLink({ href: url }).run()
    }
  }

  const unconnected = blob.isError
  const loading = blob.isLoading
  const stubbed = blob.data?.isStubbed === true

  return (
    <div className="flex h-full flex-col">
      {/* 标题 + 保存栏 */}
      <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-3">
        <h1 className="min-w-0 truncate text-[15px] font-medium text-zinc-800">
          {title || '(untitled)'}
        </h1>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'text-[11px]',
              dirty ? 'text-amber-500' : 'text-zinc-300'
            )}
          >
            {save.isPending
              ? t('knowledge.editorSaving', '保存中…')
              : dirty
                ? t('knowledge.editorUnsaved', '未保存')
                : t('knowledge.editorSaved', '已保存')}
          </span>
          <button
            type="button"
            disabled={!dirty || save.isPending}
            onClick={() => editor && save.mutate(editor.getHTML())}
            className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-40"
          >
            {save.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Save className="size-3.5" />
            )}
            {t('knowledge.editorSave', '保存')}
          </button>
        </div>
      </div>

      {/* 工具条 */}
      {!unconnected && !loading && (
        <div className="flex flex-wrap items-center gap-0.5 border-b border-zinc-100 px-3 py-1.5">
          <ToolbarButton
            title={t('knowledge.editorBold', '加粗')}
            active={editor?.isActive('bold')}
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleBold().run()}
          >
            <Bold className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            title={t('knowledge.editorItalic', '斜体')}
            active={editor?.isActive('italic')}
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
          >
            <Italic className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            title={t('knowledge.editorStrike', '删除线')}
            active={editor?.isActive('strike')}
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleStrike().run()}
          >
            <Strikethrough className="size-4" />
          </ToolbarButton>
          <span className="mx-1 h-4 w-px bg-zinc-200" />
          <ToolbarButton
            title={t('knowledge.editorHeading1', '标题 1')}
            active={editor?.isActive('heading', { level: 1 })}
            disabled={!editor}
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 1 }).run()
            }
          >
            <Heading1 className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            title={t('knowledge.editorHeading2', '标题 2')}
            active={editor?.isActive('heading', { level: 2 })}
            disabled={!editor}
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 2 }).run()
            }
          >
            <Heading2 className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            title={t('knowledge.editorHeading3', '标题 3')}
            active={editor?.isActive('heading', { level: 3 })}
            disabled={!editor}
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 3 }).run()
            }
          >
            <Heading3 className="size-4" />
          </ToolbarButton>
          <span className="mx-1 h-4 w-px bg-zinc-200" />
          <ToolbarButton
            title={t('knowledge.editorBulletList', '无序列表')}
            active={editor?.isActive('bulletList')}
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
          >
            <List className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            title={t('knowledge.editorOrderedList', '有序列表')}
            active={editor?.isActive('orderedList')}
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            title={t('knowledge.editorCodeBlock', '代码块')}
            active={editor?.isActive('codeBlock')}
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
          >
            <Code2 className="size-4" />
          </ToolbarButton>
          <span className="mx-1 h-4 w-px bg-zinc-200" />
          <ToolbarButton
            title={t('knowledge.editorLink', '链接')}
            active={editor?.isActive('link')}
            disabled={!editor}
            onClick={toggleLink}
          >
            <Link2 className="size-4" />
          </ToolbarButton>
          <span className="mx-1 h-4 w-px bg-zinc-200" />
          <ToolbarButton
            title={t('knowledge.editorUndo', '撤销')}
            disabled={!editor}
            onClick={() => editor?.chain().focus().undo().run()}
          >
            <Undo2 className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            title={t('knowledge.editorRedo', '重做')}
            disabled={!editor}
            onClick={() => editor?.chain().focus().redo().run()}
          >
            <Redo2 className="size-4" />
          </ToolbarButton>
        </div>
      )}

      {/* 内容区 */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {unconnected ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-zinc-400">
            <Unplug className="size-5" />
            <p className="text-[12px]">
              {t('knowledge.editorUnavailable', '内容暂不可用（引擎未连接或未开启）')}
            </p>
          </div>
        ) : loading ? (
          <div className="space-y-3 p-6">
            <div className="h-4 w-2/5 animate-pulse rounded bg-zinc-100" />
            <div className="h-4 w-4/5 animate-pulse rounded bg-zinc-100" />
            <div className="h-4 w-3/5 animate-pulse rounded bg-zinc-100" />
          </div>
        ) : stubbed ? (
          <div className="flex h-full items-center justify-center text-[12px] text-zinc-400">
            {t('knowledge.editorStubbed', '该笔记内容未同步到本机')}
          </div>
        ) : (
          <EditorContent
            editor={editor}
            className="kb-note-editor mx-auto w-full max-w-[720px] px-6 py-5"
          />
        )}
      </div>
    </div>
  )
}
