import { useEffect, useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Code2,
  FileText,
  FolderTree,
  Image as ImageIcon,
  KanbanSquare,
  Loader2,
  Network,
  Pencil,
  PenTool,
  Plus,
  Search,
  Table2,
  Trash2,
  Unplug,
  X,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'
import {
  useNotesTree,
  useCreateNote,
  useChangeTitle,
  useDeleteNote,
  useQuickSearch,
  type KbTreeNode,
} from '@/features/knowledge/knowledgeBaseApi'

/** Trilium 笔记类型 → 图标（常见类型；未知回退 FileText） */
function NoteTypeIcon({ type, className }: { type: string; className?: string }) {
  const Icon =
    type === 'code'
      ? Code2
      : type === 'image'
        ? ImageIcon
        : type === 'canvas'
          ? PenTool
          : type === 'board'
            ? KanbanSquare
            : type === 'mindMap'
              ? Network
              : type === 'spreadsheet'
                ? Table2
                : FileText
  return <Icon className={className} />
}

/** 树面板操作状态（K4.2：新建/改名/删除三态互斥） */
interface PanelOps {
  kind: 'rename' | 'create' | 'delete'
  /** 目标节点（rename/create/delete 都作用于一个节点） */
  noteId: string
  /** rename 预填标题 */
  title?: string
}

interface TreeNodeProps {
  node: KbTreeNode
  depth: number
  expanded: Set<string>
  onToggle: (noteId: string) => void
  onSelect: (note: { noteId: string; title: string }) => void
  ops: PanelOps | null
  setOps: (ops: PanelOps | null) => void
  createNote: ReturnType<typeof useCreateNote>
  changeTitle: ReturnType<typeof useChangeTitle>
  deleteNote: ReturnType<typeof useDeleteNote>
}

function TreeNode({
  node,
  depth,
  expanded,
  onToggle,
  onSelect,
  ops,
  setOps,
  createNote,
  changeTitle,
  deleteNote,
}: TreeNodeProps) {
  const { t } = useTranslation()
  const hasChildren = node.children.length > 0
  const isOpen = expanded.has(node.noteId)
  const isBusy =
    (ops?.kind === 'create' && ops.noteId === node.noteId && createNote.isPending) ||
    (ops?.kind === 'rename' && ops.noteId === node.noteId && changeTitle.isPending) ||
    (ops?.kind === 'delete' && ops.noteId === node.noteId && deleteNote.isPending)
  const opError =
    (ops?.kind === 'create' && ops.noteId === node.noteId && createNote.isError
      ? createNote.error
      : null) ??
    (ops?.kind === 'rename' && ops.noteId === node.noteId && changeTitle.isError
      ? changeTitle.error
      : null) ??
    (ops?.kind === 'delete' && ops.noteId === node.noteId && deleteNote.isError
      ? deleteNote.error
      : null)
  const [draft, setDraft] = useState('')

  const closeOps = () => setOps(null)

  const editing =
    ops?.kind === 'create' && ops.noteId === node.noteId
      ? 'create'
      : ops?.kind === 'rename' && ops.noteId === node.noteId
        ? 'rename'
        : null

  const submitDraft = () => {
    if (!editing) return
    const title = draft.trim()
    if (ops?.kind === 'rename' && title === (ops.title ?? '')) {
      closeOps() // 未修改 → 直接关闭
      return
    }
    if (!title) return
    if (ops?.kind === 'create') {
      createNote.mutate(
        { parentNoteId: node.noteId, title },
        { onSuccess: closeOps }
      )
    } else if (ops?.kind === 'rename') {
      changeTitle.mutate(
        { noteId: node.noteId, title },
        { onSuccess: closeOps }
      )
    }
  }

  return (
    <div>
      <div
        className={cn(
          'group flex items-center gap-1.5 rounded-md py-1 pr-1.5 pl-2 text-[13px] text-zinc-700 transition-colors hover:bg-zinc-100',
          editing && 'bg-zinc-100'
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        <button
          type="button"
          onClick={() => {
            onSelect({ noteId: node.noteId, title: node.title ?? '' })
            if (hasChildren) onToggle(node.noteId)
          }}
          className={cn(
            'flex min-w-0 flex-1 items-center gap-1.5 text-left',
            !hasChildren && 'cursor-default'
          )}
        >
          {hasChildren ? (
            isOpen ? (
              <ChevronDown className="size-3.5 shrink-0 text-zinc-400" />
            ) : (
              <ChevronRight className="size-3.5 shrink-0 text-zinc-400" />
            )
          ) : (
            <span className="size-3.5 shrink-0" />
          )}
          <NoteTypeIcon type={node.type} className="size-3.5 shrink-0 text-zinc-400" />
          {editing ? (
            <input
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitDraft()
                if (e.key === 'Escape') closeOps()
              }}
              onBlur={submitDraft}
              onClick={(e) => e.stopPropagation()}
              className="w-full rounded border border-zinc-300 bg-white px-1.5 py-0.5 text-[13px] outline-none focus:border-indigo-400"
              placeholder={t('knowledge.notesNewPlaceholder', '新笔记标题…')}
            />
          ) : (
            <span className="truncate">{node.title || '(untitled)'}</span>
          )}
        </button>

        {/* 操作栏（悬停显示；K4.2 写路径） */}
        {!editing && (
          <div className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
            <button
              type="button"
              title={t('knowledge.notesNewChild', '新建子笔记')}
              onClick={() => {
                setDraft('')
                setOps({ kind: 'create', noteId: node.noteId })
              }}
              className="rounded p-1 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600"
            >
              <Plus className="size-3.5" />
            </button>
            <button
              type="button"
              title={t('knowledge.notesRename', '改名')}
              onClick={() => {
                setDraft(node.title ?? '')
                setOps({ kind: 'rename', noteId: node.noteId, title: node.title })
              }}
              className="rounded p-1 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600"
            >
              <Pencil className="size-3.5" />
            </button>
            <button
              type="button"
              title={t('knowledge.notesDelete', '删除')}
              onClick={() => setOps({ kind: 'delete', noteId: node.noteId })}
              className="rounded p-1 text-zinc-400 hover:bg-zinc-200 hover:text-red-500"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        )}
        {isBusy && <Loader2 className="size-3.5 shrink-0 animate-spin text-zinc-400" />}
      </div>

      {/* 删除确认（K4.2 两段式，防误删） */}
      {ops?.kind === 'delete' && ops.noteId === node.noteId && (
        <div
          className="flex items-center gap-1.5 rounded-md bg-red-50 px-2 py-1 text-[12px]"
          style={{ marginLeft: `${depth * 16 + 24}px` }}
        >
          <span className="min-w-0 flex-1 truncate text-red-600">
            {t('knowledge.notesDeleteConfirm', '删除「{{title}}」？', {
              title: node.title || '(untitled)',
            })}
          </span>
          <button
            type="button"
            disabled={deleteNote.isPending}
            onClick={() =>
              deleteNote.mutate({ noteId: node.noteId }, { onSuccess: closeOps })
            }
            className="rounded bg-red-500 px-1.5 py-0.5 font-medium text-white hover:bg-red-600 disabled:opacity-50"
          >
            {t('common.confirm', '删除')}
          </button>
          <button
            type="button"
            onClick={closeOps}
            className="rounded p-0.5 text-zinc-400 hover:bg-red-100 hover:text-zinc-600"
          >
            <X className="size-3" />
          </button>
        </div>
      )}

      {/* 操作错误（fail-open：提示不崩，树只读照常） */}
      {opError && (
        <div
          className="px-2 py-1 text-[11px] text-red-500"
          style={{ marginLeft: `${depth * 16 + 24}px` }}
        >
          {t('knowledge.notesActionFailed', '操作失败，请重试或稍后再试')}
        </div>
      )}

      {hasChildren && isOpen && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.branchId}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              onSelect={onSelect}
              ops={ops}
              setOps={setOps}
              createNote={createNote}
              changeTitle={changeTitle}
              deleteNote={deleteNote}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * 真实笔记树面板（P0-5 读 + K4.2 写路径）。
 * - 读：/api/v1/kb/notes/tree（网关 → kb-engine 侧车 → PG）
 * - 写：新建子笔记 / 改名 / 删除（K4.1 mutation，成功 invalidate 刷新树）
 * - fail-open：读失败显示占位不阻塞；写失败（门控关 502 等）内联提示不崩
 */
export function NotesTreePanel({
  onSelectNote,
}: {
  onSelectNote?: (note: { noteId: string; title: string }) => void
} = {}) {
  const { t } = useTranslation()
  const { data: tree, isLoading, isError } = useNotesTree()
  const connected = !isError && !isLoading
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
  const [ops, setOps] = useState<PanelOps | null>(null)
  const createNote = useCreateNote()
  const changeTitle = useChangeTitle()
  const deleteNote = useDeleteNote()

  // ── K4.3 搜索：debounce 300ms → useQuickSearch（enabled 控制：空串/未连接不发） ──
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  useEffect(() => {
    const id = setTimeout(() => setDebounced(search), 300)
    return () => clearTimeout(id)
  }, [search])
  const searchQuery = useQuickSearch(debounced, connected)
  const searching = debounced.trim().length > 0

  const toggle = (noteId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(noteId)) next.delete(noteId)
      else next.add(noteId)
      return next
    })
  }

  /** 点击搜索结果：按 notePath 链（root/a/b）展开树 + 清空搜索回树视图 */
  const expandToPath = (notePath: string) => {
    const ids = notePath.split('/').filter((s) => s && s !== 'root')
    setExpanded((prev) => new Set([...prev, ...ids]))
    setSearch('')
    setDebounced('')
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-zinc-200 bg-white">
      <div className="flex items-center justify-between border-b border-zinc-100 px-3 py-2.5">
        <div className="flex items-center gap-1.5 text-[13px] font-medium text-zinc-800">
          <FolderTree className="size-3.5 text-zinc-500" />
          {t('knowledge.notesTitle', '笔记')}
        </div>
        <span className="flex items-center gap-1.5">
          {connected && (
            <button
              type="button"
              title={t('knowledge.notesNewRoot', '新建根笔记')}
              onClick={() => setOps({ kind: 'create', noteId: 'root' })}
              className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
            >
              <Plus className="size-3.5" />
            </button>
          )}
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium',
              connected
                ? 'bg-emerald-50 text-emerald-600'
                : 'bg-zinc-100 text-zinc-400'
            )}
          >
            {connected ? (
              <>
                <span className="size-1.5 rounded-full bg-emerald-500" />
                {t('knowledge.notesConnected', '已连接')}
              </>
            ) : (
              <>
                <Unplug className="size-2.5" />
                {t('knowledge.notesUnavailable', '未连接')}
              </>
            )}
          </span>
        </span>
      </div>

      {/* K4.3 搜索框（未连接时禁用） */}
      <div className="border-b border-zinc-100 p-2">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-zinc-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={!connected}
            placeholder={t('knowledge.notesSearchPlaceholder', '搜索笔记…')}
            className="w-full rounded-md border border-zinc-200 bg-zinc-50 py-1.5 pr-2 pl-7 text-[12px] text-zinc-700 outline-none placeholder:text-zinc-400 focus:border-indigo-400 focus:bg-white disabled:opacity-50"
          />
          {searching && searchQuery.isFetching && (
            <Loader2 className="absolute top-1/2 right-2 size-3.5 -translate-y-1/2 animate-spin text-zinc-400" />
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="space-y-1.5 p-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-6 animate-pulse rounded-md bg-zinc-100"
                style={{ width: `${70 - i * 15}%` }}
              />
            ))}
          </div>
        ) : !connected ? (
          <div className="px-2 py-6 text-center text-[12px] text-zinc-400">
            {t('knowledge.notesUnavailable', '笔记库未连接')}
          </div>
        ) : searching ? (
          // ── 搜索结果视图（K4.3） ──
          searchQuery.isError ? (
            <div className="px-2 py-6 text-center text-[12px] text-zinc-400">
              {t('knowledge.notesSearchUnavailable', '搜索暂不可用')}
            </div>
          ) : searchQuery.isLoading ? (
            <div className="px-2 py-6 text-center text-[12px] text-zinc-400">
              {t('knowledge.notesSearching', '搜索中…')}
            </div>
          ) : (searchQuery.data?.searchResults ?? []).length === 0 ? (
            <div className="px-2 py-6 text-center text-[12px] text-zinc-400">
              {t('knowledge.notesNoResults', '没有匹配的笔记')}
            </div>
          ) : (
            <div className="space-y-0.5">
              {searchQuery.data?.searchResults.map((r, i) => (
                <button
                  key={`${r.notePath}-${i}`}
                  type="button"
                  onClick={() => expandToPath(r.notePath)}
                  className="block w-full rounded-md px-2 py-1.5 text-left transition-colors hover:bg-zinc-100"
                >
                  <div className="truncate text-[13px] text-zinc-700">
                    {r.noteTitle || '(untitled)'}
                  </div>
                  {r.contentSnippet && (
                    <div className="truncate text-[11px] text-zinc-400">
                      {r.contentSnippet}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )
        ) : tree && tree.length > 0 ? (
          <div className="space-y-0.5">
            {tree.map((node) => (
              <TreeNode
                key={node.branchId}
                node={node}
                depth={0}
                expanded={expanded}
                onToggle={toggle}
                onSelect={onSelectNote ?? (() => {})}
                ops={ops}
                setOps={setOps}
                createNote={createNote}
                changeTitle={changeTitle}
                deleteNote={deleteNote}
              />
            ))}
          </div>
        ) : (
          <div className="px-2 py-6 text-center text-[12px] text-zinc-400">
            {t('knowledge.notesEmpty', '还没有笔记')}
          </div>
        )}
      </div>
    </aside>
  )
}
