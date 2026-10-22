/**
 * 画布原型的元素 mock —— **三类，各一个**。
 *
 * 为什么各只有一个：这一轮验的是「类与类之间**可分辨、行为不同**」，
 * 不是数量。同类塞两个，评审就会开始注意排列和密度，而那是 Stage 1 没打算回答的问题。
 *
 * ⚠️ 原型里没有任何掌握度、进度、学习分析（用户 §4 的红线）。
 * note 的文本是一句真实的学习笔记，file 的内容是真实的数学 —— 因为"内容像真的"
 * 本身就是交互可信度的一部分；但它们背后**没有**任何推断。
 */

export type ElementClass = 'file' | 'note' | 'interactive'

export interface CanvasElement {
  id: string
  class: ElementClass
  /** 卡片标题。note 的标题固定为「便签」，真正的字在 `text` 里。 */
  title: string
  /** 未缩放坐标系（px）。位置在原型里进 sessionStorage（见页面壳）。 */
  x: number
  y: number
  /** note：可编辑的正文。 */
  text?: string
  /** file：一行来源说明（第三章 · 12 页 这种），让卡片看着像"有内容的东西"。 */
  meta?: string
}

export const INITIAL_ELEMENTS: CanvasElement[] = [
  {
    id: 'f1',
    class: 'file',
    title: '特征值讲义',
    meta: '第三章 · 12 页',
    x: 90,
    y: 70,
  },
  {
    id: 'n1',
    class: 'note',
    title: '便签',
    text: '方向不变才是关键 —— 被转走的，倍数再大也不是。',
    x: 470,
    y: 150,
  },
  {
    id: 'i1',
    class: 'interactive',
    title: '试一试：转出特征方向',
    x: 190,
    y: 330,
  },
]

/**
 * file 双击进 Focus 后显示的内容。按标题取 —— 元素的 `title` 就是它的身份。
 * 只给讲义配了内容：另一个 file 没建，因为原型只需要一条完整的
 * 「双击 → 对应文件 → 返回」链路，两条并行的链路不会让它更可信。
 */
export const FILE_CONTENT: Record<string, string[]> = {
  特征值讲义: [
    '特征值回答一个问题：A 作用之后，哪些方向活了下来。',
    'Av = λv。几何上：v 方向不变，只是长度乘以 λ。',
    'λ > 0 同向，λ < 0 反向，λ = 0 被压扁。',
    '下一节：为什么"方向不变"恰好对应 det(A − λI) = 0。',
  ],
}

/** note 文本的长度上限。便签就该短；超了截断，不给自动增高。 */
export const NOTE_MAX_CHARS = 120
