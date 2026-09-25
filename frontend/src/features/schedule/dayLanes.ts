// 日历格子里的任务条：每行代表固定时长，任务按顺序像文字一样排入，
// 一行放不下就把这项切开、剩余部分折到下一行。
export const LANE_COUNT = 3
export const LANE_MINUTES = 120

export interface LaneTask {
  minutes: number
  /** 0..1 */
  progress: number
}

export interface LanePiece {
  taskIndex: number
  /** 本段在行内占的分钟数 */
  minutes: number
  /** 本段里已完成的分钟数 */
  filled: number
  /** 是否是该任务的起点 / 终点；被折行切开的一侧不画圆角 */
  isStart: boolean
  isEnd: boolean
}

export interface DayLaneLayout {
  /** 只含有任务的行，最多 LANE_COUNT 行 */
  lanes: LanePiece[][]
  /** 每行容量（分钟）；超过 LANE_COUNT × LANE_MINUTES 时整体放大，保证每项都看得见 */
  laneCapacity: number
}

const EPSILON = 1e-6

export function layoutDayLanes(tasks: readonly LaneTask[]): DayLaneLayout {
  const total = tasks.reduce((sum, task) => sum + Math.max(task.minutes, 0), 0)
  const laneCapacity = Math.max(LANE_MINUTES, total / LANE_COUNT)
  const lanes: LanePiece[][] = []
  let used = laneCapacity

  tasks.forEach((task, taskIndex) => {
    const minutes = Math.max(task.minutes, 0)
    const done = minutes * Math.min(Math.max(task.progress, 0), 1)
    let offset = 0

    while (minutes - offset > EPSILON) {
      if (laneCapacity - used < EPSILON) {
        lanes.push([])
        used = 0
      }
      const take = Math.min(minutes - offset, laneCapacity - used)
      lanes[lanes.length - 1].push({
        taskIndex,
        minutes: take,
        filled: Math.min(Math.max(done - offset, 0), take),
        isStart: offset < EPSILON,
        isEnd: minutes - (offset + take) < EPSILON,
      })
      offset += take
      used += take
    }
  })

  return { lanes, laneCapacity }
}
