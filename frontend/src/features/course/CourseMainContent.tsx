import { useMemo, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { CourseAssignmentView } from '@/features/course/assignment/CourseAssignmentView'
import { CourseOverviewView } from '@/features/course/overview/CourseOverviewView'
import { CourseQuizView } from '@/features/course/quiz/CourseQuizView'
import { CourseVideoView } from '@/features/course/video/CourseVideoView'
import {
  resolveCourseContent,
  type CourseContent,
  type CourseContentType,
} from '@/features/course/resolveCourseContent'
import type { CourseItem } from '@/mock/course/courseItems'

export type {
  CourseAssignmentContent,
  CourseOverviewContent,
  CourseQuestionFlowContent,
  CourseQuizContent,
  CourseVideoContent,
} from '@/features/course/resolveCourseContent'

interface CourseMainContentProps {
  content?: CourseContent | null
  course?: CourseItem
}

const courseContentViewMap: Record<
  CourseContentType,
  (content: CourseContent) => ReactNode
> = {
  overview: (content) =>
    content.type === 'overview' ? <CourseOverviewView content={content} /> : null,
  video: (content) =>
    content.type === 'video' ? <CourseVideoView content={content} /> : null,
  quiz: (content) =>
    content.type === 'quiz' ? <CourseQuizView content={content} /> : null,
  assignment: (content) =>
    content.type === 'assignment' ? (
      <CourseAssignmentView content={content} />
    ) : null,
}

export function CourseMainContent({ content, course }: CourseMainContentProps) {
  const location = useLocation()
  const resolvedContent = useMemo(
    () => resolveCourseContent(course, location.hash),
    [course, location.hash]
  )
  const currentContent = content !== undefined ? content : resolvedContent

  if (!course) {
    return null
  }

  if (!currentContent) {
    return null
  }

  return courseContentViewMap[currentContent.type](currentContent)
}
