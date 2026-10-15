import { Link, useParams } from 'react-router-dom'

import { useProjectQuery } from '@/features/project/projectApi'
import {
  useTrajectoryQuery,
  type TrajectoryEvent,
  type TrajectoryKind,
} from '@/features/learn-space/trajectory/trajectoryApi'

/**
 * 轨迹（Trajectory）—— 这个空间**真实发生过什么**。
 *
 * ## 这一版只画事实，不写判断
 *
 * 每一行都对应某张表里的一行（后端 `services/trajectory_service.py` 读出来的）。
 * 页面**没有**"什么变了""这对接下来的意义"那种段落 —— 那类句子要有依据才配写，
 * 而此刻多半没有。**留白比补一句像样的解释诚实。**
 *
 * ## 三件必须看得见的事
 *
 * 1. **近似的时间**：边注的时间取自它所在页的更新时间（块没有时间戳）⇒ 标「时间≈」。
 * 2. **归不到这个空间的东西**：通知表没有空间字段，取不到的那些**数出来**放在末尾，
 *    而不是塞进这个空间。
 * 3. **空就是空**：什么都没发生过时说"还没有可追溯的记录"，不编一条占位。
 */

const KIND_LABEL: Record<TrajectoryKind, string> = {
  material: '资料',
  annotation: '边注',
  goal: '目标',
  memory: '记住',
  conversation: '对话',
  evidence: '证据',
  bundle: '圈选',
  decision: '决定',
  notification: '提醒',
}

/** 「时间≈」—— 近似时间的标记。它必须比标题显眼一点点，否则没人会看见。 */
function ApproxMark() {
  return (
    <span
      title="这张表里没有时间戳，这里用的是它所在页的更新时间"
      className="shrink-0 rounded border border-dashed border-zinc-300 px-1 text-[10px] text-zinc-400 dark:border-zinc-600"
    >
      时间≈
    </span>
  )
}

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

export function TrajectorySpacePage() {
  const { id } = useParams<{ id: string }>()
  const projectQuery = useProjectQuery(id)
  const trajectoryQuery = useTrajectoryQuery(id)

  const events = trajectoryQuery.data?.events ?? []
  const span = trajectoryQuery.data?.span
  const unattributed = trajectoryQuery.data?.unattributed ?? {}

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <div className="mx-auto max-w-3xl px-8 py-8">
        <div className="flex items-baseline gap-2">
          <h1 className="truncate text-base font-medium">
            {projectQuery.data?.name ?? '　'}
          </h1>
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
          {trajectoryQuery.isPending ? (
            <div className="space-y-2">
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  className="h-4 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800"
                  style={{ opacity: 1 - index * 0.2 }}
                />
              ))}
            </div>
          ) : trajectoryQuery.isError ? (
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

        {trajectoryQuery.data?.truncated && (
          <p className="mt-2 text-[11px] text-zinc-400">
            记录太多，这里只显示了最近的一部分。
          </p>
        )}

        <Link
          to={`/learn-spaces/${id}`}
          className="mt-10 inline-flex items-center gap-1.5 rounded-full border border-zinc-200 px-3 py-1.5 text-xs text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200"
        >
          回到空间
        </Link>
      </div>
    </div>
  )
}
