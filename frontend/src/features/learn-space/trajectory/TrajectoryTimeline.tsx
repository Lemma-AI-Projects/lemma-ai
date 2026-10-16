import { Link } from 'react-router-dom'

import type { TrajectoryEvent, TrajectoryResponse } from './trajectoryApi'
import { KIND_LABEL } from './trajectoryLabels'
import { ApproxMark } from './trajectoryMarks'

/**
 * 轨迹的时间线（**真数据版**）—— 这个空间真实发生过什么。**只收 props，不取数。**
 *
 * ⚠️ 命名注意：隔壁的 `TrajectoryView.tsx` 是**旧的假数据原型**（挂在
 * `/preview/trajectory`，551 行，画布 + 四问 + 依据抽屉）。这两个不是一个东西：
 * 原型讲"我走了多远"（形态），这里讲"到底发生了什么"（事实）。
 * 千万别把这个文件写成 `TrajectoryView.tsx` —— 会覆盖掉原型。
 *
 * ⚠️ 为什么把「取数」和「呈现」拆开：真实路由要 token，而本机没有。
 * 不拆的话这一屏**只能靠登录后的截图**，等于验不了 —— 同样的代价 `GoalBlock`
 * 那一块付过（见 `.workbuddy/research` 与 skill `lemma-offscreen-ui-verify`）。
 * 拆开之后，`/preview/trajectory-events` 喂一份 fixture 就能看到与真实页面**同一段代码**。
 *
 * ## 这一版只画事实，不写判断
 *
 * 每一行都对应某张表里的一行。页面**没有**"什么变了""这对接下来的意义"那种段落 ——
 * 那类句子要有依据才配写，而此刻多半没有。**留白比补一句像样的解释诚实。**
 *
 * ## 三件必须看得见的事
 *
 * 1. **近似的时间**：边注的时间取自它所在页的更新时间（块没有时间戳）⇒ 标「时间≈」。
 * 2. **归不到这个空间的东西**：通知表没有空间字段，取不到的那些**数出来**放在末尾。
 * 3. **空就是空**：什么都没发生过时说"还没有可追溯的记录"，不编一条占位。
 */

function Row({ event }: { event: TrajectoryEvent }) {
  const when = new Date(event.at)
  const stamp = `${String(when.getMonth() + 1).padStart(2, '0')}-${String(
    when.getDate()
  ).padStart(2, '0')} ${String(when.getHours()).padStart(2, '0')}:${String(
    when.getMinutes()
  ).padStart(2, '0')}`

  const body = (
    <>
      <span className="w-24 shrink-0 font-mono text-[11px] text-zinc-400">{stamp}</span>
      <span className="w-10 shrink-0 text-[11px] text-zinc-400">
        {KIND_LABEL[event.kind]}
      </span>
      <span className="min-w-0 flex-1 text-[13px] text-zinc-800 dark:text-zinc-200">
        {event.title}
      </span>
      {event.atAccuracy === 'approx' && <ApproxMark />}
    </>
  )

  // 有地方可去就整行可点；没有就只是文字（不给一个点了没反应的箭头）。
  return event.href ? (
    <Link
      to={event.href}
      className="flex items-baseline gap-2 rounded px-2 py-2 transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-zinc-900/10 dark:hover:bg-zinc-900"
    >
      {body}
    </Link>
  ) : (
    <div className="flex items-baseline gap-2 px-2 py-2">{body}</div>
  )
}

export function TrajectoryTimeline({
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
  const events = data?.events ?? []
  const span = data?.span
  const unattributed = data?.unattributed ?? {}

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <div className="mx-auto max-w-3xl px-8 py-8">
        <div className="flex items-baseline gap-2">
          <h1 className="truncate text-base font-medium">{spaceName || '　'}</h1>
          <span className="text-[11px] text-zinc-400">轨迹</span>
          {span?.fromAt && span?.toAt && (
            <span className="ml-auto shrink-0 font-mono text-[11px] text-zinc-400">
              {span.fromAt.slice(0, 10)} → {span.toAt.slice(0, 10)}
            </span>
          )}
        </div>

        <p className="mt-2 text-[12px] text-zinc-500">
          这里只列真的发生过的事 —— 每一行都能点回它的出处。
        </p>

        <div className="mt-6">
          {isPending ? (
            <div className="space-y-2">
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  className="h-4 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800"
                  style={{ opacity: 1 - index * 0.2 }}
                />
              ))}
            </div>
          ) : isError ? (
            <p className="pt-8 text-center text-[13px] text-zinc-500">
              读不到这个空间的轨迹。
            </p>
          ) : events.length === 0 ? (
            /* ⚠️ 空态是**诚实的状态**，不是"还没加载"。 */
            <div className="pt-16 text-center">
              <p className="text-[13px] text-zinc-500">这个空间还没有可追溯的记录</p>
              <p className="mt-2 text-[12px] text-zinc-400">
                放进一份资料、聊一次、写下一条边注，这里就会开始有东西。
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-900">
              {events.map((event) => (
                <Row key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>

        {/* ⚠️ 归不到这个空间的，**数出来**放在这里，而不是塞进上面那条时间线。 */}
        {Object.keys(unattributed).length > 0 && (
          <p className="mt-6 text-[11px] text-zinc-400">
            另有{' '}
            {Object.entries(unattributed)
              .map(([, count]) => `${count} 条`)
              .join('、')}
            记录没有标明属于哪个空间 —— 它们不在这里，也没有被算到这个空间头上。
          </p>
        )}

        {data?.truncated && (
          <p className="mt-2 text-[11px] text-zinc-400">
            记录太多，这里只显示了最近的一部分。
          </p>
        )}

        {backTo && (
          <Link
            to={backTo}
            className="mt-10 inline-flex items-center gap-1.5 rounded-full border border-zinc-200 px-3 py-1.5 text-xs text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200"
          >
            回到空间
          </Link>
        )}
      </div>
    </div>
  )
}
