// 题库 wire 类型：契约真相在后端 backend/schemas/question.py，这里只做镜像。
// 字段名是 Lemma 的应用契约，不是学科网字段；学科网原始 HTML 由后端解析、清洗、
// 铸造稳定 id 后才下发。前端不得按下标或显示题号去对齐答案、空和解析。
//
// 作答视图（QuestionView）永远不含参考答案与解析；它们只随判分结果
// （AttemptResult.review）下发。单/多选、判断、选项能否复用、能否自动判分这类
// HTML 推不出来的信息全部由后端显式给出，给不出时是 'unknown'，前端不猜。

// ---------- 作答视图（提交前可见，不含任何参考答案） ----------

/** 后端已清洗、词汇受限的 HTML 片段；前端渲染前仍做白名单二次过滤。 */
export interface RichHtml {
  html: string
}

export type SlotMechanism =
  /** 从绑定的选项组中选择；单/多由 select 决定 */
  | 'choice'
  /** 从共享选项池为本空指派一项（七选五） */
  | 'pool-assign'
  /** 行内短文本（填空） */
  | 'text'
  /** √ / × */
  | 'judge'
  /** 隐式作答区 / 主观长答 */
  | 'essay'
  /** 后端识别到结构但给不出机制；只读 */
  | 'unsupported'

/**
 * 后端对"这一空能否自动判分"的判断；只影响结果页预期，不影响输入控件。
 * 首期 essay 恒为 'none'；'manual' 留给以后的 AI 批改。
 */
export type SlotGrading = 'auto' | 'manual' | 'none' | 'unknown'

export interface BlankPresentation {
  style: 'underline' | 'bracket'
  /** 全角字符数（qml-bk[size]）；仅作宽度提示 */
  size: number | null
  /** 作为小题空时的序号文字（"1"）；否则 null */
  inlineLabel: string | null
}

export interface ResponseSlot {
  /** 后端铸造的稳定 id；提交与结果回显的寻址键。不可由显示题号推导。 */
  id: string
  mechanism: SlotMechanism
  grading: SlotGrading
  /** choice / pool-assign 绑定的选项组 id */
  optionGroupId: string | null
  /** 仅 choice 有意义；unknown 时前端按多选控件呈现 */
  select: 'single' | 'multiple' | 'unknown' | null
  /** 行内空的呈现提示；essay 为 null */
  blank: BlankPresentation | null
  /**
   * 题干 HTML 中是否存在 data-slot-id 锚点。完形的行内空锚点在公共题干里，
   * 而槽位归属于小题；渲染器按 id 全局查找。false = 渲染在所属题干末尾。
   */
  anchored: boolean
}

export interface QuestionOption {
  id: string
  /** 显示字母 A/B/C/… */
  label: string
  content: RichHtml
}

export interface OptionGroup {
  id: string
  options: QuestionOption[]
  /** 原卷每行选项数；null = 未知，前端自适应 */
  cols: number | null
  layout: 'table' | 'inline' | 'unknown'
  /** 共享池能否被多个槽位重复选用；非共享池为 null */
  reuse: 'exclusive' | 'allowed' | 'unknown' | null
  /** 题干 HTML 中是否有 data-og-id 锚点；false = 渲染在所属题干末尾 */
  anchored: boolean
}

export interface MediaAsset {
  kind: 'audio' | 'video' | 'image'
  src: string
  title: string | null
  durationSeconds: number | null
  poster: string | null
}

export interface SubQuestion {
  id: string
  /** 显示题号，如 "1." 或 "（1）"；后端按 numbering 生成，前端不再从 ques-no 取 */
  label: string
  /** 小题自己的题干（已剥离 ques-no 与选项组）；完形的小题可为 null */
  stem: RichHtml | null
  slots: ResponseSlot[]
  optionGroups: OptionGroup[]
  media: MediaAsset[]
}

export interface QuestionMeta {
  source: {
    /** 目前只有 'xkw'；契约留作开放字符串，以后接 AI 生成题等来源。 */
    provider: 'xkw' | (string & {})
    externalId: string
    /** 决定能力边界：massive = 只读 */
    sourceKind: 'premium' | 'massive' | 'paper' | 'other'
  }
  typeId: string | null
  typeName: string | null
  /** 0~1 通过率 */
  difficulty: number | null
  difficultyLevel: 17 | 18 | 19 | 20 | 21 | null
  knowledgePoints: { id: string; name: string }[]
  years: number[]
  sourcePapers: string[]
  /** 学科网课程名（学段×学科），与 Lemma 课程无关 */
  courseName: string | null
}

export interface QuestionView {
  id: string
  /** 内容版本/哈希；提交时回传，后端据此拒绝过期作答 */
  contentVersion: string
  structure: 'parsed' | 'raw'
  numbering: 'sequential' | 'per-question' | 'none'
  /** 公共题干/材料；含 data-slot-id / data-og-id / data-sq-id 锚点 */
  stem: RichHtml
  /** 顶层（非小题）槽位与选项组 */
  slots: ResponseSlot[]
  optionGroups: OptionGroup[]
  /** 按原文顺序 */
  subQuestions: SubQuestion[]
  media: MediaAsset[]
  meta: QuestionMeta
  /** structure = 'raw' 时的只读整块内容 */
  raw: {
    stem: RichHtml
    answer: RichHtml | null
    explanation: RichHtml | null
  } | null
}

export interface QuestionSetSection {
  id: string
  /** 大题标题，如"一、选择题"；null = 不显示分组 */
  title: string | null
  instructions: RichHtml | null
  questionIds: string[]
}

export type QuestionSetKind = 'quiz' | 'assignment' | 'practice' | 'paper'

/** batch = 统一提交；immediate = 逐题提交并即时反馈 */
export type QuestionSetMode = 'batch' | 'immediate'

/** 题组生成状态：generating 期间没有题目（前端轮询）；empty = 学科网可用题不足。 */
export type QuestionSetStatus = 'generating' | 'ready' | 'empty' | 'failed'

export interface QuestionSetView {
  id: string
  title: string
  kind: QuestionSetKind
  mode: QuestionSetMode
  status: QuestionSetStatus
  sections: QuestionSetSection[]
  questions: QuestionView[]
  /** 当前未关闭的作答会话里已判分的结果（逐题模式刷新后据此恢复锁定）。 */
  openAttempt?: { attemptSessionId: string; results: AttemptResult[] } | null
}

/** 题组列表项，供题组入口列出可做的题组。 */
export interface QuestionSetSummary {
  id: string
  title: string
  kind: QuestionSetKind
  mode: QuestionSetMode
  questionCount: number
  status: QuestionSetStatus
}

// ---------- 作答提交（前端 → 后端） ----------

export type SlotResponse =
  | { kind: 'choice'; optionIds: string[] }
  | { kind: 'pool-assign'; optionId: string | null }
  | { kind: 'text'; text: string }
  | { kind: 'judge'; value: boolean | null }
  | { kind: 'essay'; text: string }

export interface AttemptSubmission {
  questionId: string
  contentVersion: string
  /** response = null 表示该槽位未作答（含用户显式跳过） */
  responses: { slotId: string; response: SlotResponse | null }[]
  clientSubmittedAt: string
}

// ---------- 批阅视图与判分结果（提交后下发） ----------

export type ReferenceAnswer =
  | { kind: 'options'; optionIds: string[] }
  /** ## 已由后端拆分；(s) 这类可选字符规则留在后端判分 */
  | { kind: 'exact'; accepted: string[]; display: RichHtml }
  /** judge=2（未指定）→ null */
  | { kind: 'judge'; value: boolean | null }
  | { kind: 'rich'; content: RichHtml }
  /** 无法对齐到本槽位 */
  | { kind: 'missing' }

export type ExplanationScope =
  | { kind: 'question' }
  | { kind: 'sub-question'; subQuestionId: string }
  | { kind: 'slot'; slotId: string }
  | { kind: 'unknown' }

export interface ExplanationSegment {
  /** 分析 / 详解 / 点睛 / 导语 / (1)题详解 … */
  name: string
  content: RichHtml
  scope: ExplanationScope
}

export interface QuestionReview {
  questionId: string
  contentVersion: string
  referenceAnswers: { slotId: string; answer: ReferenceAnswer }[]
  /** 槽位对齐失败时的整块参考答案 */
  answerFallback: RichHtml | null
  explanation: ExplanationSegment[]
  /** 解题视频等 */
  media: MediaAsset[]
}

export type SlotVerdict =
  | 'correct'
  | 'incorrect'
  | 'partial'
  /** 等待人工 / AI 评阅；首期后端不产出 */
  | 'pending'
  /** 不评阅（grading = none）；首期主观题恒为此值 */
  | 'not-graded'
  | 'unanswered'

export interface Score {
  earned: number
  total: number
}

export interface SlotResult {
  slotId: string
  verdict: SlotVerdict
  /**
   * 后端判分时采用的作答回显（提案补充）：只读回看不依赖本地草稿，刷新后
   * 也能显示"你的答案"。
   */
  response: SlotResponse | null
  score: Score | null
  /** AI / 人工评语；Markdown 时可交给现有 AssistantMarkdown */
  feedback: { format: 'html' | 'markdown'; text: string } | null
}

export type AttemptStatus =
  | 'graded'
  | 'partially-graded'
  | 'pending'
  | 'ungradable'

export interface AttemptResult {
  attemptId: string
  questionId: string
  status: AttemptStatus
  /** 只统计 grading = 'auto' 的槽位；主观题不计分 */
  score: Score | null
  slots: SlotResult[]
  /** 下发时机：只随判分结果；未到可见时机为 null */
  review: QuestionReview | null
  submittedAt?: string | null
  attemptSessionId?: string | null
}
