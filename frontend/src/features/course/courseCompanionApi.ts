import { useQuery } from '@tanstack/react-query'

import { apiClient } from '@/lib/apiClient'
import { retryUnlessClientError, signOutOn401 } from '@/lib/apiUtils'
import { conversationsQueryRootKey } from '@/lib/queryKeys'

export interface CourseCompanionConversation {
  id: string
  title: string | null
  updatedAt: string
}

export function courseCompanionConversationsQueryKey(courseId: string) {
  return [...conversationsQueryRootKey, 'course-companion', courseId] as const
}

async function getCourseCompanionConversations(
  courseId: string
): Promise<CourseCompanionConversation[]> {
  const { data } = await signOutOn401(
    apiClient.get<CourseCompanionConversation[]>(
      `/api/v1/courses/${courseId}/companion/conversations`,
      { params: { limit: 50, offset: 0 } }
    )
  )
  return data
}

export function useCourseCompanionConversationsQuery(
  courseId: string | undefined
) {
  return useQuery({
    queryKey: courseCompanionConversationsQueryKey(courseId ?? 'none'),
    queryFn: () => getCourseCompanionConversations(courseId as string),
    enabled: Boolean(courseId),
    retry: retryUnlessClientError,
  })
}
