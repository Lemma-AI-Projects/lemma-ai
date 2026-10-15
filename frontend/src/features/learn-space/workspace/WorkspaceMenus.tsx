import { useRef } from 'react'
import {
  ChevronDown,
  FilePlus2,
  FolderPlus,
  Focus,
  History,
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

/**
 * 切换器里的四项 —— 但**它们是两类东西**，这一点必须写在类型里：
 *
 *   * **视图（view）**：网格 / 画板 —— 切换是**原地换布局**，`view` 这个 state 会变；
 *   * **去处（jump）**：聚焦 / 轨迹 —— 它们是**另一屏**（各有独立路由），点下去是
 *     "走过去"，`view` 不变。所以触发按钮上永远显示的是当前那个**视图**。
 *
 * ⚠️ 这里原来是三个值（`'grid' | 'board' | 'focus'`），但 `view` **从来没有**等于过
 * `'focus'` —— 聚焦那条路一直是 `onOpenFocus()` 走掉的。类型写着三个、实际只可能是两个，
 * 是一句会误导人的注释。现在把"去处"从类型里拿出来，两类的区别就摆在了明面上。
 */
export type WorkspaceView = 'grid' | 'board'

/**
 * ⚠️ **加了轨迹之后，「同一份数据、三种摆法」这句话不再成立。**
 * 网格 / 画板 / 聚焦确实是同一批内容的三种摆法；而**轨迹是按时间读的那一条**
 * （它讲"发生过什么"，不是"有什么"，而且它今天只画得出有行的事件）。
 * 所以菜单底下的说明改成「怎么看这个空间」—— 四个都装得下。
 */
interface MenuEntry {
  key: WorkspaceView | 'focus' | 'trajectory'
  label: string
  icon: typeof LayoutGrid
  /** 点了是"走过去"（另一屏），不是原地换布局。 */
  jump?: 'focus' | 'trajectory'
}

const MENU_ENTRIES: MenuEntry[] = [
  { key: 'grid', label: '网格', icon: LayoutGrid },
  { key: 'board', label: '画板', icon: Waypoints },
  { key: 'focus', label: '聚焦', icon: Focus, jump: 'focus' },
  { key: 'trajectory', label: '轨迹', icon: History, jump: 'trajectory' },
]

const TRIGGER =
  'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-zinc-900/10'

/**
 * `dimension` —— 顶部最右那个位置（别家产品放"排序方式"）放的是**怎么看这个空间**。
 *
 * 四项，两类：
 *  * **原地换**（网格 / 画板）：只改变"这一屏怎么摆"，空间里有什么一点不变；
 *  * **走过去**（聚焦 / 轨迹）：各有独立路由的另一屏 —— 所以它们不把这一屏的 state
 *    改掉（改了会画出一片空白），而是调各自的 `onOpen*`。
 *
 * 画板**列出来但不可选**：一个点不动的菜单项，比一个假装能切的项诚实
 * （沿用仓库纪律：不做点了没反应的东西）。轨迹可真去（`/learn-spaces/:id/trajectory`）。
 */
export function WorkspaceModeMenu({
  view,
  onChange,
  onOpenFocus,
  onOpenTrajectory,
  className,
}: {
  view: WorkspaceView
  onChange: (view: WorkspaceView) => void
  onOpenFocus?: () => void
  onOpenTrajectory?: () => void
  className?: string
}) {
  const current = MENU_ENTRIES.find((entry) => !entry.jump && entry.key === view)!
  const CurrentIcon = current.icon

  return (
    <ActionMenu
      align="end"
      width="md"
      trigger={
        <button type="button" aria-label="切换视角" className={cn(TRIGGER, className)}>
          <CurrentIcon className="size-4" />
          <span>{current.label}</span>
          <ChevronDown className="size-3.5 text-zinc-400" />
        </button>
      }
    >
      {MENU_ENTRIES.map((entry) => {
        const Icon = entry.icon
        const isCurrent = entry.key === view
        // 去哪一屏需要那个回调真的给了（预览页就没有空间，给不出来）。
        const isReady = entry.jump
          ? Boolean(entry.jump === 'focus' ? onOpenFocus : onOpenTrajectory)
          : true
        return (
          <ActionMenuItem
            key={entry.key}
            icon={Icon}
            disabled={!isReady}
            label={isCurrent ? `${entry.label}（当前）` : entry.label}
            onSelect={() => {
              if (!isReady) return
              if (entry.jump === 'focus') {
                onOpenFocus?.()
                return
              }
              if (entry.jump === 'trajectory') {
                onOpenTrajectory?.()
                return
              }
              onChange(entry.key as WorkspaceView)
            }}
          />
        )
      })}
      <ActionMenuSeparator />
      <p className="px-2 py-1.5 text-[12px] leading-4 text-zinc-400">
        聚焦是一屏一份资料；轨迹是这个空间发生过什么。画板还在设计里。
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
