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
/**
 * 这一页的纸与墨。
 *
 * ⚠️ **值不在这里**，在 `index.css` 的 `--insight-*` 里。这么绕只为一件事：**暗色只改一处**。
 * 之前这些色值以字面量散在两个文件里十几处，加暗色要一寸一寸改，漏一处就是暗底上的一块亮斑。
 * 现在 `.dark` 覆盖同一组变量，这边一行都不用动。
 *
 * ⚠️ 它们故意**不叫** `--color-ink` 那种通用名：这不是全站语言（全站中性、这一页暖纸 + 赭）。
 * 要不要合并是产品决定，记在计划 §6。
 */
export const INK = 'var(--insight-ink)'
export const MUTED = 'var(--insight-muted)'
export const FAINT = 'var(--insight-faint)'
export const HAIR = 'var(--insight-hair)'
export const ACCENT = 'var(--insight-accent)'
export const SURFACE = 'var(--insight-surface)'
/** 「用了提示」那枚小标签的底。它很淡，但必须比正文暖一点，否则看不见。 */
export const TINT = 'var(--insight-tint)'

/* ───────────────────────── 共用的小零件 ───────────────────────── */

/**
 * 一条记录的**说法**：一句话 + 它是"用了提示"还是"独立"。
 *
 * ⚠️ **三个视图共用这一个组件**，不是三处各写一遍。
 * 这一页最大的冗余就是"同一批记录两种说法" —— 差一点点措辞，读者就以为是两件事。
 * 所以：**措辞活在数据里（一处），标记活在组件里（一处）**。
 *
 * `hinted === undefined` 表示"这条不是证据"（资料、边注、对话、决定）⇒ 不打标记。
 * 给它们打一个"独立"是在编 —— 那些事本来就没有"提示"这回事。
 *
 * `fill` 决定那句话要不要占满整行把标记推到最右：
 * - 面板里**要**（标记成一列，四行对得齐）；
 * - 轨迹里**不要** —— 那一行有一千像素宽，标记飘到最右边就和它描述的那句话失散了。
 */
function RecordLabel({
  what,
  hinted,
  fill = true,
}: {
  what: string
  hinted?: boolean
  fill?: boolean
}) {
  return (
    <>
      <span
        className={`min-w-0 text-[13px] leading-6 ${fill ? 'flex-1' : ''}`}
        style={{ color: INK }}
      >
        {what}
      </span>
      {hinted === undefined ? null : hinted ? (
        <span
          className="shrink-0 rounded-sm px-1 py-px text-[11px]"
          style={{ color: ACCENT, backgroundColor: TINT }}
        >
          用了提示
        </span>
      ) : (
        <span className="shrink-0 text-[11px]" style={{ color: MUTED }}>
          独立
        </span>
      )}
    </>
  )
}

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
    <span className="text-[11px] tracking-[0.02em]" style={{ color: FAINT }}>
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
        <span className="font-mono-cjk text-[11px]" style={{ color: FAINT }}>
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
          <span className="text-[12px]" style={{ color: MUTED }}>
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
          <p className="mt-3 text-[19px] leading-[1.7]" style={{ color: MUTED }}>
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
                    <RecordLabel what={row.what} hinted={row.hinted} />
                  </button>
                  {open && (
                    <p className="pb-3 pl-[86px] text-[12px] leading-6" style={{ color: MUTED }}>
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
                <p className="text-[13px]" style={{ color: INK }}>
                  {settled.title}
                </p>
                <button
                  type="button"
                  onClick={() => onAction(null)}
                  className="ml-auto shrink-0 text-[12px] underline decoration-1 underline-offset-4 transition-opacity hover:opacity-60"
                  style={{ color: MUTED, textDecorationColor: HAIR }}
                >
                  撤销
                </button>
              </div>
              <p className="mt-1.5 text-[12px] leading-6" style={{ color: MUTED }}>
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
                  className="text-[13px] underline decoration-1 underline-offset-4 transition-opacity hover:opacity-60"
                  /* ⚠️ 三个动作**同一种分量** —— 不能把"知道了"做成主按钮。
                     那等于在暗示"接受是默认"，而这条观察只是一个观察。 */
                  style={{ color: MUTED, textDecorationColor: HAIR }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </section>

        <p className="mt-8 text-[11px] leading-5" style={{ color: FAINT }}>
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
  insightOpen,
}: {
  onOpenInsight: () => void
  dismissed: boolean
  /** 右边的面板是不是已经开着。开着时**这一行入口不再渲染** —— 见下面注释。 */
  insightOpen: boolean
}) {
  return (
    <div className="mx-auto w-full max-w-[720px] px-10 py-12">
      {/* 启示的入口：**一行**，不是横幅、不是红点。它不打断你，但一直在。
          ⚠️ 面板开着时它消失：同一个东西不该在同一屏有两个说法。
          代价是"多条观察时找不到第二条" —— 今天只有一条，记在计划 P1 的风险里。 */}
      {!dismissed && !insightOpen && (
        <button
          type="button"
          data-insight-entry="closed"
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

      <h1 className="font-serif text-[27px] leading-tight" style={{ color: INK }}>
        {SPACE.name}
      </h1>
      {/* ⚠️ 这里原来写「目标 · 两周内…」，和左栏第 2 行**一字不差**。
          空间叫什么、图什么，是左栏的事；中栏该说的是**跨度** —— 那是只有这里才有的一句。 */}
      <p className="font-mono-cjk mt-2.5 text-[12px]" style={{ color: MUTED }}>
        {SPACE.since} → 2026-10-16
      </p>

      <section className="mt-12">
        <div className="mb-3">
          <span className="text-[12px] tracking-[0.14em]" style={{ color: FAINT }}>
            最近
          </span>
        </div>
        <Rule />
        <ul>
          {SPACE.recent.map((row) => (
            <li
              key={row.at + row.what}
              className="flex items-baseline gap-3 py-3"
              style={{ borderBottom: `1px solid ${HAIR}` }}
            >
              <span className="font-mono-cjk w-[52px] shrink-0 text-[12px]" style={{ color: FAINT }}>
                {row.at}
              </span>
              {/* ⚠️ 这里**故意不传 `hinted`**。
                  时间流只回答"发生了什么"：做对了。至于"靠没靠提示"，那是这条启示要说的事。
                  两处都标上，右栏就变成左边那三行的复制；不标，右栏才真的多给一层信息。 */}
              <RecordLabel what={row.what} />
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
                  <span className="block text-[13px]" style={{ color: INK }}>
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
  insightOpen,
}: {
  onOpenInsight: () => void
  dismissed: boolean
  insightOpen: boolean
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

      <h1 className="mt-4 font-serif text-[27px] leading-tight" style={{ color: INK }}>
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
                className="mt-5 border-l-2 pl-5 font-serif text-[19px] leading-[1.8]"
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
        <p className="mt-2 font-serif text-[19px] leading-relaxed" style={{ color: INK }}>
          {MATERIAL.question}
        </p>
        <input
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          placeholder="写下来，或者只写你打算怎么算"
          className="mt-4 w-full border-0 border-b bg-transparent py-2 text-[13px] outline-none placeholder:text-[13px]"
          style={{ borderColor: HAIR, color: INK }}
        />
        <div className="mt-4 flex items-center gap-4">
          <button
            type="button"
            onClick={() => setSubmitted(true)}
            disabled={!answer.trim()}
            className="rounded-full px-4 py-1.5 text-[12px] transition-opacity disabled:opacity-30"
            style={{ backgroundColor: INK, color: 'var(--insight-paper)' }}
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

      {/* 启示在聚焦里的样子：**跟着这一页走的一条注**，不是压在正文上的浮条。
          ⚠️ 早先做过 `sticky bottom-0`，结果在矮屏上把"交给她看"按钮盖住了 ——
          那正是这一页要避免的事：它不该因为存在而打断你。所以放在正文之后、贴近这道题。
          ⚠️ 面板开着时这条注也不渲染 —— 它和面板正文说的是同一句话，而面板就在旁边。 */}
      {!dismissed && !insightOpen && (
        <div className="mt-9" style={{ borderTop: `1px solid ${HAIR}` }}>
          <div className="flex items-start gap-2.5 pt-4">
            <span className="mt-2">
              <InsightMark />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] leading-6" style={{ color: MUTED }}>
                这条观察和你正在做的题有关 —— 前三次做对都用了提示。
              </p>
              <button
                type="button"
                data-insight-entry="closed"
                onClick={onOpenInsight}
                className="mt-1.5 text-[12px] underline decoration-1 underline-offset-4 transition-opacity hover:opacity-60"
                style={{ color: ACCENT, textDecorationColor: HAIR }}
              >
                看看这条观察
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ───────────────────────── 轨迹 ───────────────────────── */

export function TrajectoryView({
  onOpenInsight,
  insightOpen,
}: {
  onOpenInsight: () => void
  /** 面板开着时，被引用的那几行不再可点 —— 点了也只是把同一块内容再指一次。 */
  insightOpen: boolean
}) {
  return (
    <div className="mx-auto w-full max-w-[720px] px-10 py-12">
      <div className="flex items-baseline gap-3">
        <h1 className="font-serif text-[27px] leading-tight" style={{ color: INK }}>
          轨迹
        </h1>
        <span className="font-mono-cjk text-[12px]" style={{ color: FAINT }}>
          2026-09-03 → 2026-10-16
        </span>
      </div>
      <p className="mt-2.5 text-[12px]" style={{ color: MUTED }}>
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
              <span className="mt-1 flex items-baseline gap-2">
                <RecordLabel what={event.title} hinted={event.hinted} fill={false} />
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
                  backgroundColor: cited ? ACCENT : 'var(--insight-paper)',
                  border: `1px solid ${cited ? ACCENT : 'var(--insight-dot)'}`,
                }}
              />
              <span
                className="font-mono-cjk absolute top-0 -left-[86px] w-[52px] text-right text-[11px]"
                style={{ color: FAINT }}
              >
                {event.at.slice(5)}
              </span>

              {cited && !insightOpen ? (
                <button
                  type="button"
                  data-insight-entry="closed"
                  onClick={onOpenInsight}
                  className="block w-full border-l-2 pl-3 text-left transition-colors hover:bg-black/[0.015]"
                  style={{ borderColor: ACCENT }}
                >
                  {body}
                </button>
              ) : (
                <div
                  className="border-l-2 pl-3"
                  style={{ borderColor: cited ? ACCENT : 'transparent' }}
                >
                  {body}
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
