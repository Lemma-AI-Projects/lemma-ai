import { useEffect, useState } from 'react'

import { devApi, type NodeState } from './devApi'

interface ComponentRow {
  name: string
  status: NodeState
  pids?: number[]
  workers?: string[]
  worker_count?: number
  dbsize?: number
  error?: string
}

interface AuditRow {
  actor: string
  action: string
  detail: string | null
  created_at: string | null
}

const LABELS: Record<string, string> = {
  redis: 'Redis',
  'celery-worker': 'Celery Worker',
  'celery-beat': 'Celery Beat',
}

export function ControlPanel() {
  const [components, setComponents] = useState<ComponentRow[]>([])
  const [audit, setAudit] = useState<AuditRow[]>([])
  const [busy, setBusy] = useState('')

  async function refresh() {
    try {
      const [{ data: c }, { data: a }] = await Promise.all([
        devApi.get('/components'),
        devApi.get('/audit'),
      ])
      setComponents(c.components ?? [])
      setAudit(a.audit ?? [])
    } catch {
      /* transient */
    }
  }

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 8000)
    return () => clearInterval(id)
  }, [])

  async function act(name: string, action: 'start' | 'stop' | 'restart') {
    setBusy(`${name}:${action}`)
    try {
      await devApi.post(`/components/${name}/${action}`)
      await refresh()
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="grid">
      <div className="card">
        <h4>Components</h4>
        {components.map((c) => (
          <div className="row" key={c.name}>
            <div>
              <div className="name">
                <span className={`dot ${c.status === 'up' ? 'up' : c.status === 'degraded' ? 'degraded' : 'down'}`} />
                {LABELS[c.name] ?? c.name}
              </div>
              <div className="mono" style={{ fontSize: 12, color: 'var(--dash-muted)' }}>
                {c.status}
                {c.pids?.length ? ` · pid ${c.pids.join(',')}` : ''}
                {c.worker_count != null ? ` · ${c.worker_count} workers` : ''}
                {c.dbsize != null ? ` · dbsize ${c.dbsize}` : ''}
                {c.error ? ` · ${c.error}` : ''}
              </div>
            </div>
            <div className="ops">
              <button className="btn" disabled={!!busy} onClick={() => act(c.name, 'start')}>Start</button>
              <button className="btn" disabled={!!busy} onClick={() => act(c.name, 'stop')}>Stop</button>
              <button className="btn" disabled={!!busy} onClick={() => act(c.name, 'restart')}>Restart</button>
            </div>
          </div>
        ))}
        {components.length === 0 && <div className="mono" style={{ color: 'var(--dash-muted)', fontSize: 13 }}>加载中…</div>}
        <div className="arch-note">启停仅 dev 环境生效（DEV_DASHBOARD_ENABLED），每次操作都写入审计。</div>
      </div>

      <div className="card">
        <h4>Audit Log（谁动了什么）</h4>
        <div className="msg-list" style={{ maxHeight: 420 }}>
          {audit.map((row, i) => (
            <div className="msg" key={i}>
              <div className="meta">
                <span className="author">{row.actor}</span>
                <span className="mono">{row.action}</span>
                {row.created_at && <span>{new Date(row.created_at).toLocaleString()}</span>}
              </div>
              {row.detail && <div className="mono" style={{ fontSize: 12, color: 'var(--dash-muted)' }}>{row.detail}</div>}
            </div>
          ))}
          {audit.length === 0 && <div style={{ color: 'var(--dash-muted)', fontSize: 13 }}>暂无记录</div>}
        </div>
      </div>
    </div>
  )
}
