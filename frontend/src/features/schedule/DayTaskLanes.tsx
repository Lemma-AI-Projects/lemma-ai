import { cn } from '@/lib/utils'
import { layoutDayLanes } from './dayLanes'
import type { ScheduleTask } from './getScheduleTasks'

const LANE_RADIUS_PX = 3.5

/**
 * 一天的任务条：每行 2h，最多三行，没有任务的行不画。深色 = 已完成，
 * 空心 = 未来的计划，红框 = 逾期没做完。任务名不在这里显示，交给左栏。
 */
export function DayTaskLanes({
  tasks,
  isFuture,
}: {
  tasks: readonly ScheduleTask[]
  isFuture: boolean
}) {
  const { lanes, laneCapacity } = layoutDayLanes(
    tasks.map((task) => ({ minutes: task.minutes, progress: task.progressRatio }))
  )
  if (lanes.length === 0) return null

  return (
    <div aria-hidden className="flex flex-col gap-[3px]">
      {lanes.map((pieces, laneIndex) => {
        const used = pieces.reduce((sum, piece) => sum + piece.minutes, 0)
        return (
          <div key={laneIndex} className="flex h-[7px]">
            {pieces.map((piece, pieceIndex) => {
              const task = tasks[piece.taskIndex]
              const isLastInLane = pieceIndex === pieces.length - 1
              const left = piece.isStart ? LANE_RADIUS_PX : 0
              const right = piece.isEnd ? LANE_RADIUS_PX : 0
              return (
                <div
                  key={`${piece.taskIndex}-${pieceIndex}`}
                  className={cn(
                    'min-w-[3px] overflow-hidden',
                    isFuture
                      ? 'border border-zinc-300 bg-transparent'
                      : task.overdue
                        ? 'border border-red-400 bg-zinc-200/80'
                        : 'bg-zinc-200/80'
                  )}
                  style={{
                    flex: piece.minutes,
                    marginRight: piece.isEnd && !isLastInLane ? 2 : 0,
                    borderRadius: `${left}px ${right}px ${right}px ${left}px`,
                  }}
                >
                  <div
                    className="h-full bg-zinc-500"
                    style={{ width: `${(piece.filled / piece.minutes) * 100}%` }}
                  />
                </div>
              )
            })}
            {laneCapacity - used > 1e-6 ? <div style={{ flex: laneCapacity - used }} /> : null}
          </div>
        )
      })}
    </div>
  )
}
