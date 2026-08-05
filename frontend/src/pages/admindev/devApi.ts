import axios from 'axios'

import { env } from '@/lib/env'

const TOKEN_KEY = 'lemma_dev_token'

/** Dev-dashboard API client — separate auth from the business Supabase JWT. */
export const devApi = axios.create({
  baseURL: `${env.apiBaseUrl}/admindev/api`,
})

devApi.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  } else {
    config.headers.delete('Authorization')
  }
  return config
})

devApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY)
    }
    return Promise.reject(error)
  }
)

export function getDevToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setDevToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

export type NodeState = 'up' | 'down' | 'degraded'

export interface MonitorData {
  collected_at: number
  enabled: boolean
  process: { status: NodeState; uptime_s: number; requests_total: number; errors_total: number; rps_60s: number; python: string }
  redis: { status: NodeState; dbsize?: number; queue_depth?: number; error?: string }
  celery: { status: NodeState; workers?: string[]; worker_count?: number }
  db: { status: NodeState }
  ai_usage: { status: NodeState; hours?: number; calls?: number; cost_usd?: number; avg_latency_ms?: number | null; success_rate?: number | null }
  learner: { status: NodeState; note?: string }
}
