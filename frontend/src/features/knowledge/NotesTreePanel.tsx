import { useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Code2,
  FileText,
  FolderTree,
  Image as ImageIcon,
  KanbanSquare,
  Network,
  PenTool,
  Table2,
  Unplug,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'
import {
  useNotesTree,
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

function TreeNode({ node, depth }: { node: KbTreeNode; depth: number }) {
  const [expanded, setExpanded] = useState(depth < 1)
  const hasChildren = node.children.length > 0

  return (
    <div>
      <button
        type="button"
        onClick={() => hasChildren && setExpanded((v) => !v)}
        className={cn(
          'flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-[13px] text-zinc-700 transition-colors hover:bg-zinc-100',
          !hasChildren && 'cursor-default'
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {hasChildren ? (
          expanded ? (
            <ChevronDown className="size-3.5 shrink-0 text-zinc-400" />
          ) : (
            <ChevronRight className="size-3.5 shrink-0 text-zinc-400" />
          )
        ) : (
          <span className="size-3.5 shrink-0" />
        )}
        <NoteTypeIcon
          type={node.type}
          className="size-3.5 shrink-0 text-zinc-400"
        />
        <span className="truncate">{node.title || '(untitled)'}</span>
      </button>
      {hasChildren && expanded && (
        <div>
          {node.children.map((child) => (
            <TreeNode key={child.branchId} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * 真实笔记树面板（P0-5：知识库 tab 接入 Trilium notes 树）。
 * - 数据来自 /api/v1/kb/notes/tree（网关 → kb-engine 侧车 → PG）
 * - fail-open：加载/失败/未配置时显示轻量占位 + 状态徽章，不阻塞页面其余内容
 */
export function NotesTreePanel() {
  const { t } = useTranslation()
  const { data: tree, isLoading, isError } = useNotesTree()
  const connected = !isError && !isLoading

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-zinc-200 bg-white">
      <div className="flex items-center justify-between border-b border-zinc-100 px-3 py-2.5">
        <div className="flex items-center gap-1.5 text-[13px] font-medium text-zinc-800">
          <FolderTree className="size-3.5 text-zinc-500" />
          {t('knowledge.notesTitle', '笔记')}
        </div>
        <span
          className={cn(
            'rounded-full px-1.5 py-0.5 text-[10px] font-medium',
            connected
              ? 'bg-emerald-50 text-emerald-600'
              : 'bg-zinc-100 text-zinc-400'
          )}
        >
          {connected
            ? t('knowledge.notesConnected', '已连接')
            : t('knowledge.notesUnavailable', '笔记库未连接')}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {isLoading ? (
          <div className="space-y-1 px-3">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-6 animate-pulse rounded-md bg-zinc-100"
                style={{ width: `${72 - i * 8}%` }}
              />
            ))}
          </div>
        ) : isError || !tree || tree.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 px-3 py-8 text-center">
            {isError ? (
              <Unplug className="size-5 text-zinc-300" />
            ) : (
              <FileText className="size-5 text-zinc-300" />
            )}
            <p className="text-xs text-zinc-400">
              {isError
                ? t('knowledge.notesUnavailable', '笔记库未连接')
                : t('knowledge.notesEmpty', '还没有笔记')}
            </p>
          </div>
        ) : (
          tree.map((node) => (
            <TreeNode key={node.branchId} node={node} depth={0} />
          ))
        )}
      </div>
    </aside>
  )
}
