import { useEffect, useState } from 'react'

import { devApi, getDevToken } from './devApi'

interface MessageRow {
  id: string
  author: string
  body: string
  created_at: string | null
}

export function MessagesPanel() {
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [draft, setDraft] = useState('')
  const [me, setMe] = useState('')

  async function refresh() {
    try {
      const { data } = await devApi.get('/messages')
      setMessages(data.messages ?? [])
    } catch {
      /* transient */
    }
  }

  useEffect(() => {
    const token = getDevToken()
    if (token) {
      devApi.get('/me').then(({ data }) => setMe(data.username)).catch(() => undefined)
    }
    refresh()
    const id = setInterval(refresh, 8000)
    return () => clearInterval(id)
  }, [])

  async function send() {
    const body = draft.trim()
    if (!body) return
    setDraft('')
    try {
      await devApi.post('/messages', { body })
      await refresh()
    } catch {
      setDraft(body)
    }
  }

  async function remove(id: string) {
    try {
      await devApi.delete(`/messages/${id}`)
      await refresh()
    } catch {
      /* not yours or gone */
    }
  }

  return (
    <div className="card" style={{ maxWidth: 760 }}>
      <h4>Dev Message Board（ceaser ↔ syk）</h4>
      <div className="msg-list">
        {messages.map((m) => (
          <div className="msg" key={m.id}>
            <div className="meta">
              <span className="author">{m.author}</span>
              <span>{m.created_at ? new Date(m.created_at).toLocaleString() : ''}</span>
              {me && m.author === me && (
                <button className="btn" style={{ padding: '1px 8px', fontSize: 12 }} onClick={() => remove(m.id)}>
                  删除
                </button>
              )}
            </div>
            <div style={{ whiteSpace: 'pre-wrap' }}>{m.body}</div>
          </div>
        ))}
        {messages.length === 0 && <div style={{ color: 'var(--dash-muted)', fontSize: 13 }}>还没有留言——给搭档留一句今天的交接吧</div>}
      </div>
      <div className="msg-input">
        <textarea
          rows={2}
          placeholder={me ? `${me}：今天状态 / 排障记录 / 交接事项…` : '留言…'}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send()
          }}
        />
        <button className="btn primary" onClick={send} disabled={!draft.trim()}>
          发送
        </button>
      </div>
    </div>
  )
}
