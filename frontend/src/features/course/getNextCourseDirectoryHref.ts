// Minimal structural shape so this works for both the (adapted) mock CourseItem
// and the real learning tree — it only needs ordered units -> chapters with ids.
interface CourseDirectoryShape {
  units: Array<{ id: string; chapters: Array<{ id: string }> }>
}

// This step only delivers chapter VIDEOS, so the directory order is the chapters'
// videos in unit→chapter order. overview/quiz/assignment slots are out of scope
// and intentionally excluded, so "下一章" / skip move video → next video.
function getCourseDirectoryOrder(course: CourseDirectoryShape): string[] {
  return course.units.flatMap((unit) =>
    unit.chapters.map((chapter) => `${chapter.id}-video`)
  )
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

  if (currentIndex + 1 >= order.length) {
    return null
  }

  return `#${order[currentIndex + 1]}`
}
