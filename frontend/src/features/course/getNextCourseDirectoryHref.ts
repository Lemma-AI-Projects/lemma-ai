// Minimal structural shape so this works for both the (adapted) mock CourseItem
// and the real learning tree — it only needs ordered units -> chapters with ids.
interface CourseDirectoryShape {
  units: Array<{ id: string; chapters: Array<{ id: string }> }>
}

// Full directory order: unit overview, then each chapter's
// overview/video/quiz/assignment, then unit quiz/assignment. Only the video is
// backend-backed this step; the rest render as placeholders, but they stay in
// the order so the directory + "下一章"/skip navigation are complete.
function getCourseDirectoryOrder(course: CourseDirectoryShape): string[] {
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
  course: CourseDirectoryShape,
  currentContentId: string
): string | null {
  const order = getCourseDirectoryOrder(course)
  const currentIndex = order.indexOf(currentContentId)

  if (currentIndex < 0 || order.length === 0) {
    return null
  }

  return `#${order[(currentIndex + 1) % order.length]}`
}
