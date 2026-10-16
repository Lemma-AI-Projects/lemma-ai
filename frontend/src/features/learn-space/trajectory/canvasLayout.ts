import type { TrajectoryEvent } from './trajectoryApi'

/**
 * 轨迹画布的**摆放规则** —— 纯函数，不碰 React、不碰 DOM、不读时钟。
 *
 * 它只回答两件事：
 * 1. **每一条落在画布的哪个 y**（纵向 = 时间，最新在上，原点 0 就是"现在"）；
 * 2. **当前缩放该画哪一档**（远只剩刻度形状，中出标题，近出全文与来源）。
 *
 * ## 三条不变量（都有单测钉住）
 *
 * - **确定性**：同一批事件，无论入参什么顺序，算出来的坐标完全一样。
 * - **拖动缩放不改坐标**：这里没有 `viewport` 参数 —— 摆位只在事件变了时才重算，
 *   所以拖动和缩放**不可能**让图重排（"反馈及时"的前提）。
 * - **不重叠**：任何两点的间距 ≥ `NODE_ROW_H`。
 *
 * ⚠️ **刻意不做 force-directed 自动布局** —— 它是迭代的，同一份数据两次跑可以给出
 * 不同的图，而"同一件事永远在同一处"是这张图能被读的前提。
 *
 * ⚠️ **横向今天只有一列**。原型里有「同一个概念落在同一列」（`relatedFocus`），但真事件
 * 里没有那个字段 —— 那要等「事件 → 知识点」那条链做出来（计划 T6）。在那之前，
 * 这里**不编**一个横向归属。
 */

/**
 * 一格的画布高度。**它是布局与渲染之间的一个约定**：这一格要装得下"最近档"
 * 那一版的节点（标题两行 + 一行来源 + 一行时间）。
 *
 * ⚠️ 所以 T5b 必须确认**任何一档渲染出来的节点高度都不超过它** —— 超了就会压到下一格上，
 * 而那种重叠不会报错，只会让两件事看起来像一件事。
 */
export const NODE_ROW_H = 200

/**
 * 整段时间映射成多高的画布。它是"停下来的那段时间看得见"的唯一旋钮：
 * 调大 ⇒ 稀疏的日子被拉开，「我中间歇了一个月」变成一段真实的空白；
 * 调小 ⇒ 越接近等距，越像一列列表。
 *
 * 一段空白要真的看得出来，需要 `空白的占比 × TIME_HEIGHT > NODE_ROW_H`。
 * 以 3600 算，约 5.6% 以上的间隔才会撑开 —— 一个月的空档在三个月的空间里绰绰有余。
 */
export const TIME_HEIGHT = 3600

/** 缩到多小算"远"。低于它只画刻度和形状，一个字都不画。 */
export const LOD_FAR_MAX = 0.55

/** 放到多大算"近"。到这一档才出完整标题和来源。 */
export const LOD_NEAR_MIN = 1.3

export type Lod = 'far' | 'mid' | 'near'

/**
 * 当前缩放该画哪一档。
 *
 * ⚠️ 分界点用 `<` 而不是 `<=`：`lodFor(LOD_FAR_MAX)` 是 `mid`，
 * `lodFor(LOD_NEAR_MIN)` 是 `near`。两边都取不到临界档会更别扭。
 *
 * ⚠️ **非有限的 scale 要单独挡掉** —— `NaN` 比大小恒为 false，会一路掉到 `near`，
 * 于是画布坏掉的当口反而画出最重的一档。返回 `mid` 是这里唯一合理的兜底。
 */
export function lodFor(scale: number): Lod {
  if (!Number.isFinite(scale)) return 'mid'
  if (scale < LOD_FAR_MAX) return 'far'
  if (scale < LOD_NEAR_MIN) return 'mid'
  return 'near'
}

export interface TrajectoryCanvasNode {
  event: TrajectoryEvent
  /** 画布坐标。原点 = 现在；y 越大越老。 */
  top: number
  /**
   * 这条的时间读不出来（`at` 不是能解析的时间）。
   * 它被排在**最后**，且界面上不许猜一个日期给它 —— 见下面 `toCanvasNodes`。
   */
  timeless: boolean
}

/** 带时间的事件（`at` 已经解析成毫秒）。 */
interface TimedEvent {
  event: TrajectoryEvent
  at: number
}

/** 新的排前面；同一时刻用 id 兜底，保证排序是确定的。 */
function newestFirst(a: TimedEvent, b: TimedEvent) {
  if (b.at !== a.at) return b.at - a.at
  if (a.event.id === b.event.id) return 0
  return a.event.id < b.event.id ? -1 : 1
}

/**
 * 事件 → 画布上的位置。
 *
 * 摆法：**先按真实时间给一个比例位置，再从上一个节点往下推**，两者取大的那个。
 * - 比例位置负责"停下来的那段时间看得出来"；
 * - 往下推负责"挤在一起的那几天不会叠成一团"。
 *
 * ⚠️ **时间读不出来的那条排在最后，不是排在"今天"**。把它当成今天会让它挤到最新一条旁边，
 * 而它可能是一年前的；把它丢掉则是隐藏了数据问题。放最后 + 标 `timeless` 是唯一不撒谎的选项。
 */
export function toCanvasNodes(events: TrajectoryEvent[]): TrajectoryCanvasNode[] {
  const timed: TimedEvent[] = []
  const timeless: TrajectoryEvent[] = []

  for (const event of events) {
    const at = Date.parse(event.at)
    if (Number.isFinite(at)) timed.push({ event, at })
    else timeless.push(event)
  }

  timed.sort(newestFirst)

  const newest = timed.length > 0 ? timed[0].at : 0
  const oldest = timed.length > 0 ? timed[timed.length - 1].at : 0
  const range = newest - oldest

  const nodes: TrajectoryCanvasNode[] = []
  let floor: number | null = null

  /**
   * 落一格：想去的 y 与"上一格底下"取大的那个。第一个节点没有上一格。
   *
   * ⚠️ **取整**：画布坐标不需要小数点。不取整的话"间距不小于一格"这条会以
   * `199.99999999999977` 这种样子失败 —— 那既让断言要靠 epsilon 才写得下去，
   * 也让同一份数据在不同机器上算出微差。取整之后坐标是整数，间距可以精确等于一格。
   */
  const place = (wanted: number) => {
    const top = Math.round(floor === null ? wanted : Math.max(wanted, floor + NODE_ROW_H))
    floor = top
    return top
  }

  for (const { event, at } of timed) {
    const share = range > 0 ? (newest - at) / range : 0
    nodes.push({ event, top: place(share * TIME_HEIGHT), timeless: false })
  }

  for (const event of timeless) {
    nodes.push({ event, top: place(0), timeless: true })
  }

  return nodes
}
