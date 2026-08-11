import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiClient } from '@/lib/apiClient'
import { signOutOn401 } from '@/lib/apiUtils'
import type { SemanticCluster } from './types'

/**
 * S3 LLM 语义细化——只走后端 ai_client（合规铁律：前端永不直连 provider）。
 *
 * 载荷裁剪（D3）：只传 id/text/type/mastery + 规则簇（id/memberIds/label），
 * 不传坐标——LLM 只命名与描述，不碰布局。
 */

export interface BoardShapeSemanticIn {
  id: string
  text: string
  type: string
  mastery?: string | null
}

export interface BoardClusterIn {
  id: string
  memberIds: string[]
  label: string
}

export interface BoardSemanticRequest {
  shapes: BoardShapeSemanticIn[]
  clusters: BoardClusterIn[]
}

export interface BoardSemanticClusterOut {
  clusterId: string
  label: string
  description: string
}

export interface BoardSemanticResponse {
  clusters: BoardSemanticClusterOut[]
  intentDescription: string
}

/** 把前端规则簇 + 形状投影为后端请求载荷（裁剪：无坐标） */
export function buildBoardSemanticRequest(
  shapes: Array<{ id: string; text: string; type: string; mastery?: string | null }>,
  clusters: SemanticCluster[]
): BoardSemanticRequest {
  return {
    shapes: shapes.map((s) => ({
      id: s.id,
      text: s.text,
      type: s.type,
      ...(s.mastery ? { mastery: s.mastery } : {}),
    })),
    clusters: clusters.map((c) => ({
      id: c.id,
      memberIds: c.shapeIds,
      label: c.label,
    })),
  }
}

/** 合并 LLM 结果到规则簇：命中 clusterId 则覆盖 label；返回 intent 描述 */
export function mergeSemanticEnrichment(
  clusters: SemanticCluster[],
  response: BoardSemanticResponse
): { enrichedClusters: SemanticCluster[]; intentDescription: string | null } {
  const labelById = new Map(
    response.clusters.map((c) => [c.clusterId, c.label])
  )
  const enriched = clusters.map((c) => {
    const llmLabel = labelById.get(c.id)
    return llmLabel ? { ...c, label: llmLabel } : c
  })
  return {
    enrichedClusters: enriched,
    intentDescription: response.intentDescription || null,
  }
}

/** 调用后端语义细化端点（门控关闭/失败时返回 null，调用方保持规则结果） */
export function useBoardSemanticMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: BoardSemanticRequest) => {
      const { data } = await signOutOn401(
        apiClient.post<BoardSemanticResponse | null>(
          '/api/v1/board/semantic',
          payload
        )
      )
      return data
    },
    onSuccess: () => {
      // 语义细化不改变任何服务端数据，无需 invalidate；
      // queryClient 仅为保持与其他 API hook 一致的形态。
      void queryClient
    },
  })
}
