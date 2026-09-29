/**
 * 聚焦模式里「正文」的全部编辑规则 —— **纯函数，零 React、零 I/O**。
 *
 * 为什么要单独一个模块：正文的每一次改动（回车分块、Backspace 合块、换类型、
 * 上下挪）都是**对一整份草稿的变换**，不是对某一个 DOM 的变换。把它写成
 * `(draft, 光标位置) -> (新草稿, 下一个光标位置)`，编辑器那一层就只剩"把事件翻
 * 译成调用、把结果画出来"，而每一条规则都能被单测钉住（见 blockOps.test.ts）。
 *
 * 三个来由，写下来免得以后有人"顺手优化"掉：
 *
 * 1. **草稿块的 key 是本地生成的，不是数据库 id。** 后端的 `save_page_blocks` 是
 *    "整页删掉重插"（`services/doc_service.py:216-226`），所以**每存一次，块的 id
 *    全变**。id 因此不能当身份用 —— 列表 key、光标定位、将来的锚点，全都不能挂在
 *    它上面（这条对边注尤其致命，见 focus-mode-design.md §6.5）。
 * 2. **类型是裸字符串**，跟后端 `BLOCK_TYPES`（`models/doc.py:35-46`）对齐；
 *    未知类型不报错，按段落处理 —— 渲染端一直是这么降级的。
 * 3. **保存是整页重写**，`meta` 必须原样带回去。今天没人写 `meta`，但它是"来源
 *    映射"预留的位置（`models/doc.py:113`）；不回传就等于每次保存都把将来要用的
 *    锚点抹掉一次。
 */

import type { BlockIn, DocBlock } from '@/features/docs/types'

/** 块内容。字段是所有类型共用的联合，按 `type` 取用（与渲染端同一套约定）。 */
export interface BlockContent {
  text?: string
  level?: number
  ordered?: boolean
  items?: string[]
  language?: string
}

/** 读得懂、也编得动的类型。`divider` 没有文本，不给它输入框。 */
export const BLOCK_TYPES = [
  'paragraph',
  'heading',
  'list',
  'code',
  'quote',
  'divider',
] as const

export type BlockType = (typeof BLOCK_TYPES)[number]

export const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  paragraph: '正文',
  heading: '标题',
  list: '列表',
  code: '代码',
  quote: '引用',
  divider: '分割线',
}

/** 草稿里的一块。`key` 只在此刻的这一份草稿里有效（见文件头第 1 条）。 */
export interface DraftBlock {
  key: string
  type: string
  content: BlockContent
  meta: Record<string, unknown> | null
}

/** 一次编辑之后，光标该去哪。`item` 只对列表块有意义。 */
export interface FocusRequest {
  key: string
  item?: number
  at?: number | 'end'
}

export interface EditResult {
  draft: DraftBlock[]
  focus?: FocusRequest
}

/** 大纲的一行。`index` 是它在草稿里的位置，用来滚过去。 */
export interface OutlineRow {
  key: string
  index: number
  text: string
  level: number
}

let keySeed = 0

/** 本地 key。确定性递增，测试里好断言（不掺随机数）。 */
export function nextKey(): string {
  keySeed += 1
  return `b${keySeed}`
}

/** 只给测试用：让 key 从 b1 重新开始。 */
export function resetKeys(): void {
  keySeed = 0
}

function clampLevel(level: unknown): number {
  const value = typeof level === 'number' ? level : 2
  return Math.min(Math.max(Math.round(value), 1), 6)
}

/** 这一块身上那段可编辑的纯文本（列表是多项，这里给的是它们的换行拼接）。 */
export function textOf(block: DraftBlock): string {
  if (block.type === 'list') return (block.content.items ?? []).join('\n')
  return block.content.text ?? ''
}

export function isBlank(block: DraftBlock): boolean {
  if (block.type === 'divider') return false
  if (block.type === 'list') {
    return (block.content.items ?? []).every((item) => item.trim() === '')
  }
  return textOf(block).trim() === ''
}

/** 有输入框的类型才编得动。 */
export function isEditableType(type: string): boolean {
  return type !== 'divider'
}

export function emptyContentOf(type: string): BlockContent {
  if (type === 'heading') return { text: '', level: 2 }
  if (type === 'list') return { items: [''], ordered: false }
  if (type === 'code') return { text: '', language: '' }
  return { text: '' }
}

export function newBlock(type: BlockType = 'paragraph'): DraftBlock {
  return { key: nextKey(), type, content: emptyContentOf(type), meta: null }
}

/** 存下来的块 → 草稿。未知类型保留原样，交给渲染端降级。 */
export function draftFromBlocks(blocks: DocBlock[]): DraftBlock[] {
  return blocks.map((block) => ({
    key: nextKey(),
    type: block.type,
    content: { ...((block.content ?? {}) as BlockContent) },
    meta: block.meta ?? null,
  }))
}

/**
 * 草稿 → 写请求。`position` 就是数组下标，`id` 一律 null：
 * 后端整页重写，带不带 id 结果一样，带 null 反而不会让人误以为 id 稳定。
 */
export function blocksFromDraft(draft: DraftBlock[]): BlockIn[] {
  return draft.map((block, index) => ({
    id: null,
    type: block.type,
    position: index,
    // wire 上的 content 是宽松的 `Record<string, unknown>`（后端存 JSONB），
    // 这里显式跨过去：草稿侧那套字段命名是我们自己的约定，不该反向传染给契约。
    content: { ...block.content } as Record<string, unknown>,
    meta: block.meta,
  }))
}

/** 内容指纹：只关心"是什么"，不关心本地 key。用来判断服务端的版本有没有变。 */
export function signatureOf(draft: DraftBlock[]): string {
  return JSON.stringify(draft.map((block) => [block.type, block.content]))
}

export function outlineOf(draft: DraftBlock[]): OutlineRow[] {
  const rows: OutlineRow[] = []
  draft.forEach((block, index) => {
    if (block.type !== 'heading') return
    const text = (block.content.text ?? '').trim()
    if (!text) return
    rows.push({ key: block.key, index, text, level: clampLevel(block.content.level) })
  })
  return rows
}

/** 回车之后新块是什么类型。`null` = 不分块（代码块里回车就是换行）。 */
export function typeAfterEnter(type: string): BlockType | null {
  if (type === 'code') return null
  if (type === 'heading' || type === 'divider') return 'paragraph'
  if (type === 'list') return 'list'
  if (type === 'quote') return 'quote'
  return 'paragraph'
}

function indexOfKey(draft: DraftBlock[], key: string): number {
  return draft.findIndex((block) => block.key === key)
}

function replaceAt(draft: DraftBlock[], index: number, block: DraftBlock): DraftBlock[] {
  const next = draft.slice()
  next[index] = block
  return next
}

/**
 * 在光标处把一块切成两块（标题切出来的后半段降级成正文 —— 一个标题后面
 * 接着另一个标题，几乎总是打错了）。
 */
export function splitAt(draft: DraftBlock[], key: string, at: number): EditResult {
  const index = indexOfKey(draft, key)
  if (index === -1) return { draft }
  const block = draft[index]
  if (block.type === 'list') {
    // 列表块的分块其实是"插一项"，交给 insertItemAfter（编辑器也是这么调的）。
    return insertItemAfter(draft, key, (block.content.items ?? ['']).length - 1)
  }
  if (!isEditableType(block.type)) return { draft }

  const text = block.content.text ?? ''
  const cursor = Math.min(Math.max(at, 0), text.length)
  const head = text.slice(0, cursor)
  const tail = text.slice(cursor)
  const restType: BlockType =
    block.type === 'heading' ? 'paragraph' : (block.type as BlockType)

  const next = replaceAt(draft, index, {
    ...block,
    content: { ...block.content, text: head },
  })
  next.splice(index + 1, 0, {
    key: nextKey(),
    type: restType,
    content: { ...emptyContentOf(restType), text: tail },
    meta: null,
  })
  const focusKey = next[index + 1].key
  return { draft: next, focus: { key: focusKey, at: 0 } }
}

/** 列表块里在第 `item` 项之后插一项（回车用）。 */
export function insertItemAfter(
  draft: DraftBlock[],
  key: string,
  item: number
): EditResult {
  const index = indexOfKey(draft, key)
  if (index === -1) return { draft }
  const block = draft[index]
  const items = block.content.items ?? ['']
  const next = items.slice()
  next.splice(item + 1, 0, '')
  const nextBlocks = replaceAt(draft, index, {
    ...block,
    content: { ...block.content, items: next },
  })
  return { draft: nextBlocks, focus: { key, item: item + 1, at: 0 } }
}

/**
 * Backspace 落在行首：把这一块并进上一块，光标停在接缝处。
 *
 * 三种情况分开处理 —— 空块直接删、列表项先并项、其余并进上一块：
 * 这是"退格永远不吞掉你写的东西"的最小规则集。
 */
export function mergeBack(
  draft: DraftBlock[],
  key: string,
  item?: number
): EditResult {
  const index = indexOfKey(draft, key)
  if (index === -1) return { draft }
  const block = draft[index]

  if (block.type === 'list' && item !== undefined && item > 0) {
    const items = block.content.items ?? ['']
    const current = items[item] ?? ''
    if (current === '') {
      // 空的一项：直接退掉它，**不吞上一项里的字**。
      const nextItems = items.slice()
      nextItems.splice(item, 1)
      const previousText = nextItems[item - 1] ?? ''
      const next = replaceAt(draft, index, {
        ...block,
        content: { ...block.content, items: nextItems },
      })
      return { draft: next, focus: { key, item: item - 1, at: previousText.length } }
    }
    const previous = items[item - 1] ?? ''
    const merged = previous + current
    const nextItems = items.slice()
    nextItems[item - 1] = merged
    nextItems.splice(item, 1)
    const next = replaceAt(draft, index, {
      ...block,
      content: { ...block.content, items: nextItems },
    })
    return { draft: next, focus: { key, item: item - 1, at: previous.length } }
  }

  // 列表的第一项（且它自己是空的、也是唯一一项）：整块降级成正文。
  // 不这么做的话，退格在空列表项上会毫无反应 —— 而用户以为它能退。
  if (block.type === 'list' && item === 0 && (block.content.items ?? []).length === 1) {
    const only = (block.content.items ?? [''])[0] ?? ''
    if (only === '') {
      return {
        draft: replaceAt(draft, index, {
          key: block.key,
          type: 'paragraph',
          content: { text: '' },
          meta: block.meta,
        }),
        focus: { key: block.key, at: 0 },
      }
    }
  }

  if (index === 0) return { draft }

  const previous = draft[index - 1]
  if (!isEditableType(previous.type)) return { draft }

  // 两个相邻的列表块：把这一块整段并进上一块的末尾（导入的资料里很常见）。
  if (previous.type === 'list' && block.type === 'list') {
    const previousItems = previous.content.items ?? ['']
    const seamItem = previousItems.length - 1
    const seam = (previousItems[seamItem] ?? '').length
    const merged = { ...previous, content: { ...previous.content, items: [...previousItems, ...(block.content.items ?? [])] } }
    // 这一块的第一项接着上一块的最后一项写，所以要把它们合成一项。
    const items = merged.content.items.slice()
    items[seamItem] = (previousItems[seamItem] ?? '') + (block.content.items?.[0] ?? '')
    items.splice(seamItem + 1, 1)
    const next = replaceAt(draft, index - 1, { ...merged, content: { ...merged.content, items } })
    next.splice(index, 1)
    return { draft: next, focus: { key: previous.key, item: seamItem, at: seam } }
  }

  if (previous.type !== block.type) return { draft }

  const seam = (previous.content.text ?? '').length
  const merged = previous.content.text + (block.content.text ?? '')
  const next = replaceAt(draft, index - 1, {
    ...previous,
    content: { ...previous.content, text: merged },
  })
  next.splice(index, 1)
  return { draft: next, focus: { key: previous.key, at: seam } }
}

/** 删掉一整块；光标落在它上面那一块的末尾。 */
export function removeBlock(draft: DraftBlock[], key: string): EditResult {
  const index = indexOfKey(draft, key)
  if (index === -1) return { draft }
  const next = draft.slice()
  next.splice(index, 1)
  const previous = next[Math.max(index - 1, 0)]
  return {
    draft: next,
    focus: previous ? { key: previous.key, at: 'end' } : undefined,
  }
}

/** 换类型。文字尽量跟着走：列表 ↔ 段落之间用换行拆合，别的类型共享 `text`。 */
export function setType(draft: DraftBlock[], key: string, type: BlockType): EditResult {
  const index = indexOfKey(draft, key)
  if (index === -1) return { draft }
  const block = draft[index]
  const text = textOf(block)

  let content: BlockContent
  if (type === 'list') {
    const items = text.split('\n')
    content = { items: type === block.type ? block.content.items ?? [''] : items }
  } else if (type === 'heading') {
    content = { text, level: block.type === 'heading' ? block.content.level ?? 2 : 2 }
  } else if (type === 'code') {
    content = { text, language: block.content.language ?? '' }
  } else if (type === 'divider') {
    content = {}
  } else {
    content = { text }
  }

  const next = replaceAt(draft, index, { ...block, type, content })
  return { draft: next, focus: { key, at: 'end' } }
}

export function setHeadingLevel(
  draft: DraftBlock[],
  key: string,
  level: number
): EditResult {
  const index = indexOfKey(draft, key)
  if (index === -1) return { draft }
  const block = draft[index]
  if (block.type !== 'heading') return { draft }
  const next = replaceAt(draft, index, {
    ...block,
    content: { ...block.content, level: clampLevel(level) },
  })
  return { draft: next, focus: { key, at: 'end' } }
}

/** 「标题 1/2/3」这一个动作：先确保它是标题，再设层级（正文变标题也要一步到位）。 */
export function setHeading(draft: DraftBlock[], key: string, level: number): EditResult {
  const asHeading = setType(draft, key, 'heading')
  return setHeadingLevel(asHeading.draft, key, level)
}

export function toggleListOrdered(draft: DraftBlock[], key: string): EditResult {
  const index = indexOfKey(draft, key)
  if (index === -1) return { draft }
  const block = draft[index]
  if (block.type !== 'list') return { draft }
  const next = replaceAt(draft, index, {
    ...block,
    content: { ...block.content, ordered: !block.content.ordered },
  })
  return { draft: next, focus: { key, at: 'end' } }
}

/** 上下挪一块（Alt+↑/↓）。到边界就原样返回。 */
export function moveBy(draft: DraftBlock[], key: string, delta: number): EditResult {
  const index = indexOfKey(draft, key)
  const target = index + delta
  if (index === -1 || target < 0 || target >= draft.length) return { draft }
  const next = draft.slice()
  const [block] = next.splice(index, 1)
  next.splice(target, 0, block)
  return { draft: next, focus: { key, at: 'end' } }
}

/** 文档末尾补一块（空文档的"开始写"、分割线后面的落点都用它）。 */
export function appendBlock(draft: DraftBlock[], type: BlockType = 'paragraph'): EditResult {
  const block = newBlock(type)
  return { draft: [...draft, block], focus: { key: block.key, at: 0 } }
}

/** 回车落在分割线上：它后面补一个正文块。 */
export function insertAfterKey(
  draft: DraftBlock[],
  key: string,
  type: BlockType = 'paragraph'
): EditResult {
  const index = indexOfKey(draft, key)
  if (index === -1) return appendBlock(draft, type)
  const block = newBlock(type)
  const next = draft.slice()
  next.splice(index + 1, 0, block)
  return { draft: next, focus: { key: block.key, at: 0 } }
}

/** 单块文本改动的入口（输入框 onChange 用）。列表项按 `item` 定位。 */
export function updateText(
  draft: DraftBlock[],
  key: string,
  text: string,
  item?: number
): DraftBlock[] {
  const index = indexOfKey(draft, key)
  if (index === -1) return draft
  const block = draft[index]
  if (block.type === 'list' && item !== undefined) {
    const items = (block.content.items ?? ['']).slice()
    items[item] = text
    return replaceAt(draft, index, { ...block, content: { ...block.content, items } })
  }
  return replaceAt(draft, index, { ...block, content: { ...block.content, text } })
}
