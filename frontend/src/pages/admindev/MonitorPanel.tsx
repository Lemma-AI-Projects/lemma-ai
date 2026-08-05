import type { MonitorData, NodeState } from './devApi'

function Dot({ state }: { state: NodeState | undefined }) {
  const cls = state === 'up' ? 'up' : state === 'degraded' ? 'degraded' : 'down'
  return <span className={`dot ${cls}`} />
}

function fmtDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export function MonitorPanel({ data }: { data: MonitorData | null }) {
  if (!data) {
    return <div className="card">等待监控数据…</div>
  }
  const p = data.process
  const r = data.redis
  const c = data.celery
  const u = data.ai_usage

  return (
    <div className="grid">
      <div className="card">
        <h4>Process</h4>
        <div className="kv"><span className="k">状态</span><span className="v"><Dot state={p.status} />{p.status}</span></div>
        <div className="kv"><span className="k">运行时长</span><span className="v">{fmtDuration(p.uptime_s)}</span></div>
        <div className="kv"><span className="k">RPS (60s)</span><span className="v">{p.rps_60s}</span></div>
        <div className="kv"><span className="k">总请求 / 错误</span><span className="v">{p.requests_total} / {p.errors_total}</span></div>
        <div className="kv"><span className="k">Python</span><span className="v">{p.python}</span></div>
      </div>

      <div className="card">
        <h4>Redis</h4>
        <div className="kv"><span className="k">状态</span><span className="v"><Dot state={r.status} />{r.status}</span></div>
        <div className="kv"><span className="k">dbsize</span><span className="v">{r.dbsize ?? '—'}</span></div>
        <div className="kv"><span className="k">Celery 队列</span><span className="v">{r.queue_depth ?? '—'}</span></div>
        {r.error && <div className="kv"><span className="k">错误</span><span className="v">{r.error}</span></div>}
      </div>

      <div className="card">
        <h4>Celery</h4>
        <div className="kv"><span className="k">状态</span><span className="v"><Dot state={c.status} />{c.status}</span></div>
        <div className="kv"><span className="k">workers</span><span className="v">{c.worker_count ?? 0}</span></div>
        <div className="kv"><span className="k">在线</span><span className="v">{(c.workers ?? []).join(', ') || '—'}</span></div>
      </div>

      <div className="card">
        <h4>Postgres</h4>
        <div className="kv"><span className="k">状态</span><span className="v"><Dot state={data.db.status} />{data.db.status}</span></div>
      </div>

      <div className="card">
        <h4>AI Usage (24h)</h4>
        <div className="kv"><span className="k">状态</span><span className="v"><Dot state={u.status} />{u.status}</span></div>
        <div className="kv"><span className="k">调用</span><span className="v">{u.calls ?? '—'}</span></div>
        <div className="kv"><span className="k">成本</span><span className="v">${u.cost_usd ?? '—'}</span></div>
        <div className="kv"><span className="k">平均延迟</span><span className="v">{u.avg_latency_ms != null ? `${u.avg_latency_ms}ms` : '—'}</span></div>
        <div className="kv"><span className="k">成功率</span><span className="v">{u.success_rate != null ? `${(u.success_rate * 100).toFixed(1)}%` : '—'}</span></div>
      </div>

      <div className="card">
        <h4>Learner Engine</h4>
        <div className="kv"><span className="k">状态</span><span className="v"><Dot state={data.learner.status} />{data.learner.status}</span></div>
        <div className="kv"><span className="k">说明</span><span className="v">{data.learner.note ?? '—'}</span></div>
      </div>
    </div>
  )
}
