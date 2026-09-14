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