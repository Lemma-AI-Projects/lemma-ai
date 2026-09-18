import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiClient } from '@/lib/apiClient'
import { retryUnlessClientError, signOutOn401 } from '@/lib/apiUtils'
import {
  courseDetailQueryKey,
  coursesQueryRootKey,
  progressQueryRootKey,
} from '@/lib/queryKeys'
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

/** 删除课程：后端连带删掉章/单元/学习点、伴学会话与已转存的视频对象，不可撤销。 */
export function useDeleteCourseMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (variables: { courseId: string }) => {
      await signOutOn401(
        apiClient.delete(`/api/v1/courses/${variables.courseId}`)
      )
    },
    onSuccess: (_data, variables) => {
      queryClient.removeQueries({
        queryKey: courseDetailQueryKey(variables.courseId),
      })
      void queryClient.invalidateQueries({ queryKey: coursesListQueryKey })
    },
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

// --- 学习进度 ---

export interface PointProgressResult {
  completed: boolean
  lastPositionSeconds: number
}

/**
 * 播放器心跳：陈述「学习者现在在第几秒」，不做累加，因此天然幂等，丢一两次
 * 无所谓。完成判定在后端（看过阈值即完成，且完成后不会再被取消）。
 */
export function useReportPointProgressMutation() {
  return useMutation({
    mutationFn: async (variables: {
      courseId: string
      pointId: string
      positionSeconds: number
      durationSeconds: number | null
    }) => {
      const { data } = await signOutOn401(
        apiClient.put<PointProgressResult>(
          `/api/v1/courses/${variables.courseId}/points/${variables.pointId}/progress`,
          {
            positionSeconds: variables.positionSeconds,
            durationSeconds: variables.durationSeconds,
          }
        )
      )
      return data
    },
  })
}

async function listCompletions(start: Date, end: Date): Promise<string[]> {
  const { data } = await signOutOn401(
    apiClient.get<{ completedAt: string[] }>('/api/v1/progress/completions', {
      params: { start: start.toISOString(), end: end.toISOString() },
    })
  )
  return data.completedAt
}

/**
 * 某个时间窗内的完成时刻。窗口由调用方按本地时区算好再传进来，后端只管过滤 —
 * 「算哪一天」依赖用户时区，服务端不猜。
 */
export function useCompletionsQuery(start: Date, end: Date) {
  return useQuery({
    queryKey: [
      ...progressQueryRootKey,
      'completions',
      start.toISOString(),
      end.toISOString(),
    ] as const,
    queryFn: () => listCompletions(start, end),
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
  completed: boolean
  lastPositionSeconds: number
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
        completed: point.completed,
        lastPositionSeconds: point.lastPositionSeconds,
      }))
    )
  )
}
