import { useState } from 'react'
import { ClipboardList, PanelBottom, Plus } from 'lucide-react'
import { Popover as PopoverPrimitive } from 'radix-ui'

import { LemmaMark } from '@/components/LemmaMark'
import { cn } from '@/lib/utils'
import {
  WORKSPACE_DRAWER_BUTTON,
  WORKSPACE_PILL,
  WORKSPACE_PILL_BUTTON,
  WORKSPACE_PILL_BUTTON_ACTIVE,
} from './workspaceStyles'

export interface WorkspaceDockProps {
  /** 「新对话」：在当前空间里开一段新对话。 */
  onCommandRoom: () => void
  /** 抽屉里有没有 subbutton 可放。没有时抽屉仍占位（三个按钮是一组，缺一个会散），只是内容为空。 */
  isBriefAvailable: boolean
  isBriefOpen: boolean
  onToggleBrief: () => void
  /**
   * 文档系统是否可用。三个按钮是一组，缺一个会散，所以不可用时**禁用**而不是不渲染 ——
   * mock 预览页没有真实空间，那里这个按钮就该是灰的，不是点了没反应。
   */
  isDocumentsAvailable: boolean
  /** 右侧 logo（文档系统）是否处于打开态，用于高亮。 */
  isDocumentsOpen: boolean
  onToggleDocuments: () => void
  className?: string
}

/**
 * 画布底部的悬浮 dock —— **一个胶囊里的三个按钮**，挨在一起，不拆散。
 *
 * - **1 · 新对话（+）**：往这个空间里添一段对话。
 * - **2 · 抽屉**：不是开关，是个容器入口 —— 点开弹一层浮层，subbutton 列在里面。
 *   目前只有一个 subbutton：学习简报（Learn Brief）。将来加面板就往抽屉里加
 *   subbutton，底栏这三个按钮不动。
 * - **3 · logo**：对应**文档系统**（这个空间里的资料层）。
 */
export function WorkspaceDock({
  onCommandRoom,
  isBriefAvailable,
  isBriefOpen,
  onToggleBrief,
  isDocumentsAvailable,
  isDocumentsOpen,
  onToggleDocuments,
  className,
}: WorkspaceDockProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  // 先关抽屉再开面板：抽屉浮在画布上，留着会挡住刚打开的面板。
  const handleBriefClick = () => {
    setIsDrawerOpen(false)
    onToggleBrief()
  }

  return (
    <div
      className={cn(
        'pointer-events-none flex items-center justify-center',
        className
      )}
    >
      <div className={cn(WORKSPACE_PILL, 'pointer-events-auto gap-0.5 px-1')}>
        <button
          type="button"
          onClick={onCommandRoom}
          aria-label="新对话"
          title="新对话"
          className={WORKSPACE_PILL_BUTTON}
        >
          <Plus className="size-[18px]" />
        </button>

        <PopoverPrimitive.Root open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
          <PopoverPrimitive.Trigger asChild>
            <button
              type="button"
              aria-label="抽屉"
              title="抽屉"
              className={cn(
                WORKSPACE_PILL_BUTTON,
                isDrawerOpen && WORKSPACE_PILL_BUTTON_ACTIVE
              )}
            >
              <PanelBottom className="size-[18px]" />
            </button>
          </PopoverPrimitive.Trigger>

          <PopoverPrimitive.Portal>
            <PopoverPrimitive.Content
              side="top"
              align="center"
              sideOffset={10}
              aria-label="抽屉"
              className="z-50 w-52 rounded-xl border border-zinc-200/80 bg-white p-1.5 shadow-[0_8px_24px_-8px_rgba(16,24,40,0.25)] focus-visible:outline-none"
            >
              {isBriefAvailable ? (
                <button
                  type="button"
                  onClick={handleBriefClick}
                  aria-pressed={isBriefOpen}
                  className={cn(
                    WORKSPACE_DRAWER_BUTTON,
                    'w-full justify-start',
                    isBriefOpen && WORKSPACE_PILL_BUTTON_ACTIVE
                  )}
                >
                  <ClipboardList className="size-[18px]" />
                  <span>学习简报</span>
                </button>
              ) : (
                <p className="px-2.5 py-2 text-xs text-zinc-400">
                  这个空间暂时没有可放的板块
                </p>
              )}
            </PopoverPrimitive.Content>
          </PopoverPrimitive.Portal>
        </PopoverPrimitive.Root>

        <button
          type="button"
          onClick={onToggleDocuments}
          disabled={!isDocumentsAvailable}
          aria-pressed={isDocumentsAvailable ? isDocumentsOpen : undefined}
          aria-label="文档系统"
          title={
            isDocumentsAvailable
              ? '文档系统：这个空间里的资料'
              : '预览页没有真实空间，文档系统不可用'
          }
          className={cn(
            WORKSPACE_PILL_BUTTON,
            isDocumentsOpen && isDocumentsAvailable && WORKSPACE_PILL_BUTTON_ACTIVE
          )}
        >
          <LemmaMark
            className={cn('size-5', !isDocumentsAvailable && 'opacity-40')}
          />
        </button>
      </div>
    </div>
  )
}