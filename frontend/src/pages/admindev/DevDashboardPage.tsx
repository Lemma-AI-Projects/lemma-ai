import { useEffect, useState } from 'react'

import { devApi, getDevToken, setDevToken, type MonitorData } from './devApi'
import { ArchitectureView } from './ArchitectureView'
import { ControlPanel } from './ControlPanel'
import { DevLogin } from './DevLogin'
import { MessagesPanel } from './MessagesPanel'
import { MonitorPanel } from './MonitorPanel'
import './devdashboard.css'

type Tab = 'monitor' | 'arch' | 'control' | 'messages'

export function DevDashboardPage() {
  const [token, setToken] = useState<string | null>(getDevToken())
  const [username, setUsername] = useState('')
  const [tab, setTab] = useState<Tab>('monitor')
  const [monitor, setMonitor] = useState<MonitorData | null>(null)

  useEffect(() => {
    if (!token) return
    devApi
      .get('/me')
      .then(({ data }) => setUsername(data.username))
      .catch(() => setToken(null))
  }, [token])

  useEffect(() => {
    if (!token) return
    let alive = true
    const tick = async () => {
      try {
        const { data } = await devApi.get<MonitorData>('/monitor')
        if (alive) setMonitor(data)
      } catch {
        /* 401 handled by interceptor; transient errors ignored */
      }
    }
    tick()
    const id = setInterval(tick, 5000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [token])

  if (!token) {
    return <DevLogin onLogin={setToken} />
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'monitor', label: 'Monitor' },
    { key: 'arch', label: 'Architecture' },
    { key: 'control', label: 'Control' },
    { key: 'messages', label: 'Messages' },
  ]

  return (
    <div className="devdash">
      <div className="topbar">
        <div className="brand">
          <span className="logo" />
          Lemma Dev Console
        </div>
        <div className="who">
          <span>
            {username || '…'} · <span className="mono">/admindev</span>
          </span>
          <button
            className="btn"
            onClick={() => {
              setDevToken(null)
              setToken(null)
            }}
          >
            退出
          </button>
        </div>
      </div>
      <div className="tabs">
        {tabs.map((t) => (
          <div key={t.key} className={`tab${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </div>
        ))}
      </div>
      <div className="content">
        {tab === 'monitor' && <MonitorPanel data={monitor} />}
        {tab === 'arch' && <ArchitectureView data={monitor} />}
        {tab === 'control' && <ControlPanel />}
        {tab === 'messages' && <MessagesPanel />}
      </div>
    </div>
  )
}
