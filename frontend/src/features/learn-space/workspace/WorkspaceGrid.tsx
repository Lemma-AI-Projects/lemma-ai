import { useState, type ReactNode } from 'react'
import {
  Ellipsis,
  File as FileIcon,
  FileText,
  Folder,
  Image as ImageIcon,
  Pencil,
  Presentation,
  Table,
  Trash2,
  Video,
} from 'lucide-react'

import { ActionMenu, ActionMenuItem } from '@/components/ActionMenu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { DocPage } from '@/features/docs/types'
import { cn } from '@/lib/utils'
import {
  SOURCE_LABELS,
  groupKeyOf,
  groupMaterials,
  type MaterialGroupKey,
} from './gridGroups'

const GROUP_ICONS: Record<MaterialGroupKey, typeof FileIcon> = {
  pdf: FileText,
  word: FileText,
  spreadsheet: Table,
  presentation: Presentation,
  image: ImageIcon,
  media: Video,
  other: FileIcon,
  note: FileText,
  canvas: FileIcon,
  folder: Folder,
}

function formatDay(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
}

/** 卡片上那个小标记：来源。类型已经由它所在的组说清楚了，不重复。 */
function SourceBadge({ source }: { source: DocPage['source'] }) {
  const label = SOURCE_LABELS[source]
  if (!label) return null
  return (
    <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-500">
      {label}
    </span>
  )
}

function Card({
  page,
  onOpen,
  onRename,
  onDelete,
}: {
  page: DocPage
  onOpen: (page: DocPage) => void
  onRename: (page: DocPage, title: string) => void
  onDelete: (page: DocPage) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(page.title)
  const Icon = GROUP_ICONS[groupKeyOf(page)]

  if (editing) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-3">
        <Input
          autoFocus
          value={draft}
          maxLength={300}
          className="h-8 rounded-lg text-[13px]"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && draft.trim()) {
              onRename(page, draft.trim())
              setEditing(false)
            }
            if (event.key === 'Escape') setEditing(false)
          }}
        />
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            className="h-7 rounded-full px-3 text-[12px] font-normal"
            onClick={() => {
              if (draft.trim()) {
                onRename(page, draft.trim())
                setEditing(false)
              }
            }}
          >
            保存
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 rounded-full px-2.5 text-[12px] font-normal text-zinc-500"
            onClick={() => setEditing(false)}
          >
            取消
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="group relative flex flex-col rounded-xl border border-zinc-200 bg-white p-3 transition-colors hover:border-zinc-300 hover:bg-zinc-50">
      <button
        type="button"
        onClick={() => onOpen(page)}
        className="flex items-start gap-3 text-left"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500">
          <Icon className="size-4" />
        </span>
        <span className="min-w-0 flex-1 pe-6">
          <span className="block truncate text-[14px] font-medium text-zinc-900">
            {page.title}
          </span>
          <span className="mt-1 flex items-center gap-1.5">
            <SourceBadge source={page.source} />
            <span className="text-[11px] text-zinc-400">{formatDay(page.updatedAt)}</span>
          </span>
        </span>
      </button>

      <span className="absolute right-2 top-2 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <ActionMenu
          align="end"
          width="sm"
          trigger={
            <button
              type="button"
              aria-label="卡片操作"
              className={cn(
                'flex size-7 items-center justify-center rounded-full text-zinc-400',
                'transition-colors hover:bg-zinc-100 hover:text-zinc-700'
              )}
            >
              <Ellipsis className="size-4" />
            </button>
          }
        >
          <ActionMenuItem
            icon={Pencil}
            label="重命名"
            onSelect={() => {
              setDraft(page.title)
              setEditing(true)
            }}
          />
          <ActionMenuItem
            icon={Trash2}
            label="删除"
            destructive
            onSelect={() => onDelete(page)}
          />
        </ActionMenu>
      </span>
    </div>
  )
}

export interface WorkspaceGridProps {
  pages: DocPage[]
  isLoading: boolean
  isError: boolean
  errorText?: string
  onOpenPage: (page: DocPage) => void
  onRename: (page: DocPage, title: string) => void
  onDelete: (page: DocPage) => void
}

/**
 * 网格 —— 空间的资料目录。
 *
 * 四种状态互相不伪装（沿用文档系统那套纪律）：
 * 读取中 / 读不到（明说原因）/ 真的空（一句话 + 告诉你去哪儿加）/ 有内容。
 */
export function WorkspaceGrid({
  pages,
  isLoading,
  isError,
  errorText,
  onOpenPage,
  onRename,
  onDelete,
}: WorkspaceGridProps) {
  if (isLoading) {
    return <Centered>正在读取资料…</Centered>
  }

  if (isError) {
    return <Centered>{errorText ?? '读不到资料，请刷新重试。'}</Centered>
  }

  const groups = groupMaterials(pages)
  if (groups.length === 0) {
    return (
      <Centered>
        这个空间还没有东西。
        <span className="mt-1 block text-[13px] text-zinc-400">
          用右上角的「编辑」放下第一份：新建笔记，或上传 PDF / 图片。
        </span>
      </Centered>
    )
  }

  return (
    <div className="scrollbar-fade h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-[1180px] px-8 py-6">
        {groups.map((group) => (
          <section key={group.key} className="mb-8 last:mb-0">
            <div className="mb-3 flex items-baseline gap-2">
              <h2 className="text-[15px] font-medium text-zinc-900">{group.label}</h2>
              <span className="text-[12px] tabular-nums text-zinc-400">
                {group.items.length}
              </span>
            </div>
            <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(200px,1fr))]">
              {group.items.map((page) => (
                <Card
                  key={page.id}
                  page={page}
                  onOpen={onOpenPage}
                  onRename={onRename}
                  onDelete={onDelete}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center px-6">
      <p className="text-center text-sm text-zinc-500">{children}</p>
    </div>
  )
}
