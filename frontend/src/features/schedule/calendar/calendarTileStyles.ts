import { cn } from '@/lib/utils'

// 日期片：这个月的每一天是一块浅灰的圆角片，片与片之间留一道缝，不用线也不用边框。
// 悬停深一档，选中再深一档，都只换底色。邻月的日子没有片，鼠标移上去才垫一层。
export function calendarTileClassName({
  inMonth,
  selected,
}: {
  inMonth: boolean
  selected: boolean
}): string {
  return cn(
    'rounded-[12px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-zinc-300 focus-visible:ring-inset',
    selected
      ? 'bg-zinc-300/60'
      : inMonth
        ? 'bg-zinc-200/40 hover:bg-zinc-200/70'
        : 'hover:bg-zinc-200/40'
  )
}

// 圆环上没做的那一段：选中的片底色深，这一段也要深一档才看得出来。
export function calendarTileTrackColor(selected: boolean): string {
  return selected ? '#c4c4c9' : '#d4d4d8'
}

// 片与片之间的缝（和 gap-1 对应）。
export const CALENDAR_TILE_GAP = 4

// 一行或一列里有 `count` 块片、总共 `total` 这么长时，每一块有多长。
export function getTileSpan(total: number, count: number): number {
  return (total - (count - 1) * CALENDAR_TILE_GAP) / count
}

// 一次看一个月的月历固定排六周：翻月时片的大小和位置都不变。
const MONTH_WEEKS = 6

// 片的高最多是宽的多少倍。超过一成就看得出是竖着的长方形了。
export const CALENDAR_TILE_MAX_ASPECT = 1.1

// 月历格子区最高多高：片差不多到正方形就不再长高。
// 窗口又窄又高时，格子区不再往下撑，下面留白。
// 用法：写在格子区的 max-height 上；格子区外面要有一层 @container（按它的宽度算）。
export const CALENDAR_MONTH_GRID_MAX_HEIGHT = `calc((100cqw - ${
  6 * CALENDAR_TILE_GAP
}px) / 7 * ${CALENDAR_TILE_MAX_ASPECT * MONTH_WEEKS} + ${
  (MONTH_WEEKS - 1) * CALENDAR_TILE_GAP
}px)`

// 写任务名的日期片（CalendarTaskTile）里，除了任务以外占掉的高度，和它的样式一一对应：
// 上内边距 5 + 日期那一行 20 + 行间 2 + 下内边距 6。
const TASK_TILE_CHROME = 33
// 片里一个任务一行的高度（和 h-[18px] 对应）。
const TASK_TILE_ROW_HEIGHT = 18

// 这么高的片里放得下几行任务。
export function getTaskTileCapacity(tileHeight: number): number {
  // 多让半个像素：行高是量出来再平分的，会有小数。
  return Math.max(
    Math.floor((tileHeight - TASK_TILE_CHROME + 0.5) / TASK_TILE_ROW_HEIGHT),
    0
  )
}
