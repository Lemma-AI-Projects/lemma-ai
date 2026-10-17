import { useState } from 'react'

import {
  INSIGHT,
  MATERIAL,
  SPACE,
  type UserAction,
} from './insightPreviewData'

/**
 * 三个视图 + 一条启示面板。
 *
 * ## 一条视觉上的主张
 *
 * 这条启示**不是一张卡**。它是页边的一条注：左边一条细竖线、衬线体、句子短。
 * 卡片会把它变成一个"通知"，而通知是要被处理掉的；页边注是可以反复看、可以不同意的。
 *
 * 所以三处都用同一个记号：**一个赭色小点 + 关于「特征值」**。
 * 在空间里它是一条安静的行，在聚焦里它是一条贴在底部的带子，在轨迹里它是被引用那几行的左竖线。
 * 它们指向同一件事 —— 这就是"三个视图而不是三个产品"。
 */
export const INK = '#1B1A17'
export const MUTED = '#6E6960'
export const FAINT = '#989285'
export const HAIR = '#E7E2D7'
export const ACCENT = '#8A5A2B'
export const SURFACE = '#FFFFFF'

/* ───────────────────────── 共用的小零件 ───────────────────────── */

/** 这条启示的记号：一个赭色小点。三处都用它，别处不用颜色。 */
export function InsightMark({ size = 6 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-block shrink-0 rounded-full"
      style={{ width: size, height: size, backgroundColor: ACCENT }}
    />
  )
}

function Micro({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11.5px] tracking-[0.02em]" style={{ color: FAINT }}>
      {children}
    </span>
  )
}

function Rule({ className = '' }: { className?: string }) {
  return <div className={`h-px w-full ${className}`} style={{ backgroundColor: HAIR }} />
}

/* ───────────────────────── 启示面板 ───────────────────────── */

const ACTIONS: { key: Exclude<UserAction, null>; label: string }[] = [
  { key: 'accepted', label: '知道了' },
  { key: 'questioned', label: '那次我故意看的' },
  { key: 'dismissed', label: '以后别提醒这类' },
]

const SETTLED: Record<Exclude<UserAction, null>, { title: string; note: string }> = {
  accepted: { title: '你标记为「知道了」', note: '这条会留在空间里，你随时可以回来看它引的那几条记录。' },
  questioned: {
    title: '你标记为「那次我故意看的」',
    note: '记下了。以后再按这个说法提「特征值」时，会先看到你这句。',
  },
  dismissed: {
    title: '你说以后别提醒这类',
    note: '「靠提示做对」这一类不会再出现在左边那一栏。',
  },
}

export function InsightPanel({
  action,
  onAction,
  onClose,
}: {
  action: UserAction
  onAction: (next: UserAction) => void
  onClose: () => void
}) {
  const [openRow, setOpenRow] = useState<string | null>(null)
  const settled = action ? SETTLED[action] : null

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-baseline gap-3 px-7 pt-6 pb-4">
        <span className="text-[12px] tracking-[0.14em]" style={{ color: FAINT }}>
          启示
        </span>
        <span className="font-mono-cjk text-[11.5px]" style={{ color: FAINT }}>
          {INSIGHT.createdAt}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto -mr-1 rounded px-1.5 py-0.5 text-[13px] transition-colors hover:bg-black/[0.04]"
          style={{ color: MUTED }}
          aria-label="收起这条启示"
        >
          ✕
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-7 pb-8">
        <div className="flex items-center gap-2">
          <InsightMark size={7} />
          <span className="text-[12.5px]" style={{ color: MUTED }}>
            关于「{INSIGHT.about}」
          </span>
        </div>

        {/* 正文：衬线体、短句、行宽收紧。这一块是全页最该被读完的东西。 */}
        <div className="mt-4 font-serif" style={{ color: INK }}>
          {INSIGHT.claim.map((line) => (
            <p key={line} className="text-[19px] leading-[1.75] tracking-[0.002em]">
              {line}
            </p>
          ))}
          <p className="mt-3 text-[17px] leading-[1.7]" style={{ color: MUTED }}>
            {INSIGHT.ask}
          </p>
        </div>

        <div className="mt-5 flex items-center gap-2.5">
          <Micro>依据 {INSIGHT.evidence.length} 条记录</Micro>
          <span style={{ color: HAIR }}>·</span>
          <Micro>确定性 {INSIGHT.certainty === 'medium' ? '中' : '低'}</Micro>
        </div>

        {/* 证据：一条一行，点开才看见当时的情形。这是"凭什么"唯一的出口。 */}
        <section className="mt-7" aria-label="这条启示引用的记录">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-[12px] tracking-[0.14em]" style={{ color: FAINT }}>
              凭这几条
            </span>
            <Micro>点一行看当时的情形</Micro>
          </div>

          <ul>
            {INSIGHT.evidence.map((row) => {
              const open = openRow === row.id
              return (
                <li key={row.id} style={{ borderTop: `1px solid ${HAIR}` }}>
                  <button
                    type="button"
                    onClick={() => setOpenRow(open ? null : row.id)}
                    aria-expanded={open}
                    className="flex w-full items-baseline gap-3 py-2.5 text-left transition-colors hover:bg-black/[0.015]"
                  >
                    <span className="font-mono-cjk w-[74px] shrink-0 text-[12px]" style={{ color: FAINT }}>
                      {row.at.slice(5)}
                    </span>
                    <span className="min-w-0 flex-1 text-[13px] leading-6" style={{ color: INK }}>
                      {row.what}
                    </span>
                    <span className="shrink-0 text-[12px]" style={{ color: row.verdict === 'correct' ? MUTED : ACCENT }}>
                      {row.verdict === 'correct' ? '对' : '错'}
                    </span>
                    {row.hinted ? (
                      <span
                        className="shrink-0 rounded-sm px-1 py-px text-[11px]"
                        style={{ color: ACCENT, backgroundColor: '#F5EDE2' }}
                      >
                        用了提示
                      </span>
                    ) : (
                      <span className="shrink-0 text-[11px]" style={{ color: MUTED }}>
                        独立
                      </span>
                    )}
                  </button>
                  {open && (
                    <p className="pb-3 pl-[86px] text-[12.5px] leading-6" style={{ color: MUTED }}>
                      {row.detail}
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        </section>

        {/* 回应：三个动作都是"我的看法"，不是"系统的结论"。 */}
        <section className="mt-7" aria-label="你对这条启示的回应">
          <Rule />
          {settled ? (
            <div className="pt-4">
              {/* 撤销放在同一行右端 —— 它是"改口"的出口，藏到下面会找不到。 */}
              <div className="flex items-baseline gap-3">
                <p className="text-[13.5px]" style={{ color: INK }}>
                  {settled.title}
                </p>
                <button
                  type="button"
                  onClick={() => onAction(null)}
                  className="ml-auto shrink-0 text-[12.5px] underline decoration-1 underline-offset-4 transition-opacity hover:opacity-60"
                  style={{ color: MUTED, textDecorationColor: HAIR }}
                >
                  撤销
                </button>
              </div>
              <p className="mt-1.5 text-[12.5px] leading-6" style={{ color: MUTED }}>
                {settled.note}
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-4">
              {ACTIONS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onAction(item.key)}
                  className="text-[13px] transition-opacity hover:opacity-60"
                  style={{
                    color: item.key === 'accepted' ? INK : MUTED,
                    textDecoration: item.key === 'accepted' ? 'none' : 'underline',
                    textDecorationColor: HAIR,
                    textUnderlineOffset: 4,
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </section>

        <p className="mt-8 text-[11.5px] leading-5" style={{ color: FAINT }}>
          这条观察来自你留下来的那几条记录，不是对你的评估。你可以不同意它。
        </p>
      </div>
    </div>
  )
}

/* ───────────────────────── 空间 ───────────────────────── */

export function SpaceView({
  onOpenInsight,
  dismissed,
}: {
  onOpenInsight: () => void
  dismissed: boolean
}) {
  return (
    <div className="mx-auto w-full max-w-[720px] px-10 py-12">
      {/* 启示的入口：**一行**，不是横幅、不是红点。它不打断你，但一直在。 */}
      {!dismissed && (
        <button
          type="button"
          onClick={onOpenInsight}
          className="group mb-11 flex w-full items-center gap-2.5 rounded-sm py-1 text-left"
        >
          <InsightMark />
          <span className="text-[13px]" style={{ color: MUTED }}>
            有一条观察，关于「{INSIGHT.about}」
          </span>
          <span
            className="text-[12px] transition-transform group-hover:translate-x-0.5"
            style={{ color: FAINT }}
          >
            →
          </span>
        </button>
      )}

      <h1 className="font-serif text-[28px] leading-tight" style={{ color: INK }}>
        {SPACE.name}
      </h1>
      <p className="mt-2.5 text-[13px]" style={{ color: MUTED }}>
        目标 · {SPACE.goal}
      </p>

      <section className="mt-12">
        <div className="mb-3 flex items-baseline justify-between">
          <span className="text-[12px] tracking-[0.14em]" style={{ color: FAINT }}>
            最近
          </span>
          <Micro>{SPACE.since} 开始的</Micro>
        </div>
        <Rule />
        <ul>
          {SPACE.recent.map((row) => (
            <li
              key={row.at + row.what}
              className="flex items-baseline gap-4 py-3"
              style={{ borderBottom: `1px solid ${HAIR}` }}
            >
              <span className="font-mono-cjk w-[52px] shrink-0 text-[12px]" style={{ color: FAINT }}>
                {row.at}
              </span>
              <span className="text-[13.5px]" style={{ color: INK }}>
                {row.what}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <div className="mb-3 flex items-baseline justify-between">
          <span className="text-[12px] tracking-[0.14em]" style={{ color: FAINT }}>
            资料
          </span>
          <Micro>3 份</Micro>
        </div>
        <Rule />
        <ul>
          {SPACE.materials.map((row) => (
            <li key={row.id} style={{ borderBottom: `1px solid ${HAIR}` }}>
              <button
                type="button"
                className="flex w-full items-baseline gap-4 py-3.5 text-left transition-colors hover:bg-black/[0.015]"
              >
                <span
                  className="w-[3px] shrink-0 self-stretch rounded-full"
                  style={{ backgroundColor: row.active ? ACCENT : 'transparent' }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px]" style={{ color: INK }}>
                    {row.title}
                  </span>
                  <span className="mt-1 block text-[12px]" style={{ color: FAINT }}>
                    {row.meta}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

/* ───────────────────────── 聚焦 ───────────────────────── */

export function FocusView({
  onOpenInsight,
  dismissed,
}: {
  onOpenInsight: () => void
  dismissed: boolean
}) {
  const [answer, setAnswer] = useState('')
  const [submitted, setSubmitted] = useState(false)

  return (
    <div className="mx-auto w-full max-w-[680px] px-10 py-12">
      <div className="flex items-baseline gap-2 text-[12px]" style={{ color: FAINT }}>
        <span>{MATERIAL.crumb}</span>
        <span>/</span>
        <span>{MATERIAL.title}</span>
      </div>

      <h1 className="mt-4 font-serif text-[26px] leading-tight" style={{ color: INK }}>
        {MATERIAL.title}
      </h1>

      <div className="mt-8 space-y-5">
        {MATERIAL.paragraphs.map((text, index) => (
          <div key={text.slice(0, 12)}>
            <p className="text-[15px] leading-[1.95]" style={{ color: INK }}>
              {text}
            </p>
            {/* 讲义里被划上的那一句 —— 在真实产品里，笔记与边注就长在这个位置。 */}
            {index === 1 && (
              <p
                className="mt-5 border-l-2 pl-5 font-serif text-[17px] leading-[1.8]"
                style={{ borderColor: ACCENT, color: INK }}
              >
                {MATERIAL.pull}
              </p>
            )}
          </div>
        ))}
      </div>

      <section className="mt-10 rounded-md p-6" style={{ backgroundColor: SURFACE, border: `1px solid ${HAIR}` }}>
        <Micro>试一道</Micro>
        <p className="mt-2 font-serif text-[17px] leading-relaxed" style={{ color: INK }}>
          {MATERIAL.question}
        </p>
        <input
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          placeholder="写下来，或者只写你打算怎么算"
          className="mt-4 w-full border-0 border-b bg-transparent py-2 text-[14px] outline-none placeholder:text-[13px]"
          style={{ borderColor: HAIR, color: INK }}
        />
        <div className="mt-4 flex items-center gap-4">
          <button
            type="button"
            onClick={() => setSubmitted(true)}
            disabled={!answer.trim()}
            className="rounded-full px-4 py-1.5 text-[12.5px] transition-opacity disabled:opacity-30"
            style={{ backgroundColor: INK, color: '#FBF9F4' }}
          >
            交给她看
          </button>
          {submitted && (
            <span className="text-[12px]" style={{ color: MUTED }}>
              预览里不判分 —— 这里只演"交上去之后会发生什么"。
            </span>
          )}
        </div>
      </section>

      {/* 启示在聚焦里的样子：**贴在底部的一条带子**，不遮正文，不弹窗。
          它只在"和手上这件事有关"的时候出现。 */}
      {!dismissed && (
        <div className="sticky bottom-0 -mx-10 mt-10 px-10 pt-4 pb-5" style={{ background: 'linear-gradient(to top, #FBF9F4 62%, rgba(251,249,244,0))' }}>
          <div
            className="flex items-center gap-3 rounded-md px-4 py-3"
            style={{ backgroundColor: SURFACE, border: `1px solid ${HAIR}` }}
          >
            <InsightMark />
            <span className="min-w-0 flex-1 text-[12.5px] leading-5" style={{ color: MUTED }}>
              这条启示和你正在做的题有关 —— 前三次做对都用了提示。
            </span>
            <button
              type="button"
              onClick={onOpenInsight}
              className="shrink-0 text-[12.5px] transition-opacity hover:opacity-60"
              style={{ color: ACCENT }}
            >
              看看
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ───────────────────────── 轨迹 ───────────────────────── */

export function TrajectoryView({
  onOpenInsight,
  dismissed,
}: {
  onOpenInsight: () => void
  dismissed: boolean
}) {
  return (
    <div className="mx-auto w-full max-w-[720px] px-10 py-12">
      <div className="flex items-baseline gap-3">
        <h1 className="font-serif text-[26px] leading-tight" style={{ color: INK }}>
          轨迹
        </h1>
        <span className="font-mono-cjk text-[12px]" style={{ color: FAINT }}>
          2026-09-03 → 2026-10-16
        </span>
      </div>
      <p className="mt-2.5 text-[12.5px]" style={{ color: MUTED }}>
        这里只列真的发生过的事。这条启示引的那几行，左边有一道赭色的线。
      </p>

      <ol className="relative mt-9 pl-[86px]">
        {/* 时间轴本身 */}
        <span
          aria-hidden
          className="absolute top-2 bottom-2 left-[68px] w-px"
          style={{ backgroundColor: HAIR }}
        />
        {INSIGHT.timeline.map((event) => {
          const cited = Boolean(event.cited)
          const body = (
            <>
              <span className="flex items-baseline gap-2.5">
                <span className="text-[11px]" style={{ color: FAINT }}>
                  {event.kind}
                </span>
                {event.anchor && (
                  <span className="text-[11px]" style={{ color: ACCENT }}>
                    就是这一次
                  </span>
                )}
                {cited && !event.anchor && (
                  <span className="text-[11px]" style={{ color: ACCENT }}>
                    启示引用
                  </span>
                )}
              </span>
              <span className="mt-1 block text-[13.5px] leading-6" style={{ color: INK }}>
                {event.title}
              </span>
            </>
          )

          return (
            <li key={event.id} className="relative pb-6">
              <span
                aria-hidden
                className="absolute top-[7px] -left-[24px] rounded-full"
                style={{
                  width: cited ? 7 : 5,
                  height: cited ? 7 : 5,
                  marginLeft: cited ? -1 : 0,
                  backgroundColor: cited ? ACCENT : '#FFFFFF',
                  border: `1px solid ${cited ? ACCENT : '#CFC8BA'}`,
                }}
              />
              <span
                className="font-mono-cjk absolute top-0 -left-[86px] w-[52px] text-right text-[11.5px]"
                style={{ color: FAINT }}
              >
                {event.at.slice(5)}
              </span>

              {cited ? (
                <button
                  type="button"
                  onClick={onOpenInsight}
                  className="block w-full border-l-2 pl-3 text-left transition-colors hover:bg-black/[0.015]"
                  style={{ borderColor: ACCENT }}
                >
                  {body}
                </button>
              ) : (
                <div className="border-l-2 pl-3" style={{ borderColor: 'transparent' }}>
                  {body}
                </div>
              )}
            </li>
          )
        })}
      </ol>

      <div className="mt-2 pl-0">
        <Rule />
        <div className="flex items-center gap-2.5 pt-4">
          <InsightMark />
          <span className="text-[12.5px]" style={{ color: MUTED }}>
            9 月 26 日之后的三次，都带着提示。
          </span>
          {!dismissed && (
            <button
              type="button"
              onClick={onOpenInsight}
              className="text-[12.5px] underline decoration-1 underline-offset-4 transition-opacity hover:opacity-60"
              style={{ color: MUTED, textDecorationColor: HAIR }}
            >
              看这条启示
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
