import type {
  CourseOutline,
  OutlineChapter,
  OutlineKnowledgePoint,
  OutlineLesson,
  OutlineUnit,
} from './types'

export interface OutlineLessonRef {
  lesson: OutlineLesson
  unit: OutlineUnit
  chapter: OutlineChapter
}

/** 课表与知识地图互相查找用的索引，按 outline 建一次即可。 */
export interface OutlineIndex {
  pointById: ReadonlyMap<string, OutlineKnowledgePoint>
  lessonById: ReadonlyMap<string, OutlineLessonRef>
  /** 知识点挂在哪节课下面。 */
  lessonByPointId: ReadonlyMap<string, OutlineLessonRef>
  /** 每个知识点直接依赖的前置知识点。 */
  prerequisitesOf: ReadonlyMap<string, readonly string[]>
}

export function buildOutlineIndex(outline: CourseOutline): OutlineIndex {
  const pointById = new Map(
    outline.knowledgePoints.map((point) => [point.id, point])
  )
  const lessonById = new Map<string, OutlineLessonRef>()
  const lessonByPointId = new Map<string, OutlineLessonRef>()

  for (const chapter of outline.chapters) {
    for (const unit of chapter.units) {
      for (const lesson of unit.lessons) {
        const ref = { lesson, unit, chapter }
        lessonById.set(lesson.id, ref)
        for (const pointId of lesson.knowledgePointIds) {
          if (!lessonByPointId.has(pointId)) lessonByPointId.set(pointId, ref)
        }
      }
    }
  }

  const prerequisitesOf = new Map<string, string[]>()
  for (const edge of outline.prerequisites) {
    const list = prerequisitesOf.get(edge.to)
    if (list) list.push(edge.from)
    else prerequisitesOf.set(edge.to, [edge.from])
  }

  return {
    pointById,
    lessonById,
    lessonByPointId,
    prerequisitesOf,
  }
}
