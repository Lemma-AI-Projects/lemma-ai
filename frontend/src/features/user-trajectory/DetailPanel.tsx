import { useState } from 'react'
import type { ReactNode } from 'react'

import {
  CANDIDATE_STATE_LABEL,
  EVIDENCE_BY_ID,
  EVIDENCE_KIND_LABEL,
  EPISTEMIC,
  EVENT_BY_ID,
  EVENT_KIND_LABEL,
  INTERPRETATION_BY_ID,
  OBJECT_BY_ID,
  OBJECT_KIND_LABEL,
  PARENT_BY_ID,
  VERDICT_LABEL,
  byLabel,
  childrenOf,
  confidenceLabel,
  connectionsFor,
  eventsForObject,
  insightsForObject,
  md,
  refOf,
  statusLabel,
} from './data'
import { truncate } from './kit'
import { EpiMark, IconBack, IconChevron, IconClose } from './marks'
import { Label, Quiet, RefLink, TextAction } from './parts'
import type { Store } from './store'

/**
 * 右栏。六种东西共用同一副骨架：
 *
 *   类型 ················ 暂存 · 关闭
 *   标题（衬线，一句话）
 *   一行元信息
 *   最有用的那一块（默认展开）
 *   其余（折叠）
 *   一个主动作
 *
 * 只有「什么算最有用的那一块」随类型变。全页只有这一处细节面板 ——
 * 没有抽屉、弹窗、右键菜单跟它抢位置。
 */
export function DetailPanel({ s }: { s: Store }) {
  const sel = s.selected
  const [draft, setDraft] = useState('')
  const [correcting, setCorrecting] = useState(false)

  if (!sel) return null
  const ref = refOf(sel.id)
  const saved = s.inCollection(sel.id)

  const typeLabel =
    sel.type === 'object'
      ? OBJECT_KIND_LABEL[OBJECT_BY_ID.get(sel.id)?.kind ?? 'material']
      : sel.type === 'event'
        ? '事件'
        : sel.type === 'parent'
          ? '一段过程'
          : sel.type === 'evidence'
            ? '证据'
            : sel.type === 'candidate'
              ? '候选'
              : '解释'

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 px-5 py-3">
        {s.path.length > 1 ? (
          <button
            type="button"
            onClick={s.back}
            aria-label="回到上一步"
            className="text-zinc-400 dark:text-zinc-500 transition-colors hover:text-zinc-950 dark:hover:text-zinc-50"
          >
            <IconBack />
          </button>
        ) : null}
        <span className="text-[9.5px] tracking-[0.16em] text-zinc-400 dark:text-zinc-500">{typeLabel}</span>
        <div className="ml-auto flex items-center gap-4">
          <button
            type="button"
            onClick={() => s.save(sel.id, sel.type)}
            className={`text-[10px] transition-colors ${saved ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50'}`}
          >
            {saved ? '已暂存' : '暂存'}
          </button>
          <button
            type="button"
            onClick={s.closeDetail}
            aria-label="关闭"
            className="text-zinc-400 dark:text-zinc-500 transition-colors hover:text-zinc-950 dark:hover:text-zinc-50"
          >
            <IconClose />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-5 pb-10">
        {sel.type === 'object' ? <ObjectBody s={s} id={sel.id} /> : null}
        {sel.type === 'event' ? <EventBody s={s} id={sel.id} /> : null}
        {sel.type === 'parent' ? <ParentBody s={s} id={sel.id} /> : null}
        {sel.type === 'evidence' ? <EvidenceBody s={s} id={sel.id} /> : null}
        {sel.type === 'insight' ? (
          <InsightBody s={s} id={sel.id} draft={draft} setDraft={setDraft} correcting={correcting} setCorrecting={setCorrecting} />
        ) : null}
        {sel.type === 'candidate' ? <CandidateBody s={s} id={sel.id} /> : null}
        {!ref ? <Quiet>这条记录找不到。</Quiet> : null}
      </div>
    </div>
  )
}

function Head({ title, sub, meta }: { title: string; sub?: string; meta?: string }) {
  return (
    <div>
      <h2 className="font-serif text-[17px] leading-[1.45] tracking-[-0.005em] text-zinc-950 dark:text-zinc-50">{title}</h2>
      {sub ? <p className="mt-2 text-[12px] leading-[1.75] text-zinc-500 dark:text-zinc-400">{sub}</p> : null}
      {meta ? <p className="mt-2.5 text-[10px] tabular-nums text-zinc-400 dark:text-zinc-500">{meta}</p> : null}
    </div>
  )
}

function Block({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div className="mt-6">
      <div className="mb-2 flex items-baseline justify-between">
        <Label plain>{label}</Label>
        {hint ? <span className="text-[9.5px] tabular-nums text-zinc-400 dark:text-zinc-500/80">{hint}</span> : null}
      </div>
      {children}
    </div>
  )
}

/** 一行「日期 + 标题」，点得动。右栏里所有小列表都用它。 */
function MiniRow({
  onClick,
  date,
  children,
  suffix,
}: {
  onClick: () => void
  date?: string
  children: ReactNode
  suffix?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="-mx-2 block w-full px-2 py-1.5 text-left transition-colors hover:bg-zinc-900/[0.035] dark:bg-zinc-100/[0.035]"
    >
      <span className="flex items-start gap-2.5">
        {date ? <span className="w-[32px] shrink-0 pt-px text-[9.5px] tabular-nums text-zinc-400 dark:text-zinc-500">{date}</span> : null}
        <span className="min-w-0 flex-1 text-[12px] leading-[1.65] text-zinc-900/85 dark:text-zinc-100/85">
          <span className="line-clamp-2">{children}</span>
        </span>
        {suffix ? <span className="shrink-0 pt-px text-[9.5px] text-zinc-400 dark:text-zinc-500/70">{suffix}</span> : null}
      </span>
    </button>
  )
}

function ObjectBody({ s, id }: { s: Store; id: string }) {
  const [all, setAll] = useState(false)
  const o = OBJECT_BY_ID.get(id)
  if (!o) return null
  const evs = eventsForObject(id)
  const ins = insightsForObject(id)
  const conns = connectionsFor(id)
  const shown = all ? evs : evs.slice(-3).reverse()
  const range = `${o.from ?? '—'}${o.to ? ` → ${o.to}` : ' → 至今'}`

  return (
    <div>
      <Head title={o.title} sub={o.sub} meta={`${range} · ${statusLabel(o.status)}`} />

      {conns.length > 0 ? (
        <button
          type="button"
          onClick={() => s.switchPerspective('explore')}
          className="mt-4 flex w-full items-center justify-between border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-left transition-colors hover:border-zinc-400/60 dark:hover:border-zinc-600 hover:bg-zinc-900/[0.02] dark:hover:bg-zinc-100/[0.02]"
        >
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">连到 {conns.length} 处</span>
          <span className="text-[10px] text-zinc-900 dark:text-zinc-100">在探索里看 →</span>
        </button>
      ) : null}

      <Block label="出现在" hint={`${evs.length} 件`}>
        {evs.length === 0 ? <Quiet>没有事件挂在这个对象上。</Quiet> : null}
        {shown.map((e) => (
          <MiniRow key={e.id} date={md(e.date)} onClick={() => s.select(e.id)}>
            {e.title}
          </MiniRow>
        ))}
        {evs.length > 3 ? (
          <TextAction muted onClick={() => setAll((v) => !v)} className="mt-2">
            {all ? '只看最近三件' : `再看 ${evs.length - 3} 件`}
          </TextAction>
        ) : null}
      </Block>

      {ins.length > 0 ? (
        <Block label="关于它的解释">
          {ins.slice(0, 3).map((i) => (
            <MiniRow key={i.id} onClick={() => s.select(i.id)}>
              <span className="mr-1.5 inline-flex translate-y-[1px]">
                <EpiMark value={i.epistemic} size={11} />
              </span>
              {i.statement}
            </MiniRow>
          ))}
        </Block>
      ) : null}
    </div>
  )
}

function EventBody({ s, id }: { s: Store; id: string }) {
  const e = EVENT_BY_ID.get(id)
  if (!e) return null
  return (
    <div>
      <p className="text-[9.5px] tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
        {EVENT_KIND_LABEL[e.kind]} · <span className="tabular-nums">{e.date} {e.time}</span>
      </p>
      <h2 className="mt-2 text-[13.5px] leading-[1.6] text-zinc-950 dark:text-zinc-50">{e.title}</h2>
      {e.detail ? <p className="mt-2 text-[12px] leading-[1.8] text-zinc-500 dark:text-zinc-400">{e.detail}</p> : null}

      {e.objectIds.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {e.objectIds.map((o) => (
            <RefLink key={o} s={s} id={o} className="text-[11px] text-zinc-500 dark:text-zinc-400" />
          ))}
        </div>
      ) : null}

      <Block label="它产出了什么">
        {e.evidenceIds.length === 0 ? (
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500">什么都没产出。</p>
        ) : (
          e.evidenceIds.map((eid) => {
            const ev = EVIDENCE_BY_ID.get(eid)
            if (!ev) return null
            return (
              <MiniRow key={eid} onClick={() => s.select(eid, 'evidence')}>
                {ev.observed}
              </MiniRow>
            )
          })
        )}
      </Block>

      {e.parentId ? (
        <div className="mt-6 border-t border-zinc-200 dark:border-zinc-800 pt-3">
          <TextAction muted onClick={() => s.select(e.parentId as string, 'parent')}>
            属于「{truncate(refOf(e.parentId)?.label ?? '', 16)}」
          </TextAction>
        </div>
      ) : null}
    </div>
  )
}

function EvidenceBody({ s, id }: { s: Store; id: string }) {
  const ev = EVIDENCE_BY_ID.get(id)
  if (!ev) return null
  const usedIn = [...INTERPRETATION_BY_ID.values()].filter((i) =>
    [...i.supports, ...i.weakens, ...i.contradicts, ...i.qualifies].includes(id),
  )
  return (
    <div>
      <p className="text-[13px] leading-[1.75] text-zinc-950 dark:text-zinc-50">{ev.observed}</p>
      <p className="mt-2 text-[9.5px] tracking-[0.04em] text-zinc-400 dark:text-zinc-500">
        {md(ev.date)} · {EVIDENCE_KIND_LABEL[ev.kind]} · {VERDICT_LABEL[ev.verdict] ?? ev.verdict} · {byLabel(ev.by)}
      </p>

      <Block label="它支持">
        <p className="text-[12px] leading-[1.75] text-zinc-900/85 dark:text-zinc-100/85">{ev.supports}</p>
      </Block>
      <Block label="它不能证明">
        <p className="text-[12px] leading-[1.75] text-zinc-900/85 dark:text-zinc-100/85">{ev.notSupport}</p>
      </Block>
      <Block label="局限">
        <p className="text-[11px] leading-[1.7] text-zinc-400 dark:text-zinc-500">{ev.limitation}</p>
      </Block>

      <Block label="用在哪">
        {usedIn.length === 0 ? (
          <p className="text-[11px] leading-[1.7] text-zinc-400 dark:text-zinc-500">没有任何解释用上它。它可以一直挂着。</p>
        ) : (
          usedIn.map((i) => (
            <MiniRow key={i.id} onClick={() => s.select(i.id)}>
              {i.statement}
            </MiniRow>
          ))
        )}
      </Block>

      {ev.activityId ? (
        <div className="mt-6 border-t border-zinc-200 dark:border-zinc-800 pt-3">
          <TextAction onClick={() => s.select(ev.activityId as string)}>回到产生它的那次活动</TextAction>
        </div>
      ) : null}
    </div>
  )
}

function ParentBody({ s, id }: { s: Store; id: string }) {
  const p = PARENT_BY_ID.get(id)
  if (!p) return null
  const kids = childrenOf(id)
  const open = s.expanded.includes(id)
  return (
    <div>
      <Head
        title={p.title}
        sub={p.why}
        meta={`${p.from} → ${p.to} · ${p.origin === 'system' ? '系统并出来的' : '他自己划的'}`}
      />
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <TextAction onClick={() => s.toggleParent(id)}>{open ? '在时间轴上收起' : '在时间轴上展开'}</TextAction>
        {p.origin === 'system' ? <TextAction muted onClick={() => s.splitParent(id)}>拆开这一段</TextAction> : null}
      </div>
      <Block label="包含" hint={`${kids.length} 件`}>
        {kids.map((e) => (
          <MiniRow key={e.id} date={md(e.date)} onClick={() => s.select(e.id)}>
            {e.title}
          </MiniRow>
        ))}
      </Block>
    </div>
  )
}

function InsightBody({
  s,
  id,
  draft,
  setDraft,
  correcting,
  setCorrecting,
}: {
  s: Store
  id: string
  draft: string
  setDraft: (v: string) => void
  correcting: boolean
  setCorrecting: (v: boolean) => void
}) {
  const i = s.insights.find((x) => x.id === id)
  const [openGroups, setOpenGroups] = useState<string[]>(['contradicts'])
  if (!i) return null
  const e = EPISTEMIC[i.epistemic]
  const groups: { key: string; title: string; ids: string[]; strong?: boolean }[] = [
    { key: 'supports', title: '支撑它', ids: i.supports },
    { key: 'weakens', title: '削弱它', ids: i.weakens },
    { key: 'qualifies', title: '给它加条件', ids: i.qualifies },
    { key: 'contradicts', title: '反驳它', ids: i.contradicts, strong: true },
  ]
  const total = groups.reduce((n, g) => n + g.ids.length, 0)
  const toggle = (k: string) => setOpenGroups((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]))

  return (
    <div>
      <div className="flex items-center gap-2.5">
        <EpiMark value={i.epistemic} className="text-zinc-500 dark:text-zinc-400" />
        <span className="text-[9.5px] tracking-[0.06em] text-zinc-400 dark:text-zinc-500">{e.label}</span>
        <span className="text-[9.5px] tabular-nums text-zinc-400 dark:text-zinc-500/70">{i.date}</span>
        {i.confidence ? (
          <span className="text-[9.5px] text-zinc-400 dark:text-zinc-500/70">置信 {confidenceLabel(i.confidence)}</span>
        ) : null}
      </div>
      <p className="mt-3 font-serif text-[15px] leading-[1.75] text-zinc-950 dark:text-zinc-50">{i.statement}</p>
      <p className="mt-2 text-[10px] leading-[1.7] text-zinc-400 dark:text-zinc-500/90">{e.hint}</p>

      {i.basis ? (
        <Block label="依据">
          <p className="text-[11px] leading-[1.7] text-zinc-400 dark:text-zinc-500">{i.basis}</p>
        </Block>
      ) : null}

      <Block label="证据" hint={total === 0 ? '一条也没有' : `${total} 条`}>
        {total === 0 ? (
          <p className="text-[11px] leading-[1.75] text-zinc-400 dark:text-zinc-500">
            没有任何证据挂着。这条属于「他说的」，不属于「系统看到的」。
          </p>
        ) : (
          groups.map((g) => {
            if (g.ids.length === 0) return null
            const open = openGroups.includes(g.key)
            return (
              <div key={g.key} className="border-t border-zinc-200/80 dark:border-zinc-800/80 first:border-t-0">
                <button
                  type="button"
                  onClick={() => toggle(g.key)}
                  className="flex w-full items-center gap-2 py-2 text-left"
                >
                  <span className={g.strong ? 'text-[11px] text-zinc-950 dark:text-zinc-50' : 'text-[11px] text-zinc-500 dark:text-zinc-400'}>{g.title}</span>
                  <span className="text-[9.5px] tabular-nums text-zinc-400 dark:text-zinc-500/80">{g.ids.length}</span>
                  <span className="ml-auto text-zinc-400 dark:text-zinc-500/60">
                    <IconChevron open={open} size={8} />
                  </span>
                </button>
                {open ? (
                  <div className="mb-1 border-l border-zinc-200 dark:border-zinc-800 pl-3">
                    {g.ids.map((eid) => {
                      const ev = EVIDENCE_BY_ID.get(eid)
                      if (!ev) return null
                      return (
                        <MiniRow key={eid} date={md(ev.date)} onClick={() => s.select(eid, 'evidence')}>
                          {ev.observed}
                        </MiniRow>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            )
          })
        )}
      </Block>

      {i.reinterpretedAt ? (
        <div className="mt-6 border-l-2 border-amber-400/70 bg-amber-50/60 py-2 pl-3 dark:border-amber-500/40 dark:bg-amber-950/30">
          <div className="text-[9.5px] tracking-[0.06em] text-amber-700 dark:text-amber-400">{i.reinterpretedAt} 被收窄过</div>
          <p className="mt-1 text-[11px] leading-[1.7] text-zinc-900/80 dark:text-zinc-100/80">{i.reinterpretation}</p>
          <p className="mt-1.5 text-[9.5px] leading-[1.6] text-zinc-400 dark:text-zinc-500">
            旧版本没被删掉。它仍然属于 {i.reinterpretedAt} 之前。
          </p>
        </div>
      ) : null}

      <div className="mt-6 border-t border-zinc-200 dark:border-zinc-800 pt-4">
        {s.responses[i.id] ? (
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
            你的回应：
            {s.responses[i.id] === 'confirmed' ? '说得对' : s.responses[i.id] === 'corrected' ? '你改过它的说法' : '不是你'}
          </p>
        ) : (
          <div className="flex flex-wrap gap-4">
            <TextAction onClick={() => s.respond(i.id, 'confirmed')}>说得对</TextAction>
            <TextAction
              onClick={() => {
                setCorrecting(true)
                setDraft(i.statement)
              }}
            >
              改说法
            </TextAction>
            <TextAction muted onClick={() => s.respond(i.id, 'rejected')}>
              不是我
            </TextAction>
          </div>
        )}

        {correcting ? (
          <div className="mt-3">
            <textarea
              value={draft}
              onChange={(ev) => setDraft(ev.target.value)}
              rows={3}
              className="w-full border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-2.5 py-2 text-[12px] leading-[1.7] text-zinc-950 dark:text-zinc-50 outline-none transition-colors focus:border-zinc-900 dark:focus:border-zinc-100"
            />
            <div className="mt-2 flex items-center gap-4">
              <TextAction
                onClick={() => {
                  s.respond(i.id, 'corrected', draft)
                  setCorrecting(false)
                }}
              >
                用我的说法
              </TextAction>
              <TextAction muted onClick={() => setCorrecting(false)}>
                算了
              </TextAction>
            </div>
            <p className="mt-1.5 text-[9.5px] text-zinc-400 dark:text-zinc-500/80">改完仍然是「你的说法」，不是事实。</p>
          </div>
        ) : null}
      </div>

      <p className="mt-4 text-[9.5px] leading-[1.6] text-zinc-400 dark:text-zinc-500/80">
        谁说的：{i.assertedBy === 'user' ? '他自己' : '系统'} · 生效：
        {i.effectiveTo ? `${i.effectiveFrom} → ${i.effectiveTo}` : `${i.effectiveFrom} 起`}
      </p>
    </div>
  )
}

function CandidateBody({ s, id }: { s: Store; id: string }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const c = s.candidates.find((x) => x.id === id)
  if (!c) return null
  return (
    <div>
      <div className="flex items-center gap-2.5">
        <span className={`h-[5px] w-[5px] ${c.state === 'emerging' ? 'bg-amber-600 dark:bg-amber-400' : 'bg-zinc-300 dark:bg-zinc-600'}`} />
        <span className="text-[9.5px] tracking-[0.06em] text-zinc-400 dark:text-zinc-500">{CANDIDATE_STATE_LABEL[c.state]}</span>
        <span className="text-[9.5px] text-zinc-400 dark:text-zinc-500/70">始于 {md(c.firstSeen)}</span>
      </div>
      <p className="mt-3 text-[13px] leading-[1.75] text-zinc-950 dark:text-zinc-50">{c.statement}</p>
      <p className="mt-2 text-[11px] leading-[1.75] text-zinc-500 dark:text-zinc-400">{c.signalNote}</p>

      <Block label="攒它的记录">
        <div className="flex flex-col gap-1.5">
          {c.signalIds.map((sid) => {
            const ev = EVIDENCE_BY_ID.get(sid)
            return (
              <RefLink key={sid} s={s} id={sid} className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {ev ? truncate(ev.observed, 26) : truncate(refOf(sid)?.label ?? sid, 26)}
              </RefLink>
            )
          })}
        </div>
      </Block>

      <Block label="为什么还没定">
        <p className="text-[11px] leading-[1.75] text-zinc-400 dark:text-zinc-500">{c.why}</p>
      </Block>

      {c.state === 'emerging' ? (
        <div className="mt-6 border-t border-zinc-200 dark:border-zinc-800 pt-4">
          {editing ? (
            <div>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={2}
                className="w-full border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-2.5 py-2 text-[12px] leading-[1.7] outline-none focus:border-zinc-900 dark:focus:border-zinc-100"
                placeholder="按你的说法改写它"
              />
              <div className="mt-2 flex gap-4">
                <TextAction
                  onClick={() => {
                    s.resolveCandidate(c.id, 'corrected')
                    setEditing(false)
                  }}
                >
                  用我的说法
                </TextAction>
                <TextAction muted onClick={() => setEditing(false)}>
                  算了
                </TextAction>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-4">
              <TextAction onClick={() => s.resolveCandidate(c.id, 'confirmed')}>说得对</TextAction>
              <TextAction
                onClick={() => {
                  setEditing(true)
                  setDraft(c.statement)
                }}
              >
                改说法
              </TextAction>
              <TextAction muted onClick={() => s.resolveCandidate(c.id, 'ignored')}>
                不是我
              </TextAction>
            </div>
          )}
        </div>
      ) : null}

      {c.state === 'resolved' && c.resolution ? (
        <p className="mt-6 border-t border-zinc-200 dark:border-zinc-800 pt-3 text-[10px] leading-[1.7] text-zinc-400 dark:text-zinc-500">
          {md(c.resolution.at)} · {c.resolution.note}。它不会被重新激活。
        </p>
      ) : null}
    </div>
  )
}
