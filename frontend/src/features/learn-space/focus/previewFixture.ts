import type { DocBlock } from '@/features/docs/types'
import type { FocusPreviewData } from './FocusView'

/**
 * 聚焦模式的 mock 资料 —— **只给评审用**（`/preview/focus` 与离屏渲染 harness）。
 *
 * 为什么单独一个文件而不是写在预览页里：预览页和离屏断言脚本要看的是**同一份**
 * 资料。分成两处的话，改了预览页、断言还在按老内容检查，测试会变成"绿着的谎言"。
 */

const BLOCKS: DocBlock[] = [
  {
    id: 'b1',
    type: 'heading',
    position: 0,
    content: { text: '特征值与特征向量', level: 1 },
    meta: null,
  },
  {
    id: 'b2',
    type: 'paragraph',
    position: 1,
    content: {
      text: '如果存在非零向量 v 和数 λ，使得 Av = λv，那么 λ 叫矩阵 A 的特征值，v 叫对应的特征向量。这句话的意思是：这个方向上的向量被 A 拉伸了 λ 倍，方向没变。',
    },
    meta: null,
  },
  {
    id: 'b3',
    type: 'heading',
    position: 2,
    content: { text: '一 · 几何意义', level: 2 },
    meta: null,
  },
  {
    id: 'b4',
    type: 'paragraph',
    position: 3,
    content: {
      text: '把矩阵看成一个动作而不是一张表格，特征值就是"这个动作在某个方向上的力度"。力度为正 = 同向拉长；为负 = 反向；绝对值小于 1 = 压缩。',
    },
    meta: null,
  },
  {
    id: 'b5',
    type: 'list',
    position: 4,
    content: {
      ordered: false,
      items: [
        '特征向量必须非零 —— 零向量对任何 λ 都成立，说了等于没说',
        'λ 可以是复数，实矩阵也可能只有复特征值（比如旋转）',
        '同一个 λ 对应的特征向量构成一个子空间',
      ],
    },
    meta: null,
  },
  {
    id: 'b6',
    type: 'quote',
    position: 5,
    content: {
      text: '"矩阵的迹等于所有特征值之和，行列式等于它们之积。" —— 用它验证算出来的答案，比重新算一遍快。',
    },
    meta: null,
  },
  {
    id: 'b7',
    type: 'heading',
    position: 6,
    content: { text: '二 · 怎么算', level: 2 },
    meta: null,
  },
  {
    id: 'b8',
    type: 'paragraph',
    position: 7,
    content: {
      text: '解特征方程 det(A − λI) = 0 得到 λ，再代回去解 (A − λI)v = 0 得到特征向量。二维的情形就是解一个二次方程。',
    },
    meta: null,
  },
  {
    id: 'b9',
    type: 'code',
    position: 8,
    content: {
      language: 'text',
      text: 'A = [[2, 1],\n     [1, 2]]\n\ndet(A - λI) = (2-λ)² - 1 = λ² - 4λ + 3 = 0\nλ = 1, 3\n\nλ=3: (A-3I)v = 0  →  v = (1, 1)',
    },
    meta: null,
  },
  {
    id: 'b10',
    type: 'divider',
    position: 9,
    content: {},
    meta: null,
  },
  {
    id: 'b11',
    type: 'paragraph',
    position: 10,
    content: {
      text: '（我加的批注：为什么这里要取行列式？因为 (A − λI)v = 0 有非零解，等价于 A − λI 把某个非零向量压成零 —— 也就是它不可逆，行列式为 0。）',
    },
    meta: null,
  },
]

export const FOCUS_PREVIEW: FocusPreviewData = {
  spaceName: '线性代数 · 期末冲刺',
  method: 'socratic（mock）',
  title: '讲义 · 特征值.md',
  blocks: BLOCKS,
  pageIndex: 2,
  pageId: 'p3',
  pages: [
    { id: 'p1', title: '讲义 · 向量与线性组合.md' },
    { id: 'p2', title: '笔记 · 向量' },
    { id: 'p3', title: '讲义 · 特征值.md' },
    { id: 'p4', title: '示意图 · 特征向量.png' },
    { id: 'p5', title: '练习 · 3 题' },
    { id: 'p6', title: '讲义 · 对角化.md' },
  ],
}

/** 可编辑的输入框个数（正文的每一块一个；列表按项算；分割线没有）。 */
export const FOCUS_PREVIEW_TEXTAREA_COUNT = 12
