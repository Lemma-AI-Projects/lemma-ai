import { useState } from 'react'

import {
  EVIDENCE_BY_ID,
  EVENT_BY_ID,
  PARENT_BY_ID,
  EVIDENCE_KIND_LABEL,
  EPISTEMIC,
  EVENT_KIND_LABEL,
  INTERPRETATION_BY_ID,
  OBJECT_BY_ID,
  OBJECT_KIND_LABEL,
  VERDICT_LABEL,
  childrenOf,
  connectionsFor,
  eventsForObject,
  insightsForObject,
  md,
  refOf,
} from './data'
import { Chip, EpistemicMark, Empty, KeyValue } from './parts'
import type { Store } from './store'

/** 右栏。四个视角共用同一个。换视角时它不清空 —— 这就是「选中对象跨视角」的证据。 */
export function Inspector({ s }: { s: Store }) {
  const sel = s.selected
  const [correcting, setCorrecting] = useState(false)
  const [draft, setDraft] = useState('')

  if (!sel) {
    return (
      <div className="px-4 py-5">
        <p className="text-[11px] leading-4 text-muted-foreground">
          没有选中任何东西。点左边任意一行，这里会显示它是什么、连着什么、凭什么。
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
          {sel.type === 'object'
            ? (OBJECT_KIND_LABEL[OBJECT_BY_ID.get(sel.id)?.kind ?? 'material'] ?? '对象')
            : sel.type === 'event'
              ? '事件'
              : sel.type === 'parent'
                ? '一段过程'
                : sel.type === 'evidence'
                  ? '证据'
                  : '解释'}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => s.saveToCollection(sel.id, sel.type)}
            className="text-[10px] text-muted-foreground hover:text-foreground"
          >
            存集合
          </button>
          {sel.type === 'object' ? (
            <button type="button" onClick={() => s.toggleCompare(sel.id)} className="text-[10px] text-muted-foreground hover:text-foreground">
              {s.compare.includes(sel.id) ? '移出对比' : '对比'}
            </button>
          ) : null}
          <button
            type="button"
            aria-label="更多操作"
            title="更多操作"
            onClick={(e) => s.openMenu(e, sel.id, sel.type)}
            className="px-1 text-[12px] leading-none text-muted-foreground hover:text-foreground"
          >
            ⋯
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {sel.type === 'object' ? <ObjectBody s={s} id={sel.id} /> : null}
        {sel.type === 'parent' ? <ParentBody s={s} id={sel.id} /> : null}
        {sel.type === 'event' ? <EventBody s={s} id={sel.id} /> : null}
        {sel.type === 'evidence' ? <EvidenceBody id={sel.id} /> : null}
        {sel.type === 'insight' ? (
          <InsightBody
            s={s}
            id={sel.id}
            correcting={correcting}
            draft={draft}
            setDraft={setDraft}
            setCorrecting={setCorrecting}
          />
        ) : null}
      </div>
    </div>
  )
}

function ObjectBody({ s, id }: { s: Store; id: string }) {
  const o = OBJECT_BY_ID.get(id)
  if (!o) return <Empty>找不到这个对象。</Empty>
  const evs = eventsForObject(id).slice(-6).reverse()
  const ins = insightsForObject(id)
  const conns = connectionsFor(id)

  return (
    <div>
      <h3 className="text-[13px] leading-5 text-foreground">{o.title}</h3>
      <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{o.sub}</p>
      <div className="mt-3 border-t border-border/70 pt-1">
        <KeyValue k="时间">{o.from ?? '—'}{o.to ? ` → ${o.to}` : ' → 至今'}</KeyValue>
        <KeyValue k="状态">{o.status}</KeyValue>
      </div>

      <div className="mt-3">
        <div className="mb-1 text-[10px] tracking-[0.14em] text-muted-foreground uppercase">相关事件</div>
        {evs.length === 0 ? <p className="text-[11px] text-muted-foreground">没有事件挂在这个对象上。</p> : null}
        {evs.map((e) => (
          <button key={e.id} type="button" onClick={() => s.select(e.id)} className="block w-full py-0.5 text-left text-[11px] leading-4 hover:text-foreground">
            <span className="mr-2 tabular-nums text-muted-foreground">{md(e.date)}</span>
            <span className="text-foreground/80">{e.title}</span>
          </button>
        ))}
      </div>

      {conns.length > 0 ? (
        <div className="mt-3">
          <div className="mb-1 text-[10px] tracking-[0.14em] text-muted-foreground uppercase">连接</div>
          {conns.map((c) => {
            const other = c.a === id ? c.b : c.a
            return (
              <button key={c.id} type="button" onClick={() => s.select(other)} className="block w-full border-l border-border py-1 pl-2 text-left hover:border-foreground">
                <div className="text-[11px] text-foreground/80">↔ {refOf(other)?.label}</div>
                <div className="mt-0.5 text-[10px] leading-4 text-muted-foreground">{c.why}</div>
              </button>
            )
          })}
        </div>
      ) : null}

      {ins.length > 0 ? (
        <div className="mt-3">
          <div className="mb-1 text-[10px] tracking-[0.14em] text-muted-foreground uppercase">相关解释</div>
          {ins.map((i) => (
            <button key={i.id} type="button" onClick={() => s.select(i.id)} className="block w-full py-1 text-left">
              <EpistemicMark value={i.epistemic} />
              <span className="mt-0.5 block line-clamp-2 text-[11px] leading-4 text-foreground/80">{i.statement}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function ParentBody({ s, id }: { s: Store; id: string }) {
  const p = PARENT_BY_ID.get(id)
  const kids = childrenOf(id)
  const open = s.expanded.includes(id)
  if (!p) return <Empty>找不到这一段。</Empty>

  return (
    <div>
      <h3 className="text-[13px] leading-5 text-foreground">{p.title}</h3>
      <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
        <span className="tabular-nums">
          {p.from} → {p.to}
        </span>
        <span>{p.origin === 'system' ? '系统并的' : '他划的'}</span>
        <span>{open ? '展开中' : '收起'}</span>
      </div>
      <p className="mt-2 text-[11px] leading-4 text-muted-foreground">{p.why}</p>
      <div className="mt-2 border-t border-border/70 pt-1">
        <KeyValue k="包含">{kids.length} 件</KeyValue>
        <KeyValue k="对象">
          <span className="flex flex-wrap gap-1">
            {p.objectIds.map((o) => (
              <Chip key={o} onClick={() => s.select(o)}>
                {refOf(o)?.label.slice(0, 14)}
              </Chip>
            ))}
          </span>
        </KeyValue>
      </div>
      <div className="mt-2">
        {kids.map((e) => (
          <button key={e.id} type="button" onClick={() => s.select(e.id)} className="block w-full py-0.5 text-left text-[11px] leading-4 hover:text-foreground">
            <span className="mr-2 tabular-nums text-muted-foreground">{md(e.date)}</span>
            <span className="text-foreground/80">{e.title}</span>
          </button>
        ))}
      </div>
      <button type="button" onClick={() => s.toggleParent(id)} className="mt-2 text-[10px] text-muted-foreground underline decoration-border underline-offset-2 hover:text-foreground">
        {open ? '在时间轴上收起' : '在时间轴上展开'}
      </button>
      {p.origin === 'system' ? (
        <button type="button" onClick={() => s.splitParent(id)} className="ml-3 mt-2 text-[10px] text-muted-foreground underline decoration-border underline-offset-2 hover:text-foreground">
          拆开这一段
        </button>
      ) : null}
    </div>
  )
}

function EventBody({ s, id }: { s: Store; id: string }) {
  const e = EVENT_BY_ID.get(id)
  if (!e) return <Empty>找不到这个事件。</Empty>
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="text-[10px] text-muted-foreground">{EVENT_KIND_LABEL[e.kind]}</span>
        <span className="text-[10px] tabular-nums text-muted-foreground">
          {e.date} {e.time}
        </span>
      </div>
      <h3 className="mt-1 text-[13px] leading-5 text-foreground">{e.title}</h3>
      {e.detail ? <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{e.detail}</p> : null}

      {e.objectIds.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {e.objectIds.map((o) => (
            <Chip key={o} onClick={() => s.select(o)}>
              {refOf(o)?.label.slice(0, 16)}
            </Chip>
          ))}
        </div>
      ) : null}

      <div className="mt-3 border-t border-border/70 pt-2">
        <div className="mb-1 text-[10px] tracking-[0.14em] text-muted-foreground uppercase">它产出了什么</div>
        {e.evidenceIds.length === 0 ? (
          <p className="text-[11px] leading-4 text-muted-foreground">什么都没产出。这很常见 —— 活动不等于证据。</p>
        ) : (
          e.evidenceIds.map((eid) => <EvidenceLine key={eid} id={eid} onPick={() => s.select(eid)} />)
        )}
      </div>

      {e.parentId ? (
        <button type="button" onClick={() => s.select(e.parentId as string, 'parent')} className="mt-3 text-[10px] text-muted-foreground hover:text-foreground">
          ↑ 属于「{refOf(e.parentId)?.label}」
        </button>
      ) : null}
    </div>
  )
}

function EvidenceLine({ id, onPick }: { id: string; onPick: () => void }) {
  const ev = EVIDENCE_BY_ID.get(id)
  if (!ev) return null
  return (
    <button type="button" onClick={onPick} className="block w-full border-l border-border py-1 pl-2 text-left hover:border-foreground">
      <div className="text-[11px] leading-4 text-foreground/85">{ev.observed}</div>
      <div className="mt-0.5 text-[10px] text-muted-foreground">
        {EVIDENCE_KIND_LABEL[ev.kind]} · {VERDICT_LABEL[ev.verdict] ?? ev.verdict}
      </div>
    </button>
  )
}

function EvidenceBody({ id }: { id: string }) {
  const ev = EVIDENCE_BY_ID.get(id)
  if (!ev) return <Empty>找不到这条证据。</Empty>
  const related = [...INTERPRETATION_BY_ID.values()].filter((i) =>
    [...i.supports, ...i.weakens, ...i.contradicts, ...i.qualifies].includes(id),
  )
  return (
    <div>
      <p className="text-[12px] leading-5 text-foreground">{ev.observed}</p>
      <div className="mt-2 border-t border-border/70 pt-1">
        <KeyValue k="类型">{EVIDENCE_KIND_LABEL[ev.kind]}<span className="text-muted-foreground">（{ev.rawKind}）</span></KeyValue>
        <KeyValue k="结果">{VERDICT_LABEL[ev.verdict] ?? ev.verdict}</KeyValue>
        <KeyValue k="支持">{ev.supports}</KeyValue>
        <KeyValue k="不能证明">
          <span className="text-foreground/75">{ev.notSupport}</span>
        </KeyValue>
        <KeyValue k="局限">{ev.limitation}</KeyValue>
        <KeyValue k="谁给的">{ev.by} · 置信 {ev.confidence}</KeyValue>
      </div>
      {related.length > 0 ? (
        <div className="mt-3">
          <div className="mb-1 text-[10px] tracking-[0.14em] text-muted-foreground uppercase">它被用在哪</div>
          {related.map((i) => (
            <div key={i.id} className="py-0.5 text-[11px] leading-4 text-foreground/80">
              {i.statement.slice(0, 40)}…
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-[10px] leading-4 text-muted-foreground">这条证据不服务任何解释。它可以一直挂着。</p>
      )}
    </div>
  )
}

function InsightBody({
  s,
  id,
  correcting,
  draft,
  setDraft,
  setCorrecting,
}: {
  s: Store
  id: string
  correcting: boolean
  draft: string
  setDraft: (v: string) => void
  setCorrecting: (v: boolean) => void
}) {
  const i = s.insights.find((x) => x.id === id)
  if (!i) return <Empty>找不到这条解释。</Empty>
  const e = EPISTEMIC[i.epistemic]

  return (
    <div>
      <div className="flex items-baseline gap-2">
        <EpistemicMark value={i.epistemic} />
        <span className="text-[10px] tabular-nums text-muted-foreground">{i.date}</span>
        {i.confidence ? <span className="text-[10px] text-muted-foreground">置信 {i.confidence}</span> : null}
      </div>
      <p className="mt-1 font-serif text-[13px] leading-6 text-foreground">{i.statement}</p>
      <p className="mt-1 text-[10px] leading-4 text-muted-foreground">{e.hint}</p>

      {i.basis ? (
        <div className="mt-2 border-t border-border/70 pt-1">
          <KeyValue k="依据">{i.basis}</KeyValue>
        </div>
      ) : null}

      <EvidenceGroup title="支撑它" ids={i.supports} s={s} />
      {i.weakens.length > 0 ? <EvidenceGroup title="削弱它" ids={i.weakens} s={s} /> : null}
      {i.qualifies.length > 0 ? <EvidenceGroup title="给它加条件" ids={i.qualifies} s={s} /> : null}
      {i.contradicts.length > 0 ? <EvidenceGroup title="反驳它" ids={i.contradicts} s={s} tone="strong" /> : null}

      {i.supports.length + i.weakens.length + i.qualifies.length + i.contradicts.length === 0 ? (
        <p className="mt-2 text-[10px] leading-4 text-muted-foreground">没有任何证据挂着。这条属于「他说的」，不属于「系统看到的」。</p>
      ) : null}

      <div className="mt-3 border-t border-border/70 pt-1">
        <KeyValue k="谁说的">{i.assertedBy === 'user' ? '他自己' : '系统'}</KeyValue>
        <KeyValue k="生效">{i.effectiveTo ? `${i.effectiveFrom} → ${i.effectiveTo}` : `${i.effectiveFrom} 起`}</KeyValue>
      </div>

      {i.reinterpretedAt ? (
        <div className="mt-2 border-l-2 border-foreground/30 pl-2">
          <div className="text-[10px] text-muted-foreground">{i.reinterpretedAt} 被收窄</div>
          <p className="mt-0.5 text-[11px] leading-4 text-foreground/80">{i.reinterpretation}</p>
          <p className="mt-1 text-[10px] text-muted-foreground">旧版本没有被删掉 —— 它仍然属于 10 月 29 日之前。</p>
        </div>
      ) : null}

      {i.note ? <p className="mt-2 text-[10px] leading-4 text-muted-foreground">{i.note}</p> : null}

      <div className="mt-3 border-t border-border pt-2">
        {s.responses[i.id] ? (
          <p className="text-[11px] text-muted-foreground">
            你的回应：{s.responses[i.id] === 'confirmed' ? '说得对' : s.responses[i.id] === 'corrected' ? '你改过它的说法' : '不是你'}
          </p>
        ) : (
          <div className="flex flex-wrap gap-3 text-[11px]">
            <button type="button" onClick={() => s.respond(i.id, 'confirmed')} className="text-foreground underline decoration-border underline-offset-2 hover:decoration-foreground">
              说得对
            </button>
            <button
              type="button"
              onClick={() => {
                setCorrecting(true)
                setDraft(i.statement)
              }}
              className="text-foreground underline decoration-border underline-offset-2 hover:decoration-foreground"
            >
              改说法
            </button>
            <button type="button" onClick={() => s.respond(i.id, 'rejected')} className="text-muted-foreground underline decoration-border underline-offset-2 hover:text-foreground">
              不是我
            </button>
          </div>
        )}

        {correcting ? (
          <div className="mt-2">
            <textarea
              value={draft}
              onChange={(ev) => setDraft(ev.target.value)}
              rows={3}
              className="w-full border border-border bg-background px-2 py-1 text-[12px] leading-5 outline-none focus:border-foreground/40"
            />
            <div className="mt-1 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  s.respond(i.id, 'corrected', draft)
                  setCorrecting(false)
                }}
                className="border border-foreground/30 px-2 py-0.5 text-[11px] hover:bg-muted"
              >
                用我的说法
              </button>
              <button type="button" onClick={() => setCorrecting(false)} className="text-[11px] text-muted-foreground hover:text-foreground">
                算了
              </button>
            </div>
            <p className="mt-1 text-[10px] leading-4 text-muted-foreground">改完它仍然是「你的说法」，不是事实。</p>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function EvidenceGroup({ title, ids, s, tone }: { title: string; ids: string[]; s: Store; tone?: 'strong' }) {
  if (ids.length === 0) return null
  return (
    <div className="mt-3">
      <div className={`mb-1 text-[10px] tracking-[0.14em] uppercase ${tone ? 'text-foreground/70' : 'text-muted-foreground'}`}>{title}</div>
      {ids.map((id) => {
        const ev = EVIDENCE_BY_ID.get(id)
        if (!ev) return null
        return (
          <button
            key={id}
            type="button"
            onClick={() => s.select(id, 'evidence')}
            className={`block w-full border-l py-1 pl-2 text-left ${tone ? 'border-foreground/40' : 'border-border hover:border-foreground'}`}
          >
            <div className="text-[11px] leading-4 text-foreground/85">{ev.observed}</div>
            <div className="mt-0.5 text-[10px] text-muted-foreground">
              {md(ev.date)} · {EVIDENCE_KIND_LABEL[ev.kind]} · {VERDICT_LABEL[ev.verdict] ?? ev.verdict}
            </div>
          </button>
        )
      })}
    </div>
  )
}
