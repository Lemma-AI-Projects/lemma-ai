import type {
  CourseAssignment,
  CourseChapter,
  CourseItem,
  CourseOverview,
  CourseProgressStatus,
  CourseQuiz,
  CourseUnit,
  CourseVideoLesson,
} from '@/mock/course/courseItems'

export type CourseContentType = 'overview' | 'video' | 'quiz' | 'assignment'
export type CourseContentScope = 'unit' | 'chapter'

interface CourseContentBase {
  course: CourseItem
  unit: CourseUnit
  chapter?: CourseChapter
  scope: CourseContentScope
  status: CourseProgressStatus
  title: string
}

export interface CourseOverviewContent extends CourseContentBase {
  type: 'overview'
  data: CourseOverview
}

export interface CourseVideoContent extends CourseContentBase {
  type: 'video'
  chapter: CourseChapter
  data: CourseVideoLesson
}

export interface CourseQuizContent extends CourseContentBase {
  type: 'quiz'
  data: CourseQuiz
}

export interface CourseAssignmentContent extends CourseContentBase {
  type: 'assignment'
  data: CourseAssignment
}

export type CourseQuestionFlowContent = CourseQuizContent | CourseAssignmentContent

export type CourseContent =
  | CourseOverviewContent
  | CourseVideoContent
  | CourseQuizContent
  | CourseAssignmentContent

function getDefaultTargetId(course: CourseItem) {
  const firstChapter = course.units[0]?.chapters[0]

  if (firstChapter) {
    return `${firstChapter.id}-video`
  }

  return ''
}

export function resolveCourseContent(
  course: CourseItem | undefined,
  hash: string
): CourseContent | null {
  if (!course) {
    return null
  }

  const targetId =
    decodeURIComponent(hash.replace(/^#/, '')) || getDefaultTargetId(course)

  for (const unit of course.units) {
    if (targetId === `${unit.id}-overview` || targetId === unit.id) {
      return {
        course,
        unit,
        scope: 'unit',
        type: 'overview',
        title: `${unit.title} overview`,
        status: unit.overview.status,
        data: unit.overview,
      }
    }

    if (targetId === `${unit.id}-quiz`) {
      return {
        course,
        unit,
        scope: 'unit',
        type: 'quiz',
        title: `${unit.title} quiz`,
        status: unit.quiz.status,
        data: unit.quiz,
      }
    }

    if (targetId === `${unit.id}-assignment`) {
      return {
        course,
        unit,
        scope: 'unit',
        type: 'assignment',
        title: `${unit.title} assignment`,
        status: unit.assignment.status,
        data: unit.assignment,
      }
    }

    for (const chapter of unit.chapters) {
      if (targetId === `${chapter.id}-overview` || targetId === chapter.id) {
        return {
          course,
          unit,
          chapter,
          scope: 'chapter',
          type: 'overview',
          title: `${chapter.title} overview`,
          status: chapter.overview.status,
          data: chapter.overview,
        }
      }

      if (targetId === `${chapter.id}-video`) {
        return {
          course,
          unit,
          chapter,
          scope: 'chapter',
          type: 'video',
          title: chapter.video.title,
          status: chapter.video.status,
          data: chapter.video,
        }
      }

      if (targetId === `${chapter.id}-quiz`) {
        return {
          course,
          unit,
          chapter,
          scope: 'chapter',
          type: 'quiz',
          title: `${chapter.title} quiz`,
          status: chapter.quiz.status,
          data: chapter.quiz,
        }
      }

      if (targetId === `${chapter.id}-assignment`) {
        return {
          course,
          unit,
          chapter,
          scope: 'chapter',
          type: 'assignment',
          title: `${chapter.title} assignment`,
          status: chapter.assignment.status,
          data: chapter.assignment,
        }
      }
    }
  }

  return null
}
