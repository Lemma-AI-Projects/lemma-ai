import { useRef } from 'react'
import {
  ChevronDown,
  FilePlus2,
  FolderPlus,
  Focus,
  LayoutGrid,
  SquarePen,
  Upload,
  Waypoints,
} from 'lucide-react'

import {
  ActionMenu,
  ActionMenuItem,
  ActionMenuSeparator,
} from '@/components/ActionMenu'
import { MATERIAL_EXTENSIONS } from '@/features/docs/importFile'
import { cn } from '@/lib/utils'

/** 三种视角。网格是默认；画板与聚焦还在设计里（见 learn-space-design.md）。 */
export type WorkspaceView = 'grid' | 'board' | 'focus'

const VIEW_ORDER: WorkspaceView[] = ['grid', 'board', 'focus']

const VIEW_LABELS: Record<WorkspaceView, string> = {
  grid: '网格',
  board: '画板',
  focus: '聚焦',
}

const VIEW_ICONS: Record<WorkspaceView, typeof LayoutGrid> = {
  grid: LayoutGrid,
  board: Waypoints,
  focus: Focus,
}

const TRIGGER =
  'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-zinc-900/10'

/**
 * `dimension` —— 顶部最右那个位置（别家产品放"排序方式"）放的是**视角**。
 *
 * 它不是排序、不是筛选：切换视角不改变"空间里有什么"，只改变"这一屏怎么摆"。
 *
 * **网格与聚焦现在都能选**：网格在这一屏原地换；聚焦是**另一屏**（单份资料，
 * 独立路由），所以它走 `onOpenFocus` 而不是把这一屏的 state 改掉 —— 后者会画
 * 出一片空白。画板**列出来但不可选**：一个点不动的菜单项，比一个假装能切的项
 * 诚实（沿用仓库纪律：不做点了没反应的东西）。
 */
export function WorkspaceModeMenu({
  view,
  onChange,
  onOpenFocus,
  className,
}: {
  view: WorkspaceView
  onChange: (view: WorkspaceView) => void
  onOpenFocus?: () => void
  className?: string
}) {
  return (
    <ActionMenu
      align="end"
      width="md"
      trigger={
        <button type="button" aria-label="切换视角" className={cn(TRIGGER, className)}>
          <Waypoints className="size-4" />
          <span>{VIEW_LABELS[view]}</span>
          <ChevronDown className="size-3.5 text-zinc-400" />
        </button>
      }
    >
      {VIEW_ORDER.map((option) => {
        const Icon = VIEW_ICONS[option]
        const isCurrent = option === view
        const isReady = option === 'grid' || (option === 'focus' && Boolean(onOpenFocus))
        return (
          <ActionMenuItem
            key={option}
            icon={Icon}
            disabled={!isReady}
            label={isCurrent ? `${VIEW_LABELS[option]}（当前）` : VIEW_LABELS[option]}
            onSelect={() => {
              if (!isReady) return
              if (option === 'focus') {
                onOpenFocus?.()
                return
              }
              onChange(option)
            }}
          />
        )
      })}
      <ActionMenuSeparator />
      <p className="px-2 py-1.5 text-[12px] leading-4 text-zinc-400">
        聚焦是另一屏（单份资料，能在里面写）。画板还在设计里。
      </p>
    </ActionMenu>
  )
}

/**
 * `edit` —— 往这个空间里放东西。三件事合成一个入口。
 *
 * 只有「上传文件」是真能跑的：PDF 与图片走 `material_storage`（本地盘）。
 * 「上传文件夹」「粘贴 YouTube 链接」都还没做，所以这里**不放**它们 ——
 * 灰着的假按钮比少一个按钮更糟。文本（.md/.txt）仍然可以从文档系统的导入进。
 */
export function WorkspaceEditMenu({
  onNewFolder,
  onNewNote,
  onUpload,
  className,
}: {
  onNewFolder: () => void
  onNewNote: () => void
  onUpload: (files: File[]) => void
  className?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <>
      <ActionMenu
        align="end"
        width="md"
        trigger={
          <button type="button" aria-label="新建或上传" className={cn(TRIGGER, className)}>
            <SquarePen className="size-4" />
            <span>编辑</span>
            <ChevronDown className="size-3.5 text-zinc-400" />
          </button>
        }
      >
        <ActionMenuItem icon={FolderPlus} label="新建文件夹" onSelect={onNewFolder} />
        <ActionMenuItem icon={FilePlus2} label="新建笔记" onSelect={onNewNote} />
        <ActionMenuSeparator />
        <ActionMenuItem
          icon={Upload}
          label="上传文件…"
          onSelect={() => inputRef.current?.click()}
        />
        <p className="px-2 py-1.5 text-[12px] leading-4 text-zinc-400">
          PDF 与图片，单个不超过 50 MB。
        </p>
      </ActionMenu>
      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        accept={MATERIAL_EXTENSIONS.join(',')}
        onChange={(event) => {
          const files = Array.from(event.target.files ?? [])
          // 清掉 value：同一个文件连选两次也要能触发一次 change。
          event.target.value = ''
          if (files.length > 0) onUpload(files)
        }}
      />
    </>
  )
}

export { VIEW_LABELS }
