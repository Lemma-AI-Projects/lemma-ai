import { useQuery } from '@tanstack/react-query'

import { apiClient } from '@/lib/apiClient'
import { signOutOn401 } from '@/lib/apiUtils'

/**
 * Hermes memory 读接口（L1 主线闭环，2026-08-20）。
 * 后端 schemas/learner.py 已把 snake_case 经 alias_generator 转为 camelCase，
 * 这里按 camelCase 建模。门控闗时后端返回 { enabled:false } 降级结构（不 500），
 * 因此前端把「门控真值」交给响应本身：enabled===false 或网络错误一律视为不可用，
 * 组件据此优雅降级，绝不硬编码/白屏。
 */

export interface MemoryMasteryBuckets {
  mastered: number
  learning: number
  new: number
}

export interface MemoryOverview {
  enabled: boolean
  conceptCount: number
  masteryBuckets: MemoryMasteryBuckets
  todayDueCount: number
}

export interface KnowledgeNode {
  nodeId: number
  concept: string
  domain: string
  mastery: number
  confidence: number
  attempts: number
  successes: number
  lastTest: string | null
  lastExposed: string | null
  source: string
}

export interface DueReview {
  nodeId: number
  concept: string
  domain: string
  mastery: number
  ease: number
  interval: number
  due: string | null
  lastReview: string | null
}

const learnerQueryRoot = ['learner'] as const

export function memoryOverviewQueryKey() {
  return [...learnerQueryRoot, 'memory', 'overview'] as const
}

export function reviewDueQueryKey() {
  return [...learnerQueryRoot, 'review', 'due'] as const
}

const memoryStaleTimeMs = 30_000

/** 引擎不可用（门控关 / 后端不可达）时渲染用的降级概览。 */
export const MEMORY_DISABLED_OVERVIEW: MemoryOverview = {
  enabled: false,
  conceptCount: 0,
  masteryBuckets: { mastered: 0, learning: 0, new: 0 },
  todayDueCount: 0,
}

/** 记忆概览（GET /learner/memory/overview）。始终请求——后端是门控真值源。 */
export function useMemoryOverviewQuery() {
  return useQuery<MemoryOverview>({
    queryKey: memoryOverviewQueryKey(),
    queryFn: async (): Promise<MemoryOverview> => {
      const { data } = await signOutOn401(
        apiClient.get<MemoryOverview>('/api/v1/learner/memory/overview')
      )
      return data ?? MEMORY_DISABLED_OVERVIEW
    },
    retry: false,
    staleTime: memoryStaleTimeMs,
  })
}

/** 今日待复习（GET /learner/review/due）。
 * `enabled=false` 时不发请求（典型用法：仅当记忆概览 enabled 才拉取）；
 * 门控闗后端返回 { enabled:false } 非数组结构，queryFn 还原成空列表。 */
export function useReviewDueQuery(enabled: boolean) {
  return useQuery<DueReview[]>({
    queryKey: reviewDueQueryKey(),
    queryFn: async (): Promise<DueReview[]> => {
      const { data } = await signOutOn401(
        apiClient.get<DueReview[] | { enabled: false }>('/api/v1/learner/review/due')
      )
      return Array.isArray(data) ? data : []
    },
    enabled,
    retry: false,
    staleTime: memoryStaleTimeMs,
  })
}