import { useQuery } from '@tanstack/react-query'
import { GraduationCap } from 'lucide-react'

import type { ProgressStatus } from '@/components/ProgressStatusIcon'
import { apiClient } from '@/lib/apiClient'
import { retryUnlessClientError, signOutOn401 } from '@/lib/apiUtils'
import type {
  CourseAssignment,
  CourseItem,
  CourseOverview,
  CourseProgressStatus,
  CourseQuiz,
} from '@/mock/course/courseItems'

// --- wire types (contract truth: backend schemas/course.py, camelCase) ---

export interface CourseListItem {
  id: string
  title: string
  status: string
  updatedAt: string
}

export interface LearningChapter {
  id: string
  title: string
  status: string
  progress: number
}

export interface LearningUnit {
  id: string
  title: string
  status: string
  progress: number
  chapters: LearningChapter[]
}

export interface LearningCourse {
  id: string
  title: string
  status: string
  progress: number
  units: LearningUnit[]
  questionnaireReady: boolean
}

export type ChapterVideoStatus = 'ready' | 'downloading' | 'failed'

export interface ChapterVideoSource {
  platform: string
  title: string
  url: string
}

export interface ChapterVideoAuthor {
  name: string | null
  homepageUrl: string | null
}

export interface ChapterVideo {
  status: ChapterVideoStatus
  playbackUrl: string | null
  source: ChapterVideoSource
  author: ChapterVideoAuthor
  expiresAt: string | null
}

// Chapter overview fast-read (backend schemas/overview.py). `ready` -> markdown
// is the finished note; anything else -> open the SSE stream to (re)generate.
export type ChapterOverviewStatus = 'ready' | 'pending' | 'generating' | 'failed'

export interface ChapterOverview {
  status: ChapterOverviewStatus
  markdown: string | null
}

// --- query keys (local to the course-learning feature, like coursePlanner) ---

export const courseLearningRootKey = ['course-learning'] as const
export const coursesListQueryKey = [...courseLearningRootKey, 'list'] as const

export function learningCourseQueryKey(courseId: string) {
  return [...courseLearningRootKey, 'course', courseId] as const
}

export function chapterVideoQueryKey(courseId: string, chapterId: string) {
  return [...courseLearningRootKey, 'video', courseId, chapterId] as const
}

export function chapterOverviewQueryKey(courseId: string, chapterId: string) {
  return [...courseLearningRootKey, 'overview', courseId, chapterId] as const
}

// Poll the chapter-video endpoint this often while the asset is downloading; it
// self-stops (returns false) once ready/failed.
const VIDEO_POLL_MS = 2500

// --- status mapping (backend chapter/course status -> display ProgressStatus) ---

export function mapLearningStatus(status: string): ProgressStatus {
  switch (status) {
    case 'researching':
    case 'building':
      return 'in-progress'
    case 'ready':
      return 'completed'
    case 'failed':
      return 'failed'
    default:
      return 'not-started'
  }
}

// Roll chapter statuses up to a unit/course icon (display-only; mirrors the
// backend rule: all terminal with any success -> completed, all failed ->
// failed). The backend doesn't track a real unit status, so it's derived here.
export function rollupStatus(statuses: ProgressStatus[]): ProgressStatus {
  if (statuses.length === 0) {
    return 'not-started'
  }
  const allTerminal = statuses.every(
    (status) => status === 'completed' || status === 'failed'
  )
  if (allTerminal) {
    return statuses.some((status) => status === 'completed')
      ? 'completed'
      : 'failed'
  }
  if (statuses.some((status) => status !== 'not-started')) {
    return 'in-progress'
  }
  return 'not-started'
}

// --- fetchers ---

export async function listCourses(): Promise<CourseListItem[]> {
  const { data } = await signOutOn401(
    apiClient.get<CourseListItem[]>('/api/v1/courses')
  )
  return data
}

export async function getLearningCourse(courseId: string): Promise<LearningCourse> {
  const { data } = await signOutOn401(
    apiClient.get<LearningCourse>(`/api/v1/courses/${courseId}`)
  )
  return data
}

export async function getChapterVideo(
  courseId: string,
  chapterId: string
): Promise<ChapterVideo> {
  const { data } = await signOutOn401(
    apiClient.get<ChapterVideo>(
      `/api/v1/courses/${courseId}/chapters/${chapterId}/video`
    )
  )
  return data
}

export async function getChapterOverview(
  courseId: string,
  chapterId: string
): Promise<ChapterOverview> {
  const { data } = await signOutOn401(
    apiClient.get<ChapterOverview>(
      `/api/v1/courses/${courseId}/chapters/${chapterId}/overview`
    )
  )
  return data
}

// --- hooks ---

export function useCoursesListQuery() {
  return useQuery({
    queryKey: coursesListQueryKey,
    queryFn: listCourses,
    retry: retryUnlessClientError,
  })
}

export function useLearningCourseQuery(courseId: string | undefined) {
  return useQuery({
    queryKey: learningCourseQueryKey(courseId ?? 'none'),
    queryFn: () => getLearningCourse(courseId as string),
    enabled: Boolean(courseId),
    retry: retryUnlessClientError,
  })
}

export function useChapterVideoQuery(
  courseId: string | undefined,
  chapterId: string | undefined
) {
  return useQuery({
    queryKey: chapterVideoQueryKey(courseId ?? 'none', chapterId ?? 'none'),
    queryFn: () => getChapterVideo(courseId as string, chapterId as string),
    enabled: Boolean(courseId) && Boolean(chapterId),
    // While the worker is fetching the video, poll until it's ready or fails.
    refetchInterval: (query) =>
      query.state.data?.status === 'downloading' ? VIDEO_POLL_MS : false,
    retry: retryUnlessClientError,
  })
}

// --- adapter: real course tree -> the mock CourseItem shape ---
//
// Temporary bridge so the existing course page/main-content keep rendering while
// only the VIDEO slice is wired to the backend. overview/quiz/assignment are out
// of scope this step, so they get empty placeholders; the video carries the real
// chapter title and the actual playable source is fetched per-chapter by
// useChapterVideoQuery. The authoritative chapter status (incl. failed) is shown
// by the sidebar, which reads the real LearningCourse directly.

const EMPTY_QUIZ: CourseQuiz = {
  questions: [],
  copy: { instructions: '', rules: '' },
  status: 'not-started',
}

const EMPTY_ASSIGNMENT: CourseAssignment = {
  questions: [],
  copy: { instructions: '', rules: '' },
  status: 'not-started',
}

function emptyOverview(): CourseOverview {
  return { markdown: '', status: 'not-started' }
}

function toCourseProgressStatus(status: string): CourseProgressStatus {
  switch (status) {
    case 'ready':
      return 'completed'
    case 'researching':
    case 'building':
      return 'in-progress'
    default:
      // failed maps to not-started here (the 3-state CourseItem contract has no
      // failed); failure surfaces in the sidebar and the video view instead.
      return 'not-started'
  }
}

export function mapLearningCourseToCourseItem(course: LearningCourse): CourseItem {
  return {
    id: course.id,
    icon: GraduationCap,
    label: course.title,
    conversationIds: [],
    units: course.units.map((unit) => ({
      id: unit.id,
      title: unit.title,
      overview: emptyOverview(),
      quiz: EMPTY_QUIZ,
      assignment: EMPTY_ASSIGNMENT,
      chapters: unit.chapters.map((chapter) => ({
        id: chapter.id,
        title: chapter.title,
        overview: emptyOverview(),
        video: {
          title: chapter.title,
          status: toCourseProgressStatus(chapter.status),
        },
        quiz: EMPTY_QUIZ,
        assignment: EMPTY_ASSIGNMENT,
      })),
    })),
  }
}
