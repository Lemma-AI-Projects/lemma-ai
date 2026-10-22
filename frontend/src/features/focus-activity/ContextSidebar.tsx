import { FileText, History } from 'lucide-react'

import { MATERIALS, PREVIOUS_ACTIVITY } from './activityData'

/**
 * 左栏 —— 上下文，**次要**。
 *
 * 两段：这个空间里的材料、上一个活动。它们回答的是"我从哪来"，
 * 所以整栏压成灰底、小字、不给主色。它开着的时候也不该抢中间的视线。
 *
 * 两处刻意不做：
 * - 不做文件管理（新建/移动/删除）—— 原型不验这个。
 * - "上一个活动"**不可点**。它只是让人看见"前一步是什么"，做成一排可点的历史
 *   就会暗示"活动之间可以随便跳"，那是另一个交互模型，这一轮不验。
 */
export function ContextSidebar() {
  return (
    <aside
      id="activity-context-sidebar"
      data-slot="activity-context-sidebar"
      className="flex h-full w-full flex-col gap-6 overflow-y-auto bg-zinc-50/70 px-3 py-4"
    >
      <section>
        <SectionTitle count={MATERIALS.length}>材料</SectionTitle>
        <ul className="mt-1.5 space-y-0.5">
          {MATERIALS.map((row) => (
            <li key={row.id}>
              <div className="flex items-start gap-2 rounded-md px-2 py-1.5">
                <FileText className="mt-0.5 size-3.5 shrink-0 text-zinc-400" />
                <div className="min-w-0">
                  <p className="truncate text-[13px] leading-5 text-zinc-700">{row.title}</p>
                  <p className="truncate text-[11px] leading-4 text-zinc-400">{row.note}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <SectionTitle>上一个活动</SectionTitle>
        <div className="mt-1.5 rounded-md px-2 py-1.5">
          <div className="flex items-start gap-2">
            <History className="mt-0.5 size-3.5 shrink-0 text-zinc-400" />
            <div className="min-w-0">
              <p className="truncate text-[13px] leading-5 text-zinc-700">
                {PREVIOUS_ACTIVITY.title}
              </p>
              <p className="text-[11px] leading-4 text-zinc-400">{PREVIOUS_ACTIVITY.when}</p>
            </div>
          </div>
          <p className="mt-1.5 line-clamp-2 pl-[22px] text-[11px] leading-4 text-zinc-500">
            {PREVIOUS_ACTIVITY.summary}
          </p>
        </div>
      </section>
    </aside>
  )
}

function SectionTitle({ children, count }: { children: string; count?: number }) {
  return (
    <h2 className="px-2 text-[11px] tracking-[0.08em] text-zinc-400">
      {children}
      {count === undefined ? null : ` · ${count}`}
    </h2>
  )
}
