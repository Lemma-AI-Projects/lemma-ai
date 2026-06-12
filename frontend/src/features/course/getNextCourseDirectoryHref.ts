import type { CourseItem } from '@/mock/course/courseItems'

function getCourseDirectoryOrder(course: CourseItem): string[] {
  return course.units.flatMap((unit) => [
    `${unit.id}-overview`,
    ...unit.chapters.flatMap((chapter) => [
      `${chapter.id}-overview`,
      `${chapter.id}-video`,
      `${chapter.id}-quiz`,
      `${chapter.id}-assignment`,
    ]),
    `${unit.id}-quiz`,
    `${unit.id}-assignment`,
  ])
}

export function getNextCourseDirectoryHref(
  course: CourseItem,
  currentContentId: string
): string | null {
  const order = getCourseDirectoryOrder(course)
  const currentIndex = order.indexOf(currentContentId)

  if (currentIndex < 0 || order.length === 0) {
    return null
  }

  return `#${order[(currentIndex + 1) % order.length]}`
}
