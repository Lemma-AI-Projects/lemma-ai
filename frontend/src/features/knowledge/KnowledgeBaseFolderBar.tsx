import { useState } from 'react'
import { Folder, Inbox, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ActionMenu, ActionMenuItem } from '@/components/ActionMenu'
import type { KnowledgeBaseFolder } from './getKnowledgeBaseItems'

const DEFAULT_KEY = '__default__'

const chipBase =
  'flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium transition-colors'

export function KnowledgeBaseFolderBar({
  folders,
  selectedFolderId,
  counts,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}: {
  folders: KnowledgeBaseFolder[]
  selectedFolderId: string | null
  counts: Record<string, number>
  onSelect: (id: string | null) => void
  onCreate: (name: string) => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
}) {
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')

  const submitCreate = () => {
    const name = draft.trim()
    if (name) onCreate(name)
    setDraft('')
    setCreating(false)
  }
  const submitRename = () => {
    const name = editDraft.trim()
    if (editingId && name) onRename(editingId, name)
    setEditingId(null)
    setEditDraft('')
  }

  return (
    <div className="scrollbar-hidden flex w-full items-center gap-2 overflow-x-auto py-1">
      {/* 默认：承载所有尚未归组的内容，与自建文件夹同级 */}
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={cn(
          chipBase,
          selectedFolderId === null
            ? 'bg-muted text-foreground'
            : 'text-muted-foreground hover:bg-muted/60'
        )}
      >
        <Inbox className="size-4" />
        <span>默认</span>
        <span className="text-[11px] opacity-60">{counts[DEFAULT_KEY] ?? 0}</span>
      </button>

      {folders.map((folder) =>
        editingId === folder.id ? (
          <input
            key={folder.id}
            autoFocus
            value={editDraft}
            onChange={(event) => setEditDraft(event.target.value)}
            onBlur={submitRename}
            onKeyDown={(event) => {
              if (event.key === 'Enter') submitRename()
              if (event.key === 'Escape') {
                setEditingId(null)
                setEditDraft('')
              }
            }}
            className="h-8 w-36 shrink-0 rounded-full border border-zinc-300 bg-background px-3 text-[13px] text-foreground outline-none focus:border-zinc-400"
          />
        ) : (
          <div key={folder.id} className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => onSelect(folder.id)}
              className={cn(
                chipBase,
                selectedFolderId === folder.id
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:bg-muted/60'
              )}
            >
              <Folder className="size-4" />
              <span className="max-w-[140px] truncate">{folder.name}</span>
              <span className="text-[11px] opacity-60">{counts[folder.id] ?? 0}</span>
            </button>
            <ActionMenu
              width="sm"
              onContentClick={(event) => event.stopPropagation()}
              trigger={
                <button
                  type="button"
                  aria-label={`“${folder.name}”的文件夹操作`}
                  onClick={(event) => event.stopPropagation()}
                  className="flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <MoreHorizontal className="size-4" />
                </button>
              }
            >
              <ActionMenuItem
                icon={Pencil}
                label="重命名"
                onSelect={() => {
                  setEditingId(folder.id)
                  setEditDraft(folder.name)
                }}
              />
              <ActionMenuItem
                icon={Trash2}
                label="删除"
                destructive
                onSelect={() => onDelete(folder.id)}
              />
            </ActionMenu>
          </div>
        )
      )}

      {creating ? (
        <input
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={submitCreate}
          onKeyDown={(event) => {
            if (event.key === 'Enter') submitCreate()
            if (event.key === 'Escape') {
              setCreating(false)
              setDraft('')
            }
          }}
          placeholder="文件夹名称"
          className="h-8 w-36 shrink-0 rounded-full border border-zinc-300 bg-background px-3 text-[13px] text-foreground outline-none focus:border-zinc-400"
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setCreating(true)
            setDraft('')
          }}
          className={cn(
            chipBase,
            'border border-dashed border-zinc-300 text-muted-foreground hover:border-zinc-400 hover:text-foreground'
          )}
        >
          <Plus className="size-4" />
          <span>新建文件夹</span>
        </button>
      )}
    </div>
  )
}
