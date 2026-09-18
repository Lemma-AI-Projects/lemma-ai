// 课程域 wire 类型：契约真相在后端 backend/schemas/course.py，这里只做镜像。
// 层级为 课程 → 章(module) → 单元(lesson) → 学习点(point)，一个学习点绑定一个视频。
//
// status / buildStatus 描述的是「生成管线」状态，不是学习进度：课程一交付，
// 所有学习点都是 ready 而用户一节未学。学习进度尚未实现，禁止用这两个字段渲染进度。

/** 课程生命周期。intake/organizing/materializing 期间课程不可进入。 */
export type CourseStatus =
  | 'intake'
  | 'organizing'
  | 'materializing'
  | 'ready'
  | 'failed'

/** 学习点的生成管线状态。 */
export type PointBuildStatus =
  | 'not_started'
  | 'researching'
  | 'ready'
  | 'failed'

export interface CoursePoint {
  id: string
  title: string
  buildStatus: PointBuildStatus
}

export interface CourseLesson {
  id: string
  title: string
  /** 几句话的单元概述；模型未产出时为 null。 */
  summary: string | null
  points: CoursePoint[]
}

export interface CourseModule {
  id: string
  title: string
  summary: string | null
  lessons: CourseLesson[]
}

export interface CourseDetail {
  id: string
  title: string
  description: string | null
  /** 封面图 URL；尚未生成，当前恒为 null，仪表盘渲染占位块。 */
  coverUrl: string | null
  status: CourseStatus
  questionnaireReady: boolean
  modules: CourseModule[]
}

export interface CourseListItem {
  id: string
  title: string
  description: string | null
  coverUrl: string | null
  status: CourseStatus
  createdAt: string
  updatedAt: string
}

// --- 学习点视频交付 ---

export type PointVideoStatus = 'ready' | 'downloading' | 'failed'

export interface PointVideoSource {
  platform: string
  title: string
  url: string
}

export interface PointVideoAuthor {
  name: string | null
  homepageUrl: string | null
}

export interface PointVideo {
  status: PointVideoStatus
  playbackUrl: string | null
  source: PointVideoSource
  author: PointVideoAuthor
  expiresAt: string | null
}
