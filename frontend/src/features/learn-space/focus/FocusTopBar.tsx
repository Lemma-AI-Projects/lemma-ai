import { useState } from 'react'
import {
  Lasso,
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightOpen,
  Sparkles,
} from 'lucide-react'

import { Skeleton } from '@/components/ui/skeleton'
import { WorkspaceEditMenu } from '@/features/learn-space/workspace/WorkspaceMenus'
import { cn } from '@/lib/utils'
import type { MethodStatus } from '@/features/learn-space/method/methodApi'

/**
 * 对话面板现在在哪一档。三种都得有名字，因为顶栏那一个图标按钮要**按档位**
 * 换脸：面板收起时必须变成「打开对话」，否则 (`onCollapse`) 收起来就再也打不开。
 */
export type FocusPanelMode = 'hidden' | 'normal' | 'full'

export interface FocusTopBarProps {
  spaceName: string
  isNameLoading?: boolean
  /**
   * 空间名后面那一行**方位**：`考到 90 分 · 还有 21 天`。
   *
   * 它是"我为什么在这个空间里花时间"的一句话，由页面算好传进来（顶栏不认识
   * "目标"这个对象）。没有目标时 `null` —— 这个位置就空着，而不是写一句
   * "还没有目标"：那是简报要说的事。
   */
  goalLine?: string | null
  /**
   * method 状态栏的四格。三态：
   *
   * - `undefined` = 还没读到（读中 / 这个页面不连后端）→ 画骨架；
   * - `null` = 读不到 → **明说读不到**，绝不用一句听起来正常的话盖过去；
   * - 对象 = 有。
   *
   * `focus` 不在里面：这一刻还没有人说话，所以"这一轮连到哪个知识点"没有答案。
   */
  methodStatus?: MethodStatus | null
  /** 左上角的空间名就是出去的路（点它回网格）。 */
  onExit: () => void
  /** Mala 这一轮还没接上投送 —— 传了原因就渲染成禁用并写清楚为什么。 */
  malaDisabledReason?: string
  /**
   * `edit` 下拉（新建笔记／文件夹、上传）—— **传了才渲染**。
   *
   * 聚焦的判据 4 是"写完能就地开新的一份，不用回网格"。它复用网格那一个
   * `WorkspaceEditMenu`（同一套文案、同一套禁用口径），差别只在动作落在哪：
   * 这里新建的笔记直接进聚焦、接在冻结次序末尾。预览是免登录的评审入口，
   * 连不上后端，所以不传 —— 那三个入口在预览里根本不出现，而不是点了没反应。
   */
  edit?: {
    onNewFolder: () => void
    onNewNote: () => void
    onUpload: (files: File[]) => void
  }
  /**
   * 对话面板当前档位。面板里那条「折起」把面板收成 `hidden` —— 于是这一个
   * 图标按钮必须跟着换脸，否则收起来就再也打不开。
   */
  panelMode: FocusPanelMode
  /** 按当前档位循环：`normal → full → normal`，`hidden → normal`（就是"打开对话"）。 */
  onTogglePanel: () => void
  /**
   * 左栏（大纲 + 空间资料）现在开着没有。顶栏给一个开关，因为 224px 的左栏
   * 是**固定宽度**的：窗口一窄，它就只能靠整个操作系统的窗口管理来躲开，
   * 而这一屏内没有别的出口。收起时左栏整个不渲染（它没有值得留住的本地状态）。
   */
  railOpen: boolean
  onToggleRail: () => void
  className?: string
}

/**
 * 聚焦模式的顶栏 ——四段，按用户 09-29 给的版式。
 *
 * 左：**空间名 + 「聚焦」标识**（空间名本身就是出去的路，所以没有返回箭头）
 * 中：**「当前建议」**入口（hover 或点一下才展开那条 method 状态栏）
 * 右：**Mala** · **edit 下拉** · **两个窗格开关**（左栏 · 对话）
 *
 * 「聚焦」标识与「当前建议」都**默认不占位**，顶栏默认是一条干净的工具条。
 * 但两者**不再只能靠 hover 拿到** —— 触屏没有 hover，而只挂在 `display:none`
 * 上的东西读屏也读不到：
 *
 * - 「聚焦」标识用 `sr-only`：默认仍在无障碍树里（读屏读得到），hover/focus
 *   空间名时才**显形**（`not-sr-only`）。它是个状态标注，不是入口，所以不需要可点。
 * - 「当前建议」是一个**真的下拉**：`aria-expanded` + 点一下就展开/收起，
 *   键盘 Enter 同样有效；hover 仍然即时展开。以前它只有 hover 一条路。
 *
 * 翻页（上一份 / 页码 / 下一份）**不在这儿了** —— 它是"读的节奏"，钉在页面最下面
 * （`FocusRoamBar`）。顶栏这一条说的是"我在哪个空间、现在在被怎么教"。
 *
 * `dimension` 不在这儿：它属于"空间"层级，不属于某一份资料。
 *
 * **状态栏说的是三个事实，不是一个名字**：在做什么 · 要你做什么 · 什么算完成，
 * 下面一行是"这件事和你的目标什么关系"。三条硬规矩：
 *
 * 1. **它是状态，不是选择器。** 没有下拉、没有"切换 method"菜单 —— 所以这里连
 *    点击回调都没有（以前那个 `onToggleMethod` 谁也没传，是一个点了没反应的按钮）。
 * 2. **不显示 Method 的名字。** 用户看到的是动词，不是术语。后端压根不发名字，
 *    所以这条规矩在界面这一侧是**结构上做不到违反**的。
 * 3. **四格里没有进度、没有百分比。** `completion` 是判据（什么算过），不是完成度。
 */
export function FocusTopBar({
  spaceName,
  isNameLoading = false,
  goalLine = null,
  methodStatus,
  onExit,
  malaDisabledReason,
  edit,
  onTogglePanel,
  panelMode,
  railOpen,
  onToggleRail,
  className,
}: FocusTopBarProps) {
  const iconButton =
    'rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-zinc-900/10 disabled:opacity-40 disabled:hover:bg-transparent'

  // 点开的那条 method 状态栏。**除了 hover 还要能点开** —— 触屏没有 hover，
  // 键盘用户也应该按 Enter 就能展开，而不是只能拿鼠标去蹭。
  const [isMethodOpen, setMethodOpen] = useState(false)

  const railToggle = railOpen
    ? { label: '收起左栏', Icon: PanelLeftClose }
    : { label: '展开左栏', Icon: PanelLeftOpen }

  // 面板收起时这一个按钮就是"打开对话"（否则点它没别的出口能把面板叫回来）；
  // 全屏/正常两档才是"对话全屏 / 收起全屏对话"。图标与文案同源，不会各说各话。
  const panelToggle =
    panelMode === 'hidden'
      ? { label: '打开对话', Icon: PanelRightOpen }
      : panelMode === 'full'
        ? { label: '收起全屏对话', Icon: Minimize2 }
        : { label: '对话全屏', Icon: Maximize2 }

  return (
    <header
      className={cn(
        'flex h-12 shrink-0 items-center gap-2 border-b border-zinc-200 px-3 dark:border-zinc-800',
        className
      )}
    >
      {/* 左段：空间名（出去的路）+「聚焦」标识。标识**默认不占位**，hover/focus
          空间名时才显形 —— 顶栏默认是一条干净的工具条。但它用的是 `sr-only`
          而不是 `hidden`：读屏照样读得到"聚焦"，只是眼睛看不到。它是状态标注，
          不是入口，所以没有做成按钮（空间名本身已经是出去的路，不能兼作开关）。 */}
      <div className="group/focus flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onExit}
          title="回到这个空间"
          className="max-w-56 truncate rounded px-1 py-1 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-zinc-900/10 dark:text-zinc-100"
        >
          {isNameLoading ? '读取中…' : spaceName || '这个空间'}
        </button>
        <span className="sr-only inline-block shrink-0 rounded-md bg-violet-50 px-1.5 py-0.5 text-[11px] font-medium text-violet-700 ring-1 ring-violet-200 group-focus-within/focus:not-sr-only group-hover/focus:not-sr-only">
          聚焦
        </span>
      </div>

      {goalLine && (
        <span
          title={goalLine}
          className="hidden max-w-56 truncate text-xs text-zinc-400 sm:block"
        >
          {goalLine}
        </span>
      )}

      {/* 中段：「当前建议」入口。默认只给一个触发按钮，hover 或点一下才展开成
          那条三事实胶囊（`MethodStatusPill`）。只**增**不**藏**按钮 —— 藏掉正在
          聚焦的触发件会把键盘焦点弄丢。`aria-expanded` 让读屏知道它是一开一关的，
          触屏和键盘因此都有路可走（hover 不是唯一的路）。 */}
      <div className="mx-auto flex min-w-0 items-center">
        <div className="group/method flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setMethodOpen((open) => !open)}
            aria-expanded={isMethodOpen}
            aria-controls="focus-method-status"
            aria-label="当前建议"
            title="当前建议"
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-zinc-200 px-2.5 py-1 text-xs text-zinc-500 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            <Sparkles className="size-3.5" />
            <span>当前建议</span>
          </button>
          <div
            id="focus-method-status"
            className={cn(
              'min-w-0',
              isMethodOpen ? 'flex' : 'hidden group-hover/method:flex'
            )}
          >
            <MethodStatusPill status={methodStatus} />
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          disabled={Boolean(malaDisabledReason)}
          title={malaDisabledReason ?? 'Mala：圈出你要交给 Agent 的部分'}
          className="flex items-center gap-1 rounded-full px-2.5 py-1 text-sm text-violet-700 ring-1 ring-violet-200 transition-colors hover:bg-violet-50 disabled:text-zinc-400 disabled:ring-zinc-200 disabled:hover:bg-transparent"
        >
          <Lasso className="size-4" />
          <span>Mala</span>
        </button>

        {edit && <WorkspaceEditMenu {...edit} />}

        {/* 窗格开关成对摆在一起：左边管左栏，右边管对话。两个都只**收/展**，
            不销毁状态（对话面板收起来还留着草稿与流式输出）。 */}
        <button
          type="button"
          onClick={onToggleRail}
          aria-expanded={railOpen}
          aria-label={railToggle.label}
          title={railToggle.label}
          className={iconButton}
        >
          <railToggle.Icon className="size-4" />
        </button>

        <button
          type="button"
          onClick={onTogglePanel}
          aria-label={panelToggle.label}
          title={panelToggle.label}
          className={iconButton}
        >
          <panelToggle.Icon className="size-4" />
        </button>
      </div>
    </header>
  )
}

/**
 * 状态栏本体。三态各有各的样子，而且**读不到就说读不到**。
 *
 * 三条事实挤在一行里，用 `·` 分开，靠语序读出来（先做什么 · 你做什么 · 什么算过）——
 * 这正是设计里给的样子（`先请你自己走一遍 · 等你写下前两步 · 连续 2 道独立做对就算过`）。
 * 第二行是"这件事和你的目标什么关系"；没有目标时那一行不存在，而不是写一句通用的。
 */
function MethodStatusPill({ status }: { status: MethodStatus | null | undefined }) {
  if (status === undefined) {
    return <Skeleton className="h-8 w-64 rounded-full" />
  }

  if (status === null) {
    return (
      <div
        title="读不到 method 状态（后端没有回应）—— 这里不会用一句听起来正常的话盖过去"
        className="rounded-full border border-dashed border-zinc-300 px-3 py-1 text-xs text-zinc-400"
      >
        现在在怎么教，读不到
      </div>
    )
  }

  const facts = [status.systemMove, status.learnerMove, status.completion]
  return (
    <div
      title={[facts.join(' · '), status.goalRelation].filter(Boolean).join('\n')}
      className="flex min-w-0 max-w-[28rem] flex-col items-center gap-0.5 rounded-2xl border border-zinc-200 px-3 py-1 dark:border-zinc-700"
    >
      <div className="flex min-w-0 items-center gap-1.5 text-xs text-zinc-700 dark:text-zinc-200">
        <span className="truncate">{status.systemMove}</span>
        <span className="shrink-0 text-zinc-300">·</span>
        <span className="truncate text-zinc-600 dark:text-zinc-300">{status.learnerMove}</span>
        <span className="shrink-0 text-zinc-300">·</span>
        <span className="truncate text-zinc-500">{status.completion}</span>
      </div>
      {status.goalRelation && (
        <p className="max-w-full truncate text-[11px] leading-4 text-zinc-400">
          {status.goalRelation}
        </p>
      )}
    </div>
  )
}
