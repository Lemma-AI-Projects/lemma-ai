import { useQuery } from '@tanstack/react-query'

import { apiClient } from '@/lib/apiClient'
import { retryUnlessClientError, signOutOn401 } from '@/lib/apiUtils'
import { coursesQueryRootKey } from '@/lib/queryKeys'
import type { CourseDetail, CourseListItem, PointVideo } from '@/types/course'

// 学习点视频还在下载时的轮询间隔；ready/failed 后自停。
const VIDEO_POLL_MS = 2500

export const coursesListQueryKey = [...coursesQueryRootKey, 'list'] as const

export function pointVideoQueryKey(courseId: string, pointId: string) {
  return [...coursesQueryRootKey, 'point-video', courseId, pointId] as const
}

async function listCourses(): Promise<CourseListItem[]> {
  const { data } = await signOutOn401(
    apiClient.get<CourseListItem[]>('/api/v1/courses')
  )
  return data
}

async function getPointVideo(
  courseId: string,
  pointId: string
): Promise<PointVideo> {
  const { data } = await signOutOn401(
    apiClient.get<PointVideo>(
      `/api/v1/courses/${courseId}/points/${pointId}/video`
    )
  )
  return data
}

/** 课程中心列表：仅已就绪课程，按 updatedAt 倒序。 */
export function useCoursesListQuery() {
  return useQuery({
    queryKey: coursesListQueryKey,
    queryFn: listCourses,
    retry: retryUnlessClientError,
  })
}

export function usePointVideoQuery(
  courseId: string | undefined,
  pointId: string | undefined
) {
  return useQuery({
    queryKey: pointVideoQueryKey(courseId ?? 'none', pointId ?? 'none'),
    queryFn: () => getPointVideo(courseId as string, pointId as string),
    enabled: Boolean(courseId) && Boolean(pointId),
    // While the worker fetches the video, poll until it's ready or fails.
    refetchInterval: (query) =>
      query.state.data?.status === 'downloading' ? VIDEO_POLL_MS : false,
    retry: retryUnlessClientError,
  })
}

// --- 学习顺序：章 → 单元 → 学习点 拍平成一条线性序列 ---

export interface FlatPoint {
  id: string
  title: string
  /** 所属单元标题，学习页用于显示上下文。 */
  lessonTitle: string
  /** 所属章标题。 */
  moduleTitle: string
}

/** 按 章 → 单元 → 学习点 的顺序拍平，供上一个/下一个导航使用。 */
export function flattenPoints(course: CourseDetail | undefined): FlatPoint[] {
  if (!course) return []
  return course.modules.flatMap((module) =>
    module.lessons.flatMap((lesson) =>
      lesson.points.map((point) => ({
        id: point.id,
        title: point.title,
        lessonTitle: lesson.title,
        moduleTitle: module.title,
      }))
    )
  )
}
