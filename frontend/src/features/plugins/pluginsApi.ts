import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiClient } from '@/lib/apiClient'
import { signOutOn401 } from '@/lib/apiUtils'

/** 插件（P2 真实化：数据来自 /api/v1/plugins，icon_name 字符串 → 前端映射） */
export interface KbPlugin {
  id: string
  name: string
  description: string
  subject: string
  iconName: string
  installed: boolean
}

export interface PluginListResponse {
  plugins: KbPlugin[]
}

export const pluginsQueryKey = ['plugins'] as const

export function buildInstallPluginPath(pluginId: string): string {
  return `/api/v1/plugins/${encodeURIComponent(pluginId)}/install`
}

/**
 * 插件目录 + 安装态（GET /api/v1/plugins；新用户懒播种默认插件）。
 * fail-open：后端不可达/未部署 → 空列表 + error（组件降级提示，不崩）。
 */
export function usePlugins() {
  return useQuery({
    queryKey: pluginsQueryKey,
    queryFn: async (): Promise<KbPlugin[]> => {
      const { data } = await signOutOn401(
        apiClient.get<PluginListResponse>('/api/v1/plugins')
      )
      return data?.plugins ?? []
    },
    retry: false,
    staleTime: 30_000,
  })
}

/** 安装（POST /plugins/{id}/install，幂等；成功刷新列表） */
export function useInstallPlugin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (pluginId: string) => {
      await signOutOn401(
        apiClient.post(buildInstallPluginPath(pluginId))
      )
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: pluginsQueryKey })
    },
  })
}

/** 卸载（DELETE /plugins/{id}/install；成功刷新列表） */
export function useUninstallPlugin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (pluginId: string) => {
      await signOutOn401(
        apiClient.delete(buildInstallPluginPath(pluginId))
      )
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: pluginsQueryKey })
    },
  })
}
