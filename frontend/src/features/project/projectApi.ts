import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiClient } from '@/lib/apiClient'
import { retryUnlessClientError, signOutOn401 } from '@/lib/apiUtils'
import { conversationsQueryRootKey } from '@/lib/queryKeys'

export interface ProjectItem {
  id: string
  name: string
  updatedAt: string
}

export interface ProjectConversationItem {
  id: string
  title: string
  /** 最后一条用户消息全文（前端自行截断展示），可能为 null。 */
  lastMessage: string | null
  updatedAt: string
}

export const projectsQueryKey = ['projects'] as const

export function projectQueryKey(projectId: string) {
  return ['projects', projectId] as const
}

/**
 * 挂在 ['conversations'] 前缀下：useConversationChat 流结束后按该前缀
 * invalidate，项目内会话列表自动跟着刷新，hook 零改动。
 */
export function projectConversationsQueryKey(projectId: string) {
  return [...conversationsQueryRootKey, 'project', projectId] as const
}

async function getProjects(): Promise<ProjectItem[]> {
  const { data } = await signOutOn401(
    apiClient.get<ProjectItem[]>('/api/v1/projects', {
      params: { limit: 100 },
    })
  )
  return data
}

async function getProject(projectId: string): Promise<ProjectItem> {
  const { data } = await signOutOn401(
    apiClient.get<ProjectItem>(`/api/v1/projects/${projectId}`)
  )
  return data
}

async function getProjectConversations(
  projectId: string
): Promise<ProjectConversationItem[]> {
  const { data } = await signOutOn401(
    apiClient.get<ProjectConversationItem[]>(
      `/api/v1/projects/${projectId}/conversations`,
      { params: { limit: 50 } }
    )
  )
  return data
}

/** 侧边栏项目列表，按 updatedAt 倒序。 */
export function useProjectsQuery() {
  return useQuery({
    queryKey: projectsQueryKey,
    queryFn: getProjects,
    retry: retryUnlessClientError,
  })
}

/** 项目页头部（深链/刷新时取名称；404 当不存在渲染）。 */
export function useProjectQuery(projectId: string | undefined) {
  return useQuery({
    queryKey: projectQueryKey(projectId ?? 'none'),
    queryFn: () => getProject(projectId as string),
    enabled: Boolean(projectId),
    retry: retryUnlessClientError,
  })
}

/** 项目内会话列表，按 updatedAt 倒序。 */
export function useProjectConversationsQuery(projectId: string | undefined) {
  return useQuery({
    queryKey: projectConversationsQueryKey(projectId ?? 'none'),
    queryFn: () => getProjectConversations(projectId as string),
    enabled: Boolean(projectId),
    retry: retryUnlessClientError,
  })
}

export function useCreateProjectMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (variables: { name: string }) => {
      const { data } = await signOutOn401(
        apiClient.post<ProjectItem>('/api/v1/projects', {
          name: variables.name,
        })
      )
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectsQueryKey })
    },
  })
}

export function useRenameProjectMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (variables: { projectId: string; name: string }) => {
      const { data } = await signOutOn401(
        apiClient.patch<ProjectItem>(`/api/v1/projects/${variables.projectId}`, {
          name: variables.name,
        })
      )
      return data
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: projectsQueryKey })
      void queryClient.invalidateQueries({
        queryKey: projectQueryKey(variables.projectId),
      })
    },
  })
}

export function useDeleteProjectMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (variables: { projectId: string }) => {
      await signOutOn401(
        apiClient.delete(`/api/v1/projects/${variables.projectId}`)
      )
    },
    onSuccess: (_data, variables) => {
      queryClient.removeQueries({
        queryKey: projectQueryKey(variables.projectId),
      })
      void queryClient.invalidateQueries({ queryKey: projectsQueryKey })
      // 项目内会话不删除、回落主列表，按前缀同时刷新主列表与项目列表
      void queryClient.invalidateQueries({ queryKey: conversationsQueryRootKey })
    },
  })
}
