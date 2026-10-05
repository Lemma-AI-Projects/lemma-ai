import { Lock } from 'lucide-react'

import { cn } from '@/lib/utils'
import { ConnectPanelState } from './ConnectPanelState'
import { formatRelativeTime } from './connectTime'
import type { ConnectAchievement, ConnectViewState } from './types'

// 成就栏。设计稿：「添加一个"成就"栏目」。已获得 / 进行中两种形态，
// 进行中显示进度 —— 没有进度的锁定项不显示假进度条。

interface ConnectAchievementsProps {
  achievements: ConnectAchievement[]
  state: ConnectViewState
}

export function ConnectAchievements({ achievements, state }: ConnectAchievementsProps) {
  if (state !== 'default') {
    return (
      <ConnectPanelState
        state={state}
        emptyTitle="还没有成就"
        emptyHint="成就会在这里按「已获得 / 进行中」摆开；这一块目前是纯 mock，数据来源未定。"
      />
    )
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {achievements.map((achievement) => {
        const earned = achievement.earnedAt !== null
        return (
          <div
            key={achievement.id}
            className={cn(
              'flex items-start gap-3 rounded-xl border p-4',
              earned ? 'border-amber-200 bg-amber-50/60' : 'border-zinc-200 bg-white'
            )}
          >
            <span
              className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-full text-base font-bold',
                earned ? 'bg-amber-400 text-white' : 'bg-zinc-100 text-zinc-400'
              )}
            >
              {earned ? achievement.glyph : <Lock className="size-4" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className={cn('text-sm font-semibold', earned ? 'text-amber-800' : 'text-zinc-700')}>
                {achievement.title}
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">{achievement.description}</p>

              {earned && (
                <p className="mt-2 text-xs text-amber-600">{formatRelativeTime(achievement.earnedAt as string)}获得</p>
              )}

              {!earned && achievement.progress && (
                <div className="mt-2">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
                    <div
                      className="h-full rounded-full bg-zinc-400"
                      style={{
                        width: `${Math.round((achievement.progress.current / achievement.progress.total) * 100)}%`,
                      }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-zinc-400">
                    {achievement.progress.current} / {achievement.progress.total}
                  </p>
                </div>
              )}

              {!earned && !achievement.progress && <p className="mt-2 text-xs text-zinc-400">未开始</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
