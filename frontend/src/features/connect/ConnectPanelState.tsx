import { AlertTriangle, Inbox, Loader2 } from 'lucide-react'

import type { ConnectViewState } from './types'

// 面板三态（空 / 加载 / 失败）的公共外壳。四态里的「默认」由各面板自己渲染，
// 所以这里只收另外三种。空态说清楚"这里本来会有什么"，不拿编的内容充数。

interface ConnectPanelStateProps {
  state: Exclude<ConnectViewState, 'default'>
  /** 空态文案，由各面板给，避免"暂无数据"这种什么都不说的话 */
  emptyTitle: string
  emptyHint: string
}

export function ConnectPanelState({ state, emptyTitle, emptyHint }: ConnectPanelStateProps) {
  if (state === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-zinc-400">
        <Loader2 className="size-5 animate-spin" />
        <p className="text-sm">正在载入（原型：写死的等待态）</p>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-20 text-zinc-400">
        <AlertTriangle className="size-5 text-amber-500" />
        <p className="text-sm font-medium text-zinc-600">这一块没加载出来</p>
        <p className="text-xs">原型阶段没有真实重试；失败态只用来评审它长什么样</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-200 py-20 text-zinc-400">
      <Inbox className="size-5" />
      <p className="text-sm font-medium text-zinc-600">{emptyTitle}</p>
      <p className="max-w-[320px] text-center text-xs">{emptyHint}</p>
    </div>
  )
}
