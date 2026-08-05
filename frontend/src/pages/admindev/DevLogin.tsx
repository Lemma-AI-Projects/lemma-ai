import { useState } from 'react'

import { devApi, setDevToken } from './devApi'

interface Props {
  onLogin: (token: string) => void
}

export function DevLogin({ onLogin }: Props) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const { data } = await devApi.post('/login', { username, password })
      setDevToken(data.token)
      onLogin(data.token)
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status
      setError(status === 429 ? '尝试太频繁，稍后再试' : '账号或口令不对')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="devdash login-wrap">
      <form className="login-card" onSubmit={submit}>
        <h2>Lemma Dev Console</h2>
        <p>仅限开发人员 · /admindev</p>
        <div className="field">
          <label>用户名</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            autoComplete="username"
          />
        </div>
        <div className="field">
          <label>口令</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        <button className="btn primary" type="submit" disabled={busy || !username || !password}>
          {busy ? '登录中…' : '进入控制台'}
        </button>
        <div className="err">{error}</div>
      </form>
    </div>
  )
}
