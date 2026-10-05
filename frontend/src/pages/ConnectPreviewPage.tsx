import { useState } from 'react'

import { ConnectShell } from '@/features/connect/ConnectShell'
import {
  connectDefaultPageId,
  connectPageContents,
  getConnectPageContent,
} from '@/features/connect/connectMock'
import type { ConnectViewState } from '@/features/connect/types'
import { cn } from '@/lib/utils'

// 布局评审入口：Connect 页。公开、免登录、不套 AppLayout、不碰真导航。
// 与 /preview/schedule、/preview/user-profile 同一套做法 —— 数据全部来自
// connectMock.ts，页面渲染的就是 fixtures。
//
// 评审的是「这一页长什么样、能不能走通」，不是真实读写链路：
// 助手、发送、创建空间、头像子菜单里除「成就」外的条目都**未接**，
// 界面上逐处标了「未接」，别当成已实现的能力。
//
// 顶部的四态开关是原型调试用的，不属于设计稿。

const VIEW_STATES: { id: ConnectViewState; label: string }[] = [
  { id: 'default', label: '默认' },
  { id: 'empty', label: '空' },
  { id: 'loading', label: '加载' },
  { id: 'error', label: '失败' },
]

export function ConnectPreviewPage() {
  const [pageId, setPageId] = useState(connectDefaultPageId)
  const [viewState, setViewState] = useState<ConnectViewState>('default')
  const pages = connectPageContents.map((content) => content.page)
  const content = getConnectPageContent(pageId)

  return (
    <div className="flex h-screen flex-col bg-zinc-100 p-2">
      <div className="mb-2 flex shrink-0 items-center gap-2 px-1">
        <span className="text-xs font-medium text-zinc-500">Connect 原型 · 四态</span>
        <div className="flex items-center gap-1 rounded-lg bg-white p-0.5">
          {VIEW_STATES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setViewState(item.id)}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs transition-colors',
                item.id === viewState ? 'bg-zinc-900 font-medium text-white' : 'text-zinc-500 hover:bg-zinc-100'
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-zinc-400">窄屏（&lt; 1024px）两个分区改为上下叠放</span>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <ConnectShell pages={pages} content={content} state={viewState} onSelectPage={setPageId} />
      </div>
    </div>
  )
}
