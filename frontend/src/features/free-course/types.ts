// Wire contract for Free-Course (backend schemas/free_course.py, camelCase).
// `explanation`/`example`/`practice`/`assessment` are the lesson object kinds the
// content step emits; the lesson read strips grade facts (answer/expected).

export type FreeCourseMode = 'video' | 'free'

export interface FreeLessonBlueprint {
  objective: string
  prerequisites: string[]
  sequence: string[]
}

export interface FreeLesson {
  id: string
  title: string
  objective: string | null
  blueprint: FreeLessonBlueprint | null
  hasContent: boolean
}

export interface FreeUnit {
  id: string
  title: string
  objective: string | null
  lessons: FreeLesson[]
}

// Loose wire shape of LearningIntent — rendered defensively as chips rather than
// tied to any single key set, so the model's output can evolve without a schema
// bump on the client.
export interface FreeCourseIntent {
  topic?: string
  level?: string
  goal?: string
  assumptions?: string[]
  [key: string]: unknown
}

export interface FreeCourseDetail {
  id: string
  mode: FreeCourseMode
  status: string
  title: string
  topic: string
  audience: string | null
  summary: string | null
  intent: FreeCourseIntent | null
  /** 问卷答案（course_volume/depth/focus/pace + skip）。没答过是 null。 */
  tuning: Record<string, unknown> | null
  units: FreeUnit[]
}

export interface FreePracticeOption {
  id: string
  text: string
}

export type FreeLearningObjectKind =
  | 'explanation'
  | 'example'
  | 'practice'
  | 'assessment'

export interface FreeLearningObject {
  id: string
  kind: FreeLearningObjectKind
  title: string
  body: string
  concept: string | null
  difficulty: string
  options: FreePracticeOption[]
  hint: string | null
}

export interface FreeLessonRef {
  chapterId: string
  title: string
}

export interface FreeLessonContent {
  chapterId: string
  title: string
  objective: string
  objects: FreeLearningObject[]
  /** Next lesson in the course's own order; null on the last one. */
  next: FreeLessonRef | null
}

// The `step` frame of /build/stream (camelCase on the wire).
export interface FreeBuildStepEvent {
  step: string
  status: 'started' | 'finished' | 'failed'
  detail: string | null
  payload: Record<string, unknown> | null
  errorCode: string | null
  errorMessage: string | null
}

// The five real build stages the pipeline emits (intent -> map -> path ->
// blueprint -> content), followed by a terminal `done`/`error` frame. The
// progress block renders exactly these, in this order.
export type FreeBuildStepKey = 'intent' | 'map' | 'path' | 'blueprint' | 'content'

export const freeBuildStepOrder: readonly FreeBuildStepKey[] = [
  'intent',
  'map',
  'path',
  'blueprint',
  'content',
]

export type FreeBuildStepStatus = 'pending' | 'running' | 'done' | 'failed'

export interface FreeBuildStepState {
  status: FreeBuildStepStatus
  /** One-liner ("3 个单元 · 6 节课", "从「导数定义」开始"…). */
  detail: string | null
  /** The step's product in wire shape (intent chips / unit tree / path…). */
  payload: Record<string, unknown> | null
}

export type FreeBuildProgress = Record<FreeBuildStepKey, FreeBuildStepState>

// Generating ONE lesson (the tail of the build, run on its own) emits a subset
// of the same steps with the same frame shape — but a progress map of its own,
// because a total record over all five keys would claim steps that never run.
export type FreeLessonStepKey = 'blueprint' | 'content'

export const freeLessonStepOrder: readonly FreeLessonStepKey[] = [
  'blueprint',
  'content',
]

export type FreeLessonProgress = Record<FreeLessonStepKey, FreeBuildStepState>

export interface FreeAnswerFeedback {
  verdict: 'correct' | 'partial' | 'incorrect'
  feedback: string
  hint: string | null
  isCorrect: boolean | null
}

// Pre-blueprint questionnaire: the learner tunes this one course's volume /
// depth / focus / pace. Wire shape of CourseTuningStartOut (camelCase); the
// four dims map 1:1 onto UserProfile, which is where `defaults` comes from.
export interface CourseTuningOption {
  value: string
  label: string
}

export interface CourseTuningQuestion {
  key: string
  title: string
  options: CourseTuningOption[]
}

export interface CourseTuningStart {
  defaults: Record<string, unknown>
  questions: CourseTuningQuestion[]
}

// The POST /tuning payload: either the four chosen dims, or skip=true to run
// with the inferred persona as-is.
export interface CourseTuningSubmit {
  volume?: string | null
  depth?: string | null
  focus?: string | null
  pace?: string | null
  skip?: boolean
}

// What a build/stream run hands back. In phase 1 the course is not built yet:
// the stream stops at the questionnaire instead of `done`.
export type FreeCourseStreamResult =
  | { outcome: 'done'; course: FreeCourseDetail }
  | { outcome: 'questionnaire'; offer: CourseTuningStart }
// --- Blueprint edit (全量编辑) -------------------------------------------
//
// 载荷是**声明式的完整期望树**：没回传的节点 = 要删。`id` 为 null/undefined = 新增。
// `title` 传空串会被后端 400（`min_length=1`），所以前端在提交前挡一道。

export interface FreeLessonEdit {
  id: string | null
  title: string
  /** 全量语义：不回传就等于清空，所以必须把原值带回来。 */
  objective: string | null
}

export interface FreeUnitEdit {
  id: string | null
  title: string
  lessons: FreeLessonEdit[]
}

export interface FreeCourseTreeEdit {
  units: FreeUnitEdit[]
}
