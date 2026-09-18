import { useQuery } from '@tanstack/react-query'

import { apiClient } from '@/lib/apiClient'
import { retryUnlessClientError, signOutOn401 } from '@/lib/apiUtils'
import { courseDetailQueryKey } from '@/lib/queryKeys'
import type { CourseDetail } from '@/types/course'

// 问卷仍在后台生成时的轮询间隔。自停：课程一旦离开 intake 或问卷就绪就停，
// 所以答题阶段与构建阶段都不轮询（构建由 organize SSE 推进）。
const QUESTIONNAIRE_POLL_MS = 1200

/**
 * 课程快照查询。提升到全局 hooks 的原因：会话里的编排卡片（coursePlanner）与
 * 课程仪表盘 / 学习页（course）读的是同一份快照，必须共用同一个 query key，
 * 否则同一门课会被缓存两次、编排结束后仪表盘还拿着旧数据。
 */
export async function getCourseDetail(courseId: string): Promise<CourseDetail> {
  const { data } = await signOutOn401(
    apiClient.get<CourseDetail>(`/api/v1/courses/${courseId}`)
  )
  return data
}

export function useCourseDetailQuery(
  courseId: string | undefined,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: courseDetailQueryKey(courseId ?? 'none'),
    queryFn: () => getCourseDetail(courseId as string),
    enabled: Boolean(courseId) && (options?.enabled ?? true),
    refetchInterval: (query) => {
      const course = query.state.data
      return course &&
        course.status === 'intake' &&
        !course.questionnaireReady
        ? QUESTIONNAIRE_POLL_MS
        : false
    },
    retry: retryUnlessClientError,
  })
}
