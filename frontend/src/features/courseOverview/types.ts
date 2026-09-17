export interface CourseOverviewLearningPoint {
  id: string
  title: string
  completed: boolean
  /** 综合评估只展示「进入练习」入口。 */
  practiceOnly?: boolean
}

export interface CourseOverviewUnitCardData {
  title: string
  summary: string
  points?: CourseOverviewLearningPoint[]
}

export interface CourseOverviewUnit {
  id: string
  /** 章内单元编号。 */
  label: string
  title: string
  progress: number
  quizProgress: number
  /** 无卡片时仅展示单元进度圆环。 */
  card?: CourseOverviewUnitCardData
}

export interface CourseOverviewChapter {
  id: string
  label: string
  /** 章节标题使用的中文序号，例如「一」。 */
  ordinalLabel: string
  title: string
  summary: string
  progress: number
  units: CourseOverviewUnit[]
}

export interface CourseOverviewData {
  id: string
  title: string
  description: string
  chapters: CourseOverviewChapter[]
}
