import { useMemo, useState, type FocusEvent, type MouseEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { BoardCanvas, type Viewport } from '@/features/board/BoardCanvas'
import { NODE_ROW_H, lodFor, toCanvasNodes, type TrajectoryCanvasNode, type Lod } from './canvasLayout'
import type { TrajectoryEvent, TrajectoryResponse } from './trajectoryApi'
import { KIND_LABEL } from './trajectoryLabels'
import { ApproxMark, KindMark } from './trajectoryMarks'

/**
 * 轨迹的画布版（**真数据版**）—— 这个空间真实发生过什么，铺在一张拖得动、缩得了的图上。
 *
 * ⚠️ 命名：隔壁 `TrajectoryView.tsx` 是**旧的假数据原型**（`/preview/trajectory`，
 * 画布 + 四问 + 依据抽屉，讲"我走了多远"）。这一版讲"到底发生了什么"，
 * 而且**一句判断都不写**。别把两个文件混起来。
 *
 * ## 只收 props，不取数
 *
 * 真实路由要 token，本机没有 ⇒ 取数与呈现必须分开，否则这一屏只能靠登录后的截图
 * （等于验不了）。拆开之后 `/preview/trajectory-events?view=canvas` 喂一份 fixture
 * 就能看到与真实页面**同一段代码**。
 *
 * ## 骨架全是现成的
 *
 * 拖动画布 / 滚轮平移 / ⌘+滚轮以指针为锚点缩放 / −+重置三个按钮 / `+ - 0` 与方向键
 * 全部来自 `features/board/BoardCanvas.tsx` —— 这一版**一行手势代码都没写**。
 * 那个组件里的 `onViewportChange` 就是为轨迹留的口子，这里用它换 LOD 档位。
 *
 * ## 三层，各解决一件事
 *
 * | 层 | 解决 | 参与缩放 |
 * |---|---|---|
 * | 画布内的紧凑节点（形状 + 时间 + 标题） | 空间感 | ✅ |
 * | hover 的 HTML 浮层（全文 + 来源） | 阅读 | ❌（`fixed`，在变换之外） |
 * | 点节点走到它的原处 | 追溯 | ❌ |
 *
 * ⚠️ 为什么 hover 必须存在：缩到 0.48× 时节点上的字只有 6px 高，等于没有。
 * 所以"远"档不画字、**把字交给浮层** —— 这不是省事，这是那张图能读的唯一办法。
 */

/** 节点卡片宽度。缩放时它跟着变，所以它是**画布坐标**不是屏幕像素。 */
const NODE_W = 320
/** 时间轴的 x。形状标记骑在轴上。 */
const AXIS_X = 76
/** 卡片的左边缘（在轴的右边）。 */
const NODE_LEFT = 116
/** 顶部留白 —— 让"最新的一条"不贴着画布边，重置视图时才看得见它。 */
const PAD_TOP = 92
/** 轴往最后一个节点之下再多画这么远，免得它像被切断。 */
const AXIS_TAIL = 180

/** `MM-DD HH:mm`；"近"档要年份。⚠️ 时间读不出来时说"时间读不出"，别印一个 Invalid Date。 */
function formatStamp(at: string, withYear: boolean): string {
  const when = new Date(at)
  if (Number.isNaN(when.getTime())) return '时间读不出'
  const pad = (value: number) => String(value).padStart(2, '0')
  const date = `${pad(when.getMonth() + 1)}-${pad(when.getDate())} ${pad(when.getHours())}:${pad(
    when.getMinutes()
  )}`
  return withYear ? `${when.getFullYear()}-${date}` : date
}

const CARD =
  'pointer-events-auto absolute block rounded-lg border border-zinc-200 bg-white px-3 py-2 ' +
  'text-left shadow-[0_1px_2px_rgb(24_24_27/0.04)] transition-shadow hover:border-zinc-300 ' +
  'hover:shadow-[0_2px_10px_rgb(24_24_27/0.08)] focus-visible:outline-none ' +
  'focus-visible:ring-[3px] focus-visible:ring-zinc-900/10'

/**
 * 画布上的一个节点。**三层里的第一层**：紧凑，因为它会被缩放。
 *
 * ⚠️ 外框 `pointer-events-none`、只有卡片 `pointer-events-auto`：
 * `BoardCanvas` 的拖动要求 `event.target === event.currentTarget`，所以外框若吃指针，
 * 那一整行就拖不动了 —— 而"只能从空白处拖动"这件事在用户眼里就是"拖不动"。
 */
function Node({
  node,
  lod,
  onHover,
  onLeave,
}: {
  node: TrajectoryCanvasNode
  lod: Lod
  onHover: (event: TrajectoryEvent, anchor: DOMRect) => void
  onLeave: () => void
}) {
  const { event, top, timeless } = node
  const stamp = formatStamp(event.at, lod === 'near')
  const body = (
    <>
      <span className="flex items-center gap-1.5">
        <span className="text-[10.5px] text-zinc-500">{KIND_LABEL[event.kind]}</span>
        <span className="font-mono text-[10.5px] text-zinc-400">{stamp}</span>
        {event.atAccuracy === 'approx' && <ApproxMark />}
      </span>
      <span
        className={`mt-1 block text-[13px] leading-[1.35] font-medium text-zinc-900 ${
          lod === 'near' ? 'line-clamp-3' : 'truncate'
        }`}
      >
        {event.title}
      </span>
      {lod === 'near' && (
        <span className="mt-1.5 block font-mono text-[10.5px] text-zinc-400">
          来源 {event.source.table}
        </span>
      )}
    </>
  )

  const hoverProps = {
    onMouseEnter: (e: MouseEvent<HTMLElement>) =>
      onHover(event, e.currentTarget.getBoundingClientRect()),
    onMouseLeave: onLeave,
    onFocus: (e: FocusEvent<HTMLElement>) =>
      onHover(event, e.currentTarget.getBoundingClientRect()),
    onBlur: onLeave,
  }

  return (
    <div
      data-trajectory-node={event.id}
      /* ⚠️ 时间读不出来的那些**带自己的标记**：它们排在最后、不给日期，
         但也不假装自己有一个正常的时间钩子。 */
      data-trajectory-timeless={timeless ? 'true' : undefined}
      className="pointer-events-none absolute"
      style={{ top: top + PAD_TOP, left: 0, width: NODE_LEFT + NODE_W, height: NODE_ROW_H }}
    >
      {/* 骑在轴上的形状 —— "远"档唯一画的东西 */}
      <span
        className="absolute flex items-center justify-center"
        style={{ left: AXIS_X - 10, top: 6, width: 20, height: 16 }}
      >
        <KindMark kind={event.kind} />
      </span>

      {/* "远"档到此为止：一个字都不画（缩到 0.48× 时 13px 的字只有 6px 高，画了也读不出来） */}
      {lod !== 'far' &&
        /* 有地方可去才是链接；没有就只是块 —— 不给一个点了没反应的箭头。 */
        (event.href ? (
          <Link to={event.href} className={CARD} style={{ left: NODE_LEFT, top: 0, width: NODE_W }} {...hoverProps}>
            {body}
          </Link>
        ) : (
          <div className={CARD} style={{ left: NODE_LEFT, top: 0, width: NODE_W }} {...hoverProps}>
            {body}
          </div>
        ))}
    </div>
  )
}

/** 三种"没有图可看"的状态。⚠️ 空态是**诚实的状态**，不是"还没加载"。 */
function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
      <div className="max-w-sm px-8 text-center">{children}</div>
    </div>
  )
}

export function TrajectoryCanvas({
  spaceName,
  data,
  isPending,
  isError,
  backTo,
}: {
  spaceName: string
  data: TrajectoryResponse | undefined
  isPending: boolean
  isError: boolean
  /** 「回到空间」去哪。`null` 就不渲染那个链接（评审页没有可回的空间）。 */
  backTo: string | null
}) {
  // 只用来选档位；缩放胶囊由 BoardCanvas 自己画。
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, scale: 1 })
  const [hover, setHover] = useState<{ event: TrajectoryEvent; x: number; y: number } | null>(null)

  // ⚠️ 直接拿 `data.events` 当依赖，不要 `?? []` —— 后者每次渲染都是一个新数组，
  // 会让下面那个 memo 每帧都重算（并且把"摆位只依赖事件"这件事悄悄破掉）。
  const events = data?.events
  const span = data?.span
  const unattributed = data?.unattributed ?? {}
  const lod = lodFor(viewport.scale)

  /**
   * ⚠️ 摆位只依赖事件 —— 缩放**不在**依赖里。这不是省事，是这一屏的核心承诺：
   * 拖动和缩放**不可能**让图重排，因为算坐标的那个函数根本不知道视口长什么样。
   */
  const nodes = useMemo(() => toCanvasNodes(events ?? []), [events])
  const height = nodes.length > 0 ? nodes[nodes.length - 1].top + NODE_ROW_H + AXIS_TAIL : 0

  const unattributedCount = Object.values(unattributed).reduce((sum, n) => sum + n, 0)

  return (
    <div className="relative h-screen w-full overflow-hidden bg-white dark:bg-zinc-950">
      <BoardCanvas onViewportChange={setViewport}>
        <div
          data-trajectory-lod={lod}
          className="relative"
          style={{ width: NODE_LEFT + NODE_W + 80, height: height || 1 }}
        >
          {nodes.length > 0 && (
            <>
              <div
                aria-hidden
                className="pointer-events-none absolute w-px bg-zinc-200 dark:bg-zinc-800"
                style={{ left: AXIS_X, top: 0, height }}
              />
              {/* 「现在」是一个**锚**，不是按钮：最新的一条就落在它旁边，重置视图就回到这里。 */}
              <div
                className="pointer-events-none absolute text-right"
                style={{ left: 0, top: PAD_TOP - 20, width: AXIS_X - 10 }}
              >
                <span className="font-mono text-[10.5px] tracking-[0.14em] text-zinc-400">现在</span>
              </div>
              {nodes.map((node) => (
                <Node
                  key={node.event.id}
                  node={node}
                  lod={lod}
                  onHover={(event, anchor) => {
                    const flipX = anchor.right > window.innerWidth - 400
                    const flipY = anchor.bottom > window.innerHeight - 320
                    setHover({
                      event,
                      x: flipX ? Math.max(12, anchor.left - 388) : anchor.right + 12,
                      y: flipY ? Math.max(12, anchor.top - 300) : anchor.top,
                    })
                  }}
                  onLeave={() => setHover(null)}
                />
              ))}
            </>
          )}
        </div>
      </BoardCanvas>

      {/* ── 取数状态：加载中 / 读不到 / 空。空态不编占位节点。 ── */}
      {isPending && (
        <Centered>
          <p className="text-[13px] text-zinc-500">正在读这个空间的记录…</p>
        </Centered>
      )}
      {!isPending && isError && (
        <Centered>
          <p className="text-[13px] text-zinc-500">读不到这个空间的轨迹。</p>
        </Centered>
      )}
      {!isPending && !isError && nodes.length === 0 && (
        <Centered>
          <p className="text-[13px] text-zinc-500">这个空间还没有可追溯的记录</p>
          <p className="mt-2 text-[12px] text-zinc-400">
            放进一份资料、聊一次、写下一条边注，这里就会开始有东西。
          </p>
        </Centered>
      )}

      {/* ── 顶栏：空间名 + 时间跨度 + 回到空间。⚠️ 不占画布坐标。 ── */}
      <div className="pointer-events-none absolute top-5 left-6 z-30 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        {backTo && (
          <Link
            to={backTo}
            className="pointer-events-auto rounded-full border border-zinc-200 px-2.5 py-1 text-[11.5px] text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
          >
            ← 回到空间
          </Link>
        )}
        <h1 className="text-[13px] font-medium text-zinc-900 dark:text-zinc-100">
          {spaceName || '　'}
        </h1>
        <span className="text-[11px] text-zinc-400">轨迹</span>
        {span?.fromAt && span?.toAt && (
          <span className="font-mono text-[11px] text-zinc-400">
            {span.fromAt.slice(0, 10)} → {span.toAt.slice(0, 10)}
          </span>
        )}
      </div>

      {/* ── 角落说明：归不到这个空间的、以及被截断的。⚠️ 不占画布坐标，否则会被当成一条事件。 ── */}
      {(unattributedCount > 0 || data?.truncated) && (
        <div className="pointer-events-none absolute right-6 bottom-6 z-30 max-w-xs text-right text-[11px] leading-5 text-zinc-400">
          {unattributedCount > 0 && (
            <p>
              另有 {unattributedCount} 条记录没有标明属于哪个空间 —— 它们不在这里，也没有被算到这个空间头上。
            </p>
          )}
          {data?.truncated && <p>记录太多，这里只显示了最近的一部分。</p>}
        </div>
      )}

      {/* ── hover 浮层：不参与缩放，所以字永远是屏幕尺寸。 ── */}
      {hover && (
        <div
          data-trajectory-hover="true"
          className="pointer-events-none fixed z-40 w-[360px] rounded-xl border border-zinc-200 bg-white p-3.5 shadow-[0_8px_28px_rgb(24_24_27/0.12)] dark:border-zinc-800 dark:bg-zinc-900"
          style={{ left: hover.x, top: hover.y }}
        >
          <div className="flex items-center gap-1.5">
            <KindMark kind={hover.event.kind} />
            <span className="text-[10.5px] text-zinc-500">{KIND_LABEL[hover.event.kind]}</span>
            <span className="font-mono text-[10.5px] text-zinc-400">
              {formatStamp(hover.event.at, true)}
            </span>
            {hover.event.atAccuracy === 'approx' && <ApproxMark />}
          </div>
          <p className="mt-1.5 font-serif text-[15px] leading-snug font-medium text-zinc-900 dark:text-zinc-100">
            {hover.event.title}
          </p>
          <p className="mt-2 font-mono text-[10.5px] text-zinc-400">
            来源 {hover.event.source.table} · {hover.event.source.id}
          </p>
          <p className="mt-1.5 text-[11px] text-zinc-400">
            {hover.event.href ? '点开回到原处 →' : '这一条没有可去的页面。'}
          </p>
        </div>
      )}
    </div>
  )
}
