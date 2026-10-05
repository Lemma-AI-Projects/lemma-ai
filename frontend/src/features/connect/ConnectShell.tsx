import { useRef, useState } from 'react'
import { FolderKanban, GraduationCap } from 'lucide-react'

import { UserAvatar } from '@/components/UserAvatar'
import { cn } from '@/lib/utils'
import { ConnectAchievements } from './ConnectAchievements'
import { ConnectChat } from './ConnectChat'
import { ConnectFeed } from './ConnectFeed'
import { ConnectMemberList } from './ConnectMemberList'
import { ConnectPageSwitcher } from './ConnectPageSwitcher'
import { ConnectRail } from './ConnectRail'
import type { ConnectBlock, ConnectPage, ConnectPageContent, ConnectPartitionId, ConnectViewState } from './types'

// 桌面外壳。三件事：
//   1. 左上角仍是页面切换器（Connect 是本页，页面在左上角换）；
//   2. 主区按 Classroom / Project **分区**，两区并排摆开；
//   3. 四个内容选项（Feed / 成员 / 聊天 / 成就）搬到**右侧一列小菜单**里，
//      成为侧栏的子选项 —— 它决定两区里各显示哪一块。
//
// 这一层只是画面：切换改的是本页内部，不接管 AppLayout 的真导航。

const PARTITION_ICON: Record<ConnectPartitionId, typeof GraduationCap> = {
  classroom: GraduationCap,
  project: FolderKanban,
}

interface ConnectShellProps {
  pages: ConnectPage[]
  content: ConnectPageContent
  state: ConnectViewState
  onSelectPage: (pageId: string) => void
}

export function ConnectShell({ pages, content, state, onSelectPage }: ConnectShellProps) {
  const [block, setBlock] = useState<ConnectBlock>('feed')
  const [focusedPartitionId, setFocusedPartitionId] = useState<ConnectPartitionId>('classroom')
  const zoneRefs = useRef<Partial<Record<ConnectPartitionId, HTMLElement | null>>>({})
  const { page, assistant, partitions } = content

  const focusPartition = (id: ConnectPartitionId) => {
    setFocusedPartitionId(id)
    zoneRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="flex h-full min-h-0">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center gap-3 border-b border-zinc-200 bg-white px-5 py-3">
          <ConnectPageSwitcher pages={pages} currentPageId={page.id} onSelect={onSelectPage} />
          <span className="ml-auto flex items-center gap-2">
            <span className="rounded-full border border-dashed border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700">
              原型 · mock 数据
            </span>
            <UserAvatar name="Ceaser" color="#FF8F50" size={28} className="pointer-events-none" />
          </span>
        </header>

        <div className="flex shrink-0 items-start gap-3 border-b border-zinc-200 bg-white px-5 py-3">
          <UserAvatar name={page.name} color={page.color} size={36} className="pointer-events-none" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold text-zinc-900">{page.name}</h1>
            <p className="text-xs text-zinc-500">
              {page.subtitle} · {page.memberCount} 位成员
            </p>
          </div>
          <span className="flex max-w-[300px] items-start gap-1.5 rounded-lg bg-zinc-50 px-2.5 py-1.5 text-xs text-zinc-500">
            <span className="font-medium text-zinc-700">{assistant.name}</span>
            <span className="min-w-0">{assistant.note}</span>
            <span className="shrink-0 rounded bg-white px-1 py-0.5 text-[10px] text-zinc-400">未接</span>
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-zinc-50 p-5">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {partitions.map((partition) => {
              const Icon = PARTITION_ICON[partition.id]
              const focused = partition.id === focusedPartitionId
              return (
                <section
                  key={partition.id}
                  ref={(node) => {
                    zoneRefs.current[partition.id] = node
                  }}
                  className={cn(
                    'flex flex-col rounded-xl border bg-white transition-shadow',
                    focused ? 'border-amber-200 ring-2 ring-amber-200/60' : 'border-zinc-200'
                  )}
                >
                  <header className="flex items-center gap-2 border-b border-zinc-100 px-4 py-3">
                    <Icon className="size-4 shrink-0 text-zinc-500" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-zinc-900">{partition.name}</p>
                      <p className="truncate text-xs text-zinc-500">{partition.subtitle}</p>
                    </div>
                    <span className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500">
                      {partition.members.length} 人
                    </span>
                  </header>

                  <div className="min-h-0 flex-1 p-4">
                    {block === 'feed' && <ConnectFeed items={partition.feed} state={state} />}
                    {block === 'members' && <ConnectMemberList members={partition.members} state={state} />}
                    {block === 'chat' && (
                      <div className="h-[380px]">
                        <ConnectChat
                          messages={partition.messages}
                          assistantName={assistant.name}
                          state={state}
                        />
                      </div>
                    )}
                    {block === 'achievements' && (
                      <ConnectAchievements achievements={partition.achievements} state={state} />
                    )}
                  </div>
                </section>
              )
            })}
          </div>
        </div>
      </div>

      <ConnectRail
        partitions={partitions}
        focusedPartitionId={focusedPartitionId}
        onFocusPartition={focusPartition}
        block={block}
        onSelectBlock={setBlock}
      />
    </div>
  )
}
