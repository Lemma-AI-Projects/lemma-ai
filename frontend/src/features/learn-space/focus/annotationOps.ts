/**
 * 边注的锚点规则 —— **纯函数**（和 `blockOps.ts` 同一个理由：要被单测钉住）。
 *
 * ⚠️ **不锚 `blockId`。** 后端的 `save_page_blocks` 是「整页删掉重插」
 * （`services/doc_service.py:216-226`），所以**每存一次，这一页所有块的 id 全变**。
 * 锚 blockId 的边注，用户下次编辑完就全部失效 —— 而且失效是静默的。
 *
 * 那锚什么？`position + quote + occurrence` 三个一起：
 * - `position` 会说谎 —— 用户在前头插了一段，后面的块全移位；
 * - `quote` 会老 —— 用户改了那句话，原话就不在了；
 * - 两个一起，命中率才够用；**都不命中时边注还在**，只是降级成"找不到原话了"，
 *   而 `quote` 里的原话仍然留着、还找得回来。
 *
 * 这正是设计稿 §6.5 那个边界：「删正文不会删边注」—— 边注是**你的话**，
 * 不是正文的一部分，正文没了它也不该跟着没。
 */

/** 边注块 `meta.source` 的形状。 */
export interface AnnotationSource {
  /** 被锚的那一页（资料页，不是笔记页）。 */
  pageId: string
  /** 那块在这一页里的位置（0-based）。 */
  position: number
  /** 被锚的那段原话。 */
  quote: string
  /** 同一句 quote 在这一页里第几次出现（0-based）—— 重复句子靠它区分。 */
  occurrence: number
}

/**
 * 这个模块只要块的**最小形状**（key / type / content 里的两种文本字段）。
 * ⚠️ 刻意不用 `DraftBlock`：那样这个文件就得依赖 `blockOps`，而它对块怎么编辑
 * 一无所知 —— 它只关心"文本在哪、第几块"。结构上 `DraftBlock` 天然满足。
 */
export interface AnnotationBlock {
  key: string
  type: string
  content: { text?: string; items?: string[] }
}

/** 只要文本、不要 key —— 反查时手上只有一页块，不需要知道它们叫什么。 */
type TextCarrier = Omit<AnnotationBlock, 'key'>

/** 这一页里第 `position` 块的文本（list 块拼接所有项）。 */
function textAt(blocks: readonly TextCarrier[], position: number): string {
  const block = blocks[position]
  if (!block) return ''
  if (block.type === 'list') {
    return ((block.content.items as string[] | undefined) ?? []).join('\n')
  }
  return (block.content.text as string | undefined) ?? ''
}

/**
 * 造一个锚点。**找不到那块就返回 null** —— 调用方该放弃，而不是存一个
 * `position: -1` 的假锚点（那种东西在反查时会对上错误的块）。
 */
export function buildAnnotationSource(
  blocks: readonly AnnotationBlock[],
  blockKey: string,
  quote: string,
  pageId: string
): AnnotationSource | null {
  const position = blocks.findIndex((block) => block.key === blockKey)
  if (position === -1) return null
  const trimmed = quote.trim()
  if (!trimmed) return null
  // 同样的原话在**它之前**出现过几次 —— 那就是第几次出现。
  let occurrence = 0
  for (let i = 0; i < position; i += 1) {
    if (textAt(blocks, i).includes(trimmed)) occurrence += 1
  }
  return { pageId, position, quote: trimmed, occurrence }
}

/**
 * 按锚点找回那一页里的位置。**纯函数**：给定这一页今天的块，返回它现在在哪。
 *
 * ⚠️ 三级降级，每级都要能用：
 * 1. quote 在 `position` 那块里 ⇒ 直接中（最常见，用户没编辑过）；
 * 2. 否则全文找第 `occurrence` 个匹配 ⇒ 位置变了也对得上；
 * 3. 都不中 ⇒ 返回 null，调用方说"原话已不在" —— **不猜一个邻近位置**。
 */
export function resolveAnnotationSource(
  blocks: readonly TextCarrier[],
  source: AnnotationSource
): number | null {
  if (blocks[source.position] && textAt(blocks, source.position).includes(source.quote)) {
    return source.position
  }
  let seen = 0
  for (let i = 0; i < blocks.length; i += 1) {
    if (!textAt(blocks, i).includes(source.quote)) continue
    if (seen === source.occurrence) return i
    seen += 1
  }
  return null
}

/**
 * 这一次按键是不是「记一句」的发起键？
 *
 * ⚠️ **必须真有一段被选中**。没有选中时 `n` 就是用户要打进去的那个字母 ——
 * 拦下来等于吞字。这也正是「选中即写」被否掉的原因：那个方案会把每一次
 * 「选一段想复制」都变成一个输入框。
 *
 * ⚠️ **为什么提成纯函数**：本仓库没有 jsdom（`vite.config.ts` 的
 * `environment: 'node'`），组件测试是静态 markup 断言，**跑不了事件序列**
 * ⇒ 按键规则只活在组件里的话，它零自动化防线。形状刻意就是浏览器
 * `KeyboardEvent` + `HTMLTextAreaElement` 的那两个字段，调用方原样传。
 */
export function isAnnotationShortcut(event: {
  key: string
  metaKey: boolean
  ctrlKey: boolean
  altKey: boolean
  selectionStart: number | null
  selectionEnd: number | null
}): boolean {
  return (
    event.key.toLowerCase() === 'n' &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.altKey &&
    event.selectionStart !== event.selectionEnd
  )
}
