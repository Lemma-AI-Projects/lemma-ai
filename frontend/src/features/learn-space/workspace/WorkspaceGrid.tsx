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

/**
 * 缩略图那一层的「类型色浅底 + 图标色」。
 *
 * 参考稿里每张卡的主体都是**一整块缩略图**，文件名退到它下面 —— 缩略图自己
 * 说明"这是什么"。我们渲染不出 PDF 的首屏（仓库里没有 pdf.js），所以统一用
 * 类型色浅底 + 大号类型图标来代替真实预览：是诚实的占位，不假装有预览。
 */
const THUMB_TINT: Record<MaterialGroupKey, string> = {
  pdf: 'bg-red-50 text-red-500',
  word: 'bg-blue-50 text-blue-500',
  spreadsheet: 'bg-emerald-50 text-emerald-600',
  presentation: 'bg-orange-50 text-orange-500',
  image: 'bg-indigo-50 text-indigo-500',
  media: 'bg-purple-50 text-purple-500',
  other: 'bg-zinc-100 text-zinc-500',
  note: 'bg-amber-50 text-amber-600',
  canvas: 'bg-sky-50 text-sky-600',
  folder: 'bg-amber-100/70 text-amber-700',
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
  const groupKey = groupKeyOf(page)
  const Icon = GROUP_ICONS[groupKey]

  if (editing) {
    return (
      <div className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-3">
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
    <div className="group relative">
      <button
        type="button"
        onClick={() => onOpen(page)}
        title={`${page.title} · ${formatDay(page.updatedAt)}`}
        className="flex w-full flex-col items-center rounded-2xl p-1.5 text-center transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-zinc-900/10"
      >
        {/* 缩略图是卡片的主体：整块面积、大圆角，类型由底色与图标说明。
            来源与日期不再挂在卡面上（参考稿的克制），改挂在 title 上，鼠标停一下还能看。 */}
        <span
          className={cn(
            'flex aspect-[4/5] w-full items-center justify-center rounded-2xl',
            THUMB_TINT[groupKey]
          )}
        >
          <Icon className="size-10" strokeWidth={1.5} />
        </span>
        <span className="mt-2.5 line-clamp-2 w-full text-[13px] leading-5 text-zinc-700">
          {page.title}
        </span>
      </button>

      <span className="absolute right-1.5 top-1.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <ActionMenu
          align="end"
          width="sm"
          trigger={
            <button
              type="button"
              aria-label="卡片操作"
              className={cn(
                'flex size-7 items-center justify-center rounded-full bg-white/80 text-zinc-500 shadow-sm backdrop-blur',
                'transition-colors hover:bg-white hover:text-zinc-800'
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
      <div className="mx-auto w-full max-w-[1180px] px-9 py-8">
        {groups.map((group) => (
          <section key={group.key} className="mb-10 last:mb-0">
            <div className="mb-4 flex items-baseline gap-2">
              <h2 className="text-[13px] font-medium text-zinc-500">{group.label}</h2>
              <span className="text-[12px] tabular-nums text-zinc-400">
                {group.items.length}
              </span>
            </div>
            <div className="grid gap-x-4 gap-y-5 [grid-template-columns:repeat(auto-fill,minmax(150px,1fr))]">
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
