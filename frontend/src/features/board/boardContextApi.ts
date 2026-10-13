import { apiClient } from '@/lib/apiClient'
import { signOutOn401 } from '@/lib/apiUtils'

/**
 * Mala 投送包的前端客户端（`POST /api/v1/board/contexts`）。
 *
 * 后端**已经做完了**这一层：它只做三件事 —— 存住一次选择、能读回、能被对话
 * 引用。所以这里没有画板坐标系、没有 tldraw 的 id 规则；`shapeId` 与
 * `boundingBox` 都是前端的东西，后端原样存原样给（它只用它们「回到出处」）。
 *
 * 命名与后端 `schemas/board_context.py` 一一对应，**wire 一律 camelCase**
 * （后端 `alias_generator=to_camel`）：写错键名不会 422，而是被静默忽略 ——
 * 材料就白投了。所以 `buildBoardContextBody` 是纯函数，专门给单测钉住这件事。
 */

/** 掌握度三态，与 Learner State 同一套词。缺席 = 这条没有掌握度可言。 */
export type Mastery = 'known' | 'learning' | 'due'

/** 一个被选中项的语义投影。聚焦里 `shapeId` 就是块 id，`type` 是块的种类。 */
export interface BoardContextItem {
  shapeId: string
  type: string
  text: string
  mastery?: Mastery | null
  /** 它连到的其它项。聚焦的块没有连接，省略即可。 */
  connectedIds?: string[]
}

export interface CreateBoardContextInput {
  projectId: string
  /** 群的名字（临时框出来的一片可以没有名字）。 */
  label?: string | null
  source?: 'selection' | 'cluster'
  selectionMode?: 'rectangle' | 'lasso'
  /** 选区在前端坐标系里的位置，仅供「回到出处」高亮 —— 后端不解释。 */
  boundingBox?: Record<string, unknown> | null
  items: BoardContextItem[]
}

export interface BoardContextBundle {
  id: string
  projectId: string
  label: string | null
  source: 'selection' | 'cluster'
  selectionMode: 'rectangle' | 'lasso'
  /** 由 items 长度算出，不额外存一列。 */
  itemCount: number
  createdAt: string
  items: BoardContextItem[]
}

/**
 * 把一次投送拼成 wire body。**纯函数**：默认值在这里定，单测直接钉它的输出，
 * 不碰 axios 也不碰网络。`selectionMode` 默认 `rectangle` —— 聚焦里是点块选中，
 * 不是框选，但这一列只用于「回到出处」高亮，沿用默认即可，不为它加迁移。
 */
export function buildBoardContextBody(
  input: CreateBoardContextInput
): Record<string, unknown> {
  return {
    projectId: input.projectId,
    label: input.label ?? null,
    source: input.source ?? 'selection',
    selectionMode: input.selectionMode ?? 'rectangle',
    boundingBox: input.boundingBox ?? null,
    items: input.items,
  }
}

/**
 * 一次 Mala 投送，返回它的包（`id` 就是下一轮聊天的入场券）。
 *
 * 后端的拒绝（空选区 / 超 24 项 / 一条文本都读不出）都是 422 且带机器可读
 * `reason`，调用方直接把原因显示出来即可 —— 它**绝不截断**，所以界面上的条数
 * 就是实际带上的条数。
 */
export async function createBoardContext(
  input: CreateBoardContextInput
): Promise<BoardContextBundle> {
  const { data } = await signOutOn401(
    apiClient.post<BoardContextBundle>(
      '/api/v1/board/contexts',
      buildBoardContextBody(input)
    )
  )
  return data
}

/**
 * 一次投送最多带多少项。⚠️ **与后端 `services/board_context.py:23` 是同一个数字，
 * 但没有单一来源** —— 跨进程的常量只能靠两边各自写死 + 注释互相指。
 * 前端要它，是为了在用户还没撞墙之前就提示（后端超限直接 422，而 422 之后
 * 他要重新圈一次）。
 */
export const MAX_MALA_ITEMS = 24

/**
 * 后端的拒绝码 → 一句给人看的话。
 *
 * ⚠️ **原话不是答案。** `detail` 里是 `too_many_items` / `no_readable_text` 这种
 * **机器可读的 snake_case**（`services/board_context_service.py:77-81`），
 * 直接显示给用户等于把接口文档贴在错误提示上。第一版就是这么做的，还写了句
 * "原话就是答案"的注释 —— 那句话是错的：那个字段是给调用方程序的，不是给人的。
 */
const REASON_TEXT: Record<string, string> = {
  empty_selection: '还没有圈出任何块',
  too_many_items: '一次最多 24 块，分两次投',
  no_readable_text: '圈中的块里没有可读的文字',
  project_not_found: '这个空间不存在，可能已经被删掉',
}

/**
 * 把一次失败的投送翻译成一句给人看的话。
 *
 * 已知的拒绝码翻成中文；未知的兜底一句、并把原码附在括号里 —— 那是给开发看的，
 * 用户至少知道"这是个技术细节而不是我又做错了"。pydantic 的校验失败是数组形状，
 * 那种连原码都没有，只能兜底。
 */
export function malaFailureText(error: unknown): string {
  const detail = (error as { response?: { data?: { detail?: unknown } } })?.response?.data
    ?.detail
  if (typeof detail === 'string' && detail.trim()) {
    return REASON_TEXT[detail] ?? `这批材料没法投送（${detail}）`
  }
  if (Array.isArray(detail) && detail.length > 0) {
    return '这批材料里有不合法的内容，改一下再试'
  }
  return '打包没成功，圈好的块还在，再试一次'
}
