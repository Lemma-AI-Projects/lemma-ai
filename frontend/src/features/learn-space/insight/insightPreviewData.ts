/**
 * 启示（Insight）预览用的**假数据**。
 *
 * ⚠️ 这里的一切都是**编的**，不是任何真实用户记录。页面上有一行"预览数据"标着这件事。
 * ⚠️ 与真实产品的关系：这份数据刻意保持**和真后端接口同一种形状**（一条启示 + 它引用的
 * 证据行 + 同一空间的事件），这样以后接真接口时只换数据源，不用重写界面。
 *
 * 数据之间必须自洽 —— 启示说"最近三次都对但都用了提示，上一次不看提示是 9 月 26 日"，
 * 下面的证据与轨迹就必须正好能对上这三条 + 那一条。
 */

export interface EvidenceRow {
  id: string
  at: string
  /** 那天做了什么。一句话，不带判断。 */
  what: string
  verdict: 'correct' | 'incorrect'
  /** 用了提示。这是这条启示的全部来源 —— 不需要模型猜。 */
  hinted: boolean
  /** 点开才看见的那一句（当时的具体情形）。 */
  detail: string
}

export type View = 'space' | 'focus' | 'trajectory'

export type UserAction = 'accepted' | 'questioned' | 'dismissed' | null

export const SPACE = {
  name: '线性代数 · 期末冲刺',
  goal: '两周内把特征值这一章过一遍',
  since: '2026-09-03',
  materials: [
    { id: 'm1', title: '第三章 · 特征值讲义', meta: '导入的 PDF · 18 页', active: true },
    { id: 'm2', title: '特征值 · 笔记', meta: '我写的 · 4 条边注' },
    { id: 'm3', title: '往年题 · 线性代数', meta: '导入的 PDF · 9 页' },
  ],
  recent: [
    { at: '10-15', what: '做了一道求特征值的题，做对了' },
    { at: '10-09', what: '做了一道求特征值的题，做对了' },
    { at: '10-05', what: '做了一道求特征值的题，做对了' },
  ],
}

export const INSIGHT = {
  id: 'insight-2026-10-17-01',
  /** 谈的是哪个知识点。界面上它就是这条启示的"名字"。 */
  about: '特征值',
  createdAt: '2026-10-17',
  /**
   * 说话的口径：**陈述 + 一个开放的问题**，不给结论、不给分数。
   * 这三句只能是规则选出来的那几条记录能支撑的，多一个字都不行。
   */
  claim: [
    '「特征值」这三次你都做对了，但三次都用了提示。',
    '上一次不看提示做对，是 9 月 26 日。',
  ],
  ask: '要不要现在来一道，我不给提示？',
  /** 确定性只有两档 —— 不造概率。 */
  certainty: 'medium' as 'low' | 'medium',
  evidence: [
    {
      id: 'e-1015',
      at: '2026-10-15',
      what: '做了一道求特征值的题',
      verdict: 'correct',
      hinted: true,
      detail: '看了提示：先把 |A − λI| 展开成二次式。',
    },
    {
      id: 'e-1009',
      at: '2026-10-09',
      what: '做了一道求特征值的题',
      verdict: 'correct',
      hinted: true,
      detail: '看了提示：先算迹和行列式再猜两个根。',
    },
    {
      id: 'e-1005',
      at: '2026-10-05',
      what: '做了一道求特征值的题',
      verdict: 'correct',
      hinted: true,
      detail: '看了提示：确认「方向不变」指的是 Av 和 v 同向。',
    },
    {
      id: 'e-0926',
      at: '2026-09-26',
      what: '做了一道求特征值的题',
      verdict: 'correct',
      hinted: false,
      detail: '全程没有看提示。这是最近一次独立做对。',
    },
  ] as EvidenceRow[],
  /** 同一空间的事件，按时间。`cited` 的几条就是上面那 4 条证据在时间上的位置。 */
  timeline: [
    { id: 't1', at: '2026-09-03', kind: '资料', title: '放进一份资料「第三章 · 特征值讲义」' },
    { id: 't2', at: '2026-09-12', kind: '边注', title: '写下一条边注：方向不变才是关键，长度变了不算' },
    {
      id: 't3',
      at: '2026-09-26',
      kind: '证据',
      title: '做对一道题，全程没有看提示',
      cited: true,
      anchor: true,
    },
    { id: 't4', at: '2026-10-02', kind: '对话', title: '聊了一次「特征值到底是什么」' },
    { id: 't5', at: '2026-10-05', kind: '证据', title: '做对一道题，用了提示', cited: true },
    { id: 't6', at: '2026-10-09', kind: '证据', title: '做对一道题，用了提示', cited: true },
    { id: 't7', at: '2026-10-15', kind: '证据', title: '做对一道题，用了提示', cited: true },
    { id: 't8', at: '2026-10-16', kind: '决定', title: '系统决定：REVIEW（下一次做特征值的题）' },
  ] as {
    id: string
    at: string
    kind: string
    title: string
    cited?: boolean
    anchor?: boolean
  }[],
}

export const MATERIAL = {
  title: '第三章 · 特征值讲义',
  crumb: '第三章',
  paragraphs: [
    '一个矩阵作用在一个向量上，通常会把它的方向拧开一点。特征向量是那些**没有被拧开**的方向：Av 和 v 落在同一条直线上，只是长度变了。',
    '那个伸缩的倍数就是特征值。所以 λ 描述的不是"这个矩阵有多大"，而是"在这个方向上，它把长度放大了多少"。',
    '手算的时候我们会去解 |A − λI| = 0。那只是把定义翻译成方程，它是手段，不是含义。',
  ],
  pull: '判断一个 λ 对不对，最快的办法是回头问一句：把 v 代进去，它还是同一个方向吗？',
  question: 'A = [[2, 1], [0, 3]]，求它的两个特征值。',
}

/** 预览页的免责声明 —— 必须看得见，否则假数据会被当成真记录。 */
export const PREVIEW_NOTE = '预览数据 · 不是真实学习记录'
