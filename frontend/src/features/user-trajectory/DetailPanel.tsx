import { useState } from 'react'
import type { ReactNode } from 'react'

import {
  CANDIDATE_STATE_LABEL,
  EVIDENCE_BY_ID,
  EVENT_BY_ID,
  EVIDENCE_KIND_LABEL,
  EPISTEMIC,
  EVENT_KIND_LABEL,
  INTERPRETATION_BY_ID,
  OBJECT_BY_ID,
  OBJECT_KIND_LABEL,
  PARENT_BY_ID,
  VERDICT_LABEL,
  childrenOf,
  connectionsFor,
  eventsForObject,
  insightsForObject,
  md,
  refOf,
  statusLabel,
  byLabel,
  confidenceLabel,
} from './data'
import { truncate } from './kit'
import { EpistemicMark, Label, Quiet, RefLink, TextAction } from './parts'
import type { Store } from './store'

/**
 * 右栏。四种东西（对象 / 事件 / 证据 / 解释）共用同一副骨架：
 *
 *   类型标签 ·············· 暂存 · 关闭
 *   标题（衬线，一句话）
 *   一行元信息
 *   ─────────────
 *   最有用的那一件东西（默认展开）
 *   其余（折叠，按需展开）
 *   ─────────────
 *   一个主动作
 *
 * 只有「什么算最有用的那一件」随类型变。这是全页唯一一处细节面板 ——
 * 不再有抽屉、弹窗、右键菜单跟它抢位置。
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
      <div className="flex shrink-0 items-center gap-1.5 border-b border-border px-3 py-2">
        {s.path.length > 1 ? (
          <button
            type="button"
            onClick={s.back}
            aria-label="回到上一步"
            className="-ml-0.5 px-1 text-[13px] leading-none text-muted-foreground hover:text-foreground"
          >
            ←
          </button>
        ) : null}
        <span className="text-[10px] tracking-[0.08em] text-muted-foreground">{typeLabel}</span>
        <div className="ml-auto flex items-center gap-3">
          <button
            type="button"
            onClick={() => s.save(sel.id, sel.type)}
            className={saved ? 'text-[10px] text-foreground' : 'text-[10px] text-muted-foreground hover:text-foreground'}
          >
            {saved ? '已暂存' : '暂存'}
          </button>
          <button
            type="button"
            onClick={s.closeDetail}
            aria-label="关闭"
            className="text-[13px] leading-none text-muted-foreground hover:text-foreground"
          >
            ×
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-3.5 pb-8">
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
      <h2 className="font-serif text-[15px] leading-[1.5] text-foreground">{title}</h2>
      {sub ? <p className="mt-1 text-[12px] leading-[1.6] text-muted-foreground">{sub}</p> : null}
      {meta ? <p className="mt-1.5 text-[10px] tabular-nums text-muted-foreground/80">{meta}</p> : null}
    </div>
  )
}

function Block({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div className="mt-4">
      <div className="mb-1 flex items-baseline gap-2">
        <Label>{label}</Label>
        {hint ? <span className="text-[10px] text-muted-foreground/60">{hint}</span> : null}
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
      className="-mx-1 block w-full px-1 py-1 text-left hover:bg-muted/40"
    >
      <span className="flex items-start gap-2">
        {date ? <span className="w-[34px] shrink-0 pt-[2px] text-[10px] tabular-nums text-muted-foreground">{date}</span> : null}
        <span className="min-w-0 flex-1 text-[12px] leading-[1.55] text-foreground/85">
          <span className="line-clamp-2">{children}</span>
        </span>
        {suffix ? <span className="shrink-0 pt-[2px] text-[10px] text-muted-foreground/70">{suffix}</span> : null}
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
        <div className="mt-3 flex items-baseline justify-between">
          <span className="text-[11px] text-muted-foreground">连到 {conns.length} 处</span>
          <TextAction
            muted
            onClick={() => {
              s.switchPerspective('explore')
            }}
          >
            在探索里看 →
          </TextAction>
        </div>
      ) : null}

      <Block label="出现在" hint={`${evs.length} 件`}>
        {evs.length === 0 ? <Quiet>没有事件挂在这个对象上。</Quiet> : null}
        {shown.map((e) => (
          <MiniRow key={e.id} date={md(e.date)} onClick={() => s.select(e.id)}>
            {e.title}
          </MiniRow>
        ))}
        {evs.length > 3 ? (
          <TextAction muted onClick={() => setAll((v) => !v)} className="mt-1">
            {all ? '只看最近三件' : `再看 ${evs.length - 3} 件`}
          </TextAction>
        ) : null}
      </Block>

      {ins.length > 0 ? (
        <Block label="关于它的解释">
          {ins.slice(0, 3).map((i) => (
            <MiniRow key={i.id} onClick={() => s.select(i.id)}>
              <EpistemicMark value={i.epistemic} compact className="mr-1" />
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
      <p className="text-[10px] text-muted-foreground">
        {EVENT_KIND_LABEL[e.kind]} · <span className="tabular-nums">{e.date} {e.time}</span>
      </p>
      <h2 className="mt-1 text-[13px] leading-[1.6] text-foreground">{e.title}</h2>
      {e.detail ? <p className="mt-1.5 text-[12px] leading-[1.65] text-muted-foreground">{e.detail}</p> : null}

      {e.objectIds.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          {e.objectIds.map((o) => (
            <RefLink key={o} s={s} id={o} className="text-[11px] text-muted-foreground" />
          ))}
        </div>
      ) : null}

      <Block label="它产出了什么">
        {e.evidenceIds.length === 0 ? (
          <p className="text-[11px] leading-[1.6] text-muted-foreground">什么都没产出。</p>
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
        <div className="mt-4">
          <TextAction muted onClick={() => s.select(e.parentId as string, 'parent')}>
            属于「{truncate(refOf(e.parentId)?.label ?? '', 18)}」
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
      <p className="text-[13px] leading-[1.65] text-foreground">{ev.observed}</p>
      <p className="mt-1.5 text-[10px] text-muted-foreground">
        {md(ev.date)} · {EVIDENCE_KIND_LABEL[ev.kind]} · {VERDICT_LABEL[ev.verdict] ?? ev.verdict} · {byLabel(ev.by)}
      </p>

      <Block label="它支持">
        <p className="text-[12px] leading-[1.6] text-foreground/85">{ev.supports}</p>
      </Block>
      <Block label="它不能证明">
        <p className="text-[12px] leading-[1.6] text-foreground/85">{ev.notSupport}</p>
      </Block>
      <Block label="局限">
        <p className="text-[11px] leading-[1.6] text-muted-foreground">{ev.limitation}</p>
      </Block>

      <Block label="用在哪">
        {usedIn.length === 0 ? (
          <p className="text-[11px] leading-[1.6] text-muted-foreground">
            没有任何解释用上它。它可以一直挂着。
          </p>
        ) : (
          usedIn.map((i) => (
            <MiniRow key={i.id} onClick={() => s.select(i.id)}>
              {i.statement}
            </MiniRow>
          ))
        )}
      </Block>

      {ev.activityId ? (
        <div className="mt-5">
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
      <div className="mt-3 flex flex-wrap items-center gap-3">
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
      <div className="flex items-baseline gap-2">
        <EpistemicMark value={i.epistemic} />
        <span className="text-[10px] tabular-nums text-muted-foreground">{i.date}</span>
        {i.confidence ? <span className="text-[10px] text-muted-foreground/70">置信 {confidenceLabel(i.confidence)}</span> : null}
      </div>
      <p className="mt-1.5 font-serif text-[14px] leading-[1.7] text-foreground">{i.statement}</p>
      <p className="mt-1 text-[10px] leading-[1.6] text-muted-foreground/80">{e.hint}</p>

      {i.basis ? (
        <Block label="依据">
          <p className="text-[11px] leading-[1.6] text-muted-foreground">{i.basis}</p>
        </Block>
      ) : null}

      <Block label="证据" hint={total === 0 ? '一条也没有' : `${total} 条`}>
        {total === 0 ? (
          <p className="text-[11px] leading-[1.6] text-muted-foreground">
            没有任何证据挂着。这条属于「他说的」，不属于「系统看到的」。
          </p>
        ) : (
          groups.map((g) => {
            if (g.ids.length === 0) return null
            const open = openGroups.includes(g.key)
            return (
              <div key={g.key} className="mt-1">
                <button
                  type="button"
                  onClick={() => toggle(g.key)}
                  className="flex w-full items-baseline gap-2 py-0.5 text-left"
                >
                  <span className={g.strong ? 'text-[11px] text-foreground' : 'text-[11px] text-muted-foreground'}>
                    {g.title}
                  </span>
                  <span className="text-[10px] tabular-nums text-muted-foreground/70">{g.ids.length}</span>
                  <span className="text-[10px] text-muted-foreground/50">{open ? '−' : '+'}</span>
                </button>
                {open ? (
                  <div className="mt-0.5 border-l border-border/80 pl-2.5">
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
        <div className="mt-4 border-l-2 border-foreground/25 pl-2.5">
          <div className="text-[10px] text-muted-foreground">{i.reinterpretedAt} 被收窄过</div>
          <p className="mt-0.5 text-[11px] leading-[1.6] text-foreground/80">{i.reinterpretation}</p>
          <p className="mt-1 text-[10px] leading-[1.5] text-muted-foreground/70">
            旧版本没被删掉。它仍然属于 {i.reinterpretedAt} 之前。
          </p>
        </div>
      ) : null}

      <div className="mt-4 border-t border-border/70 pt-2.5">
        {s.responses[i.id] ? (
          <p className="text-[11px] text-muted-foreground">
            你的回应：
            {s.responses[i.id] === 'confirmed' ? '说得对' : s.responses[i.id] === 'corrected' ? '你改过它的说法' : '不是你'}
          </p>
        ) : (
          <div className="flex flex-wrap gap-3">
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
          <div className="mt-2">
            <textarea
              value={draft}
              onChange={(ev) => setDraft(ev.target.value)}
              rows={3}
              className="w-full border border-border bg-background px-2 py-1.5 text-[12px] leading-[1.6] outline-none focus:border-foreground/40"
            />
            <div className="mt-1.5 flex items-center gap-3">
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
            <p className="mt-1 text-[10px] leading-[1.5] text-muted-foreground/70">改完仍然是「你的说法」，不是事实。</p>
          </div>
        ) : null}
      </div>

      <p className="mt-3 text-[10px] leading-[1.5] text-muted-foreground/70">
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
      <div className="flex items-baseline gap-2">
        <span className="text-[10px] text-muted-foreground">{CANDIDATE_STATE_LABEL[c.state]}</span>
        <span className="text-[10px] text-muted-foreground/60">始于 {md(c.firstSeen)}</span>
      </div>
      <p className="mt-1.5 text-[13px] leading-[1.65] text-foreground">{c.statement}</p>
      <p className="mt-1.5 text-[11px] leading-[1.6] text-muted-foreground">{c.signalNote}</p>

      <Block label="攒它的记录">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {c.signalIds.map((sid) => {
            const ev = EVIDENCE_BY_ID.get(sid)
            return (
              <RefLink key={sid} s={s} id={sid} className="text-[11px] text-muted-foreground">
                {ev ? truncate(ev.observed, 22) : truncate(refOf(sid)?.label ?? sid, 22)}
              </RefLink>
            )
          })}
        </div>
      </Block>

      <Block label="为什么还没定">
        <p className="text-[11px] leading-[1.65] text-muted-foreground">{c.why}</p>
      </Block>

      {c.state === 'emerging' ? (
        <div className="mt-4 border-t border-border/70 pt-2.5">
          {editing ? (
            <div>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={2}
                className="w-full border border-border bg-background px-2 py-1.5 text-[12px] outline-none focus:border-foreground/40"
                placeholder="按你的说法改写它"
              />
              <div className="mt-1.5 flex gap-3">
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
            <div className="flex flex-wrap gap-3">
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
        <p className="mt-4 border-t border-border/70 pt-2.5 text-[11px] leading-[1.6] text-muted-foreground">
          {md(c.resolution.at)} · {c.resolution.note}。它不会被重新激活。
        </p>
      ) : null}
    </div>
  )
}

