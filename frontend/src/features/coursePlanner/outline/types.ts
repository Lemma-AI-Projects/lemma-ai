// 「知识地图与课表」阶段的前端视图模型，目前只服务沙盒里的方案对比。
//
// 后端尚无对应契约。接入真实数据时以交接单为准重新映射，不要把这里的形态当成契约。

export interface OutlineKnowledgePoint {
  id: string
  name: string
  /** 与用户其他课程共用 / 已学过时给出那门课的名称，用于轻标记。 */
  learnedIn?: string
}

/** 有向边：学 `to` 之前要用到 `from`。 */
export interface OutlinePrerequisite {
  from: string
  to: string
}

export interface OutlineLesson {
  id: string
  /** 课程序号（第 N 课）。 */
  number: number
  title: string
  knowledgePointIds: string[]
}

export interface OutlineUnit {
  id: string
  title: string
  lessons: OutlineLesson[]
}

export interface OutlineChapter {
  id: string
  title: string
  units: OutlineUnit[]
}

export interface CourseOutline {
  chapters: OutlineChapter[]
  knowledgePoints: OutlineKnowledgePoint[]
  prerequisites: OutlinePrerequisite[]
}

/** 先梳理知识地图，再编排课表，最后就绪待确认。 */
export type OutlinePhase = 'mapping' | 'scheduling' | 'ready'

/** 生成中已经浮现出来的部分；就绪后忽略。 */
export interface OutlineProgress {
  knowledgePointCount: number
  /** 编排课表时已浮现的课数，按课表顺序；最后一节是正在编排的那节。 */
  lessonCount: number
}

/**
 * 课标题前的图标，几种候选样式在沙盒里并排对比；选定一种后其余连同这个类型删掉。
 * 每种都有「正在编排」的动态和编排完的静态两种样子。
 * - ring：与章 / 单元同一种虚线圆环，小一号；编排中缓慢旋转
 * - square：同样节奏的虚线圆角方块；编排中虚线沿边流动
 * - ring-thin：细实线圆环；编排中是同样细的转圈
 * - book：书页图标；编排中先转圈，编排完换成图标
 * - play：播放图标（课是视频时）；编排中先转圈，编排完换成图标
 */
export type LessonMarkerStyle = 'ring' | 'square' | 'ring-thin' | 'book' | 'play'

/** 所有方案卡片共用的入参：同一份数据、同一个阶段，只是呈现方式不同。 */
export interface CourseOutlineCardProps {
  title: string
  outline: CourseOutline
  phase: OutlinePhase
  progress: OutlineProgress
  lessonMarker?: LessonMarkerStyle
  onEdit?: () => void
  onCancel?: () => void
  onConfirm?: () => void
}
