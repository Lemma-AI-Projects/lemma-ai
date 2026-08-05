import type { MonitorData, NodeState } from './devApi'

interface NodeSpec {
  id: string
  x: number
  y: number
  title: string
  sub: string
  state: NodeState
}

const W = 150
const H = 52

function Node({ n }: { n: NodeSpec }) {
  const cx = n.x + W / 2
  const fill = n.state === 'down' ? '#231313' : n.state === 'degraded' ? '#231d10' : '#16161a'
  const stroke = n.state === 'down' ? '#f85149' : n.state === 'degraded' ? '#d29922' : '#2a2a2f'
  const dot = n.state === 'down' ? '#f85149' : n.state === 'degraded' ? '#d29922' : '#3fb950'
  return (
    <g>
      <rect x={n.x} y={n.y} width={W} height={H} rx={10} fill={fill} stroke={stroke} strokeWidth={1} />
      <circle cx={n.x + 14} cy={n.y + 14} r={4} fill={dot} />
      <text x={cx} y={n.y + 21} textAnchor="middle" fill="#ededef" fontSize={13} fontWeight={500} fontFamily="inherit">
        {n.title}
      </text>
      <text x={cx} y={n.y + 38} textAnchor="middle" fill="#8b8b91" fontSize={11} fontFamily="'SFMono-Regular', ui-monospace, Menlo, monospace">
        {n.sub}
      </text>
    </g>
  )
}

interface EdgeSpec {
  d: string
  flow: boolean
}

export function ArchitectureView({ data }: { data: MonitorData | null }) {
  if (!data) {
    return <div className="card">等待架构数据…</div>
  }
  const p = data.process
  const r = data.redis
  const c = data.celery
  const u = data.ai_usage
  const traffic = (p.rps_60s ?? 0) > 0

  const nodes: NodeSpec[] = [
    { id: 'browser', x: 40, y: 40, title: 'Browser', sub: '/admindev + /', state: 'up' },
    { id: 'api', x: 250, y: 40, title: 'FastAPI', sub: `rps ${p.rps_60s} · py ${p.python}`, state: p.status },
    { id: 'supabase', x: 620, y: 40, title: 'Supabase', sub: 'PG + Storage', state: data.db.status },
    { id: 'services', x: 250, y: 150, title: 'Services', sub: `req ${p.requests_total}`, state: p.status },
    { id: 'aiclient', x: 250, y: 260, title: 'AIClient', sub: u.avg_latency_ms != null ? `${u.avg_latency_ms}ms` : '—', state: u.status },
    { id: 'providers', x: 620, y: 260, title: 'AI Providers', sub: `${u.calls ?? 0} calls · $${u.cost_usd ?? 0}`, state: u.status },
    { id: 'engine', x: 620, y: 150, title: 'Learner Engine', sub: 'SOUL · 5 layers', state: data.learner.status },
    { id: 'celery', x: 250, y: 380, title: 'Celery', sub: `${c.worker_count ?? 0} workers`, state: c.status },
    { id: 'redis', x: 470, y: 380, title: 'Redis', sub: `queue ${r.queue_depth ?? '—'}`, state: r.status },
  ]

  const edges: EdgeSpec[] = [
    { d: 'M 190 66 H 250', flow: traffic },
    { d: 'M 325 92 V 150', flow: traffic },
    { d: 'M 400 66 H 620', flow: traffic },
    { d: 'M 325 202 V 260', flow: traffic },
    { d: 'M 400 286 H 620', flow: traffic },
    { d: 'M 390 266 L 620 178', flow: traffic },
    { d: 'M 410 66 V 380 H 400', flow: traffic },
    { d: 'M 400 406 H 470', flow: traffic },
  ]

  return (
    <div>
      <div className="arch-wrap">
        <svg viewBox="0 0 920 460" width="100%" role="img" aria-label="Lemma AI 实时架构图">
          <title>Lemma AI 实时架构</title>
          <defs>
            <marker id="devarrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 2 1 L 8 5 L 2 9" fill="none" stroke="#55555c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </marker>
          </defs>
          <rect x="0" y="0" width="920" height="460" rx="12" fill="#0d0d10" />
          <text x="30" y="28" fill="#8b8b91" fontSize="12" fontFamily="'SFMono-Regular', ui-monospace, Menlo, monospace">
            lemma-ai · live topology (5s)
          </text>
          {edges.map((e, i) => (
            <path
              key={i}
              d={e.d}
              fill="none"
              stroke={e.flow ? '#3b82f6' : '#3a3a41'}
              strokeWidth={e.flow ? 2 : 1.2}
              className={e.flow ? 'devflow' : undefined}
              markerEnd="url(#devarrow)"
            />
          ))}
          {nodes.map((n) => (
            <Node key={n.id} n={n} />
          ))}
        </svg>
      </div>
      <div className="arch-note">
        节点三态：绿=正常 · 琥珀=降级 · 红=不可用（闪烁）。蓝色流动边 = 近 60s 有请求流量。
        验收目标：不看日志，30 秒内从这张图判断"哪个组件挂了、流量断在哪"。
      </div>
    </div>
  )
}
