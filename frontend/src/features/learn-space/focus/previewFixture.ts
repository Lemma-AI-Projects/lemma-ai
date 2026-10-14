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

/**
 * 「这一份的笔记」—— 边注就住在这里，靠 `meta.source` 锚回上面那份讲义的某一段。
 *
 * ⚠️ **它是为了让边注轨在评审页上真的出现**。没有它，`/preview/focus` 永远看不到
 * 轨（真实页面上这份笔记来自后端），而"看不到"就等于这一批没验过。
 *
 * 锚点的形状与 `annotationOps.AnnotationSource` 一致：`position + quote + occurrence`。
 * 这里刻意造出三种情形，好一次看全：
 * 1. 普通一条（锚在第二段）；
 * 2. 同一段上**两条**（A5 的纵向堆叠）；
 * 3. 锚在一个 **list 块**上（列表文本是拼出来的，最容易漏）；
 * 4. 一条**原话已经不在这一页了**的（落到轨的最下面，见 A7 的降级）。
 */
const NOTE_BLOCKS: DocBlock[] = [
  {
    id: 'n1',
    type: 'paragraph',
    position: 0,
    content: { text: '这里说的"方向没变"是关键 —— 变的是长度，不是朝向。' },
    meta: { source: { pageId: 'p3', position: 1, quote: '方向没变', occurrence: 0 } },
  },
  {
    id: 'n2',
    type: 'paragraph',
    position: 1,
    content: { text: '把矩阵当动作、不当表格 —— 这个换法值得背下来。' },
    meta: { source: { pageId: 'p3', position: 3, quote: '特征值就是', occurrence: 0 } },
  },
  {
    id: 'n3',
    type: 'paragraph',
    position: 2,
    content: { text: '力度为负为什么是反向？画个单位圆就看出来了。' },
    meta: { source: { pageId: 'p3', position: 3, quote: '力度为正', occurrence: 0 } },
  },
  {
    id: 'n4',
    type: 'paragraph',
    position: 3,
    content: { text: '旋转矩阵是实矩阵却没有实特征值 —— 考试爱考这个反例。' },
    meta: {
      source: { pageId: 'p3', position: 4, quote: 'λ 可以是复数', occurrence: 0 },
    },
  },
  {
    id: 'n5',
    type: 'paragraph',
    position: 4,
    content: { text: '这句是我从别处抄的，原本那段已经删了。' },
    meta: { source: { pageId: 'p3', position: 9, quote: '这一段已经不在这一页了', occurrence: 0 } },
  },
]

export const FOCUS_PREVIEW: FocusPreviewData = {
  spaceName: '线性代数 · 期末冲刺',
  // 空间名旁边那一行方位。真实页面上它由 `/projects/{id}/goals/active` 算出来，
  // 这里写死一条，好让评审页与离屏断言看到同一个东西。
  goalLine: '考到 90 分 · 还有 21 天',
  // method 状态栏的四格。真实页面上由 `/api/v1/methods/status` 算出来
  // （socratic × `exam_performance` 那一行），这里写死同样的内容 —— 评审时看到的
  // 就是真有目标时顶栏的样子。**注意里面没有 method 的名字**：界面上只出现动词。
  methodStatus: {
    systemMove: '先请你自己走一遍',
    learnerMove: '先别翻资料，写给我',
    completion: '你自己做对两道，就算过',
    goalRelation: '这一轮练的是会考的东西 —— 冲着你的目标去。',
  },
  title: '讲义 · 特征值.md',
  blocks: BLOCKS,
  notes: NOTE_BLOCKS,
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

/**
 * 两份**非文本资料**的 fixture —— M1 的演练对象（上传件没有 `blocks`）。
 *
 * 为什么另起两份、而不是往上面那份里塞：上面那份正跑着一组"正文可编辑"的断言
 * （12 个 textarea、三条大纲、六份资料…），塞一份 PDF 进去会把那组断言搅浑 ——
 * 两边都要改，最后谁都说不清是被测的东西变了还是夹具变了。
 *
 * 各带 3 份资料，好让页码胶囊（漫游位置）也有东西可显示；当前那一份的
 * `originalName` / `mime` 就是"它是文件"的全部判据。
 */
function materialPreview(page: {
  id: string
  title: string
  originalName: string
  mime: string
}): FocusPreviewData {
  return {
    spaceName: FOCUS_PREVIEW.spaceName,
    goalLine: FOCUS_PREVIEW.goalLine,
    methodStatus: FOCUS_PREVIEW.methodStatus,
    title: page.title,
    // 上传件后端没有 blocks —— 这里也空着，和真实数据同形。
    blocks: [],
    pageIndex: 1,
    pageId: page.id,
    pages: [
      { id: 'p1', title: '讲义 · 向量与线性组合.md' },
      {
        id: page.id,
        title: page.title,
        originalName: page.originalName,
        mime: page.mime,
      },
      { id: 'p2', title: '笔记 · 向量' },
    ],
  }
}

export const FOCUS_PREVIEW_PDF = materialPreview({
  id: 'p-pdf',
  title: '讲义 · 线性代数第一讲.pdf',
  originalName: '线性代数第一讲.pdf',
  mime: 'application/pdf',
})

export const FOCUS_PREVIEW_IMAGE = materialPreview({
  id: 'p-img',
  title: '示意图 · 特征向量.png',
  originalName: '特征向量示意图.png',
  mime: 'image/png',
})

/** 可编辑的输入框个数（正文的每一块一个；列表按项算；分割线没有）。 */
export const FOCUS_PREVIEW_TEXTAREA_COUNT = 12
