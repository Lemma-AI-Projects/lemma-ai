import type { Candidate, ConnectionRec, Discovery, ParentEvent } from '../types'

/**
 * 手写的那一部分：父事件、候选、连接、首页发现。
 *
 * 为什么手写：这四样在数据集里**没有对应的行**。
 * - 父事件：数据集里只有 `focus`（一段视角），没有一个「这一段过程」的对象；
 * - 候选：data-coverage 已经写明「今天没有供给源」，所以只能给三个代表性样本；
 * - 连接：是结构查询的结果，还没有查询；
 * - 发现：是呈现形态，不是数据。
 *
 * ⚠️ 所以这四个数组是**原型道具**，不是数据集的一部分。凡是它们说的事，
 * 都能在 `dataset.generated.ts` 里找到依据（每条都写了 `basisIds`）。
 */

export const PARENT_EVENTS: ParentEvent[] = [
  {
    id: 'pe-01',
    title: '把一条神经渲染管线自己搭出来',
    kind: 'research',
    from: '2026-01-05',
    to: '2026-05-26',
    origin: 'system',
    why: '同一个仓库、同一条线索、八个节点，跨四个月。系统按「同一项目 + 相隔不超过 10 天」并成一段。',
    objectIds: ['prj-01', 'foc-01', 'mat-12'],
  },
  {
    id: 'pe-02',
    title: '理解人的意识',
    kind: 'reflection',
    from: '2026-03-27',
    to: '2026-05-24',
    origin: 'user',
    why: '他自己划的一段。三月读完 Nagel 之后开的头，五月读完 Dennett 之后停在这里，没有正式结束。',
    objectIds: ['lx-04', 'foc-03', 'mat-16'],
  },
  {
    id: 'pe-03',
    title: '答辩前那五天',
    kind: 'creation',
    from: '2026-06-04',
    to: '2026-06-08',
    origin: 'system',
    why: '五天三十条记录，二十五条没有产出任何东西。系统按时间密度并成一段——但这一段不是他主动划的，可以拆。',
    objectIds: ['prj-02', 'out-04', 'foc-07'],
  },
  {
    id: 'pe-04',
    title: '把 GEB 读完',
    kind: 'reflection',
    from: '2026-07-20',
    to: '2026-08-20',
    origin: 'user',
    why: '没有目标、没有计划，一天二十页。停在第 11 章，到今天还是 38%。',
    objectIds: ['lx-03', 'mat-01'],
  },
  {
    id: 'pe-05',
    title: '因果：从一本书到一个案例',
    kind: 'research',
    from: '2026-08-12',
    to: '2026-10-05',
    origin: 'system',
    why: '八条活动、三份材料，从来没被组织成一段学习经历。系统并出来的，理由是「同一批材料反复出现」。',
    objectIds: ['foc-05', 'mat-05', 'mat-28'],
  },
]

/**
 * 三个候选，三种状态。它们要证明的是一件事：
 * **不是每一条都要摆成「待你审批」。**
 */
export const CANDIDATES: Candidate[] = [
  {
    id: 'cand-01',
    state: 'accumulating',
    statement: '「表征」在两个领域之间的那层意思，可能还没走完',
    signalIds: ['mat-19', 'act-122', 'prj-07'],
    signalNote: '三条记录跨七个月指向同一个词，但没有一条能单独成立。',
    why: '系统只攒着，不建议你现在处理，也不打算把它推到首页。想看得自己点。',
    objectIds: ['foc-02', 'mat-19', 'prj-07'],
    firstSeen: '2026-10-18',
  },
  {
    id: 'cand-02',
    state: 'emerging',
    statement: '外部截止日期之前，你会先砍掉验证性的工作',
    signalIds: ['ev-22', 'act-112', 'act-125'],
    signalNote: '六月那五天里三条记录是同一个模式：计划三组只跑一组、脚本重构到一半、摘要改了七版。',
    why: '但十月你自己定的截止日反而没砍，还补了自测。所以它可能只在「别人定的截止日」下成立。',
    objectIds: ['prj-02', 'prj-07'],
    firstSeen: '2026-06-08',
  },
  {
    id: 'cand-03',
    state: 'resolved',
    statement: '数学基础是一个独立兴趣',
    signalIds: ['act-001', 'act-040', 'int-06'],
    signalNote: '一月到三月有五次线性代数的动作，系统当时判成了一条兴趣。',
    why: '四月二十八日到期。没有确认，也没有反驳——按「沉默不算确认」关掉。不是判它错，是判它过期。',
    objectIds: ['int-06', 'foc-04'],
    firstSeen: '2026-02-15',
    resolution: { kind: 'expired', at: '2026-04-28', note: '过期，未确认' },
  },
]

/**
 * 四处连接。全部是**结构查询**：共同的材料、共同的问题、同一段时间的两条线、以及互相矛盾的两句话。
 * 没有一条是模型写的。
 */
export const CONNECTIONS: ConnectionRec[] = [
  {
    id: 'conn-01',
    a: 'mat-19',
    b: 'prj-07',
    kind: 'shared_material',
    why: '你读 Bengio 那篇的时候在找「表征」怎么定义；十月你写 repr-view，做的其实是把表征画出来。隔了七个月，中间没有一处把这两件事连起来。',
    basisIds: ['act-122', 'ins-01'],
    epistemic: 'interpretation',
  },
  {
    id: 'conn-02',
    a: 'foc-07',
    b: 'foc-02',
    kind: 'bridge',
    why: '六月那五天里，二十六条活动挂在毕设上，四条挂在「表征」上——同一段时间，两条线同时在动，但一条在明处。',
    basisIds: ['act-121', 'act-122', 'act-128'],
    epistemic: 'observed',
  },
  {
    id: 'conn-03',
    a: 'act-122',
    b: 'ins-13',
    kind: 'contradiction',
    why: '你六月写过「我的任务和 NeRF 不是一类问题」，十月的系统判断却说这四个月你对这条线零投入。这两句话不能同时为真。',
    basisIds: ['ev-17', 'ev-24'],
    epistemic: 'observed',
  },
  {
    id: 'conn-04',
    a: 'prj-01',
    b: 'prj-06',
    kind: 'shared_question',
    why: '一个在搭管线，一个在写文章，问的却是同一件事：机器内部的「表示」算不算理解。',
    basisIds: ['ins-01', 'ins-08'],
    epistemic: 'interpretation',
  },
]

/** 首页三块。三种发现对应三个方向，各自落在不同视角。 */
export const DISCOVERIES: Discovery[] = [
  {
    id: 'disc-01',
    kind: 'connection',
    title: '七个月前读的那篇论文，和十月那个小工具，问的是同一件事',
    why: '你读 Bengio 的时候在找「表征」的定义；写 repr-view 的时候在把它画出来。中间隔了七个月，没有人提醒你这两件事是连着的。',
    epistemic: 'interpretation',
    refIds: ['mat-19', 'prj-07'],
    perspective: 'explore',
  },
  {
    id: 'disc-02',
    kind: 'pattern',
    title: '你会砍掉验证，但只在别人定的截止日之前',
    why: '六月三组消融只跑了一组；十月你自己定的截止日反而没砍，还补了自测。这条判断十月二十九日被收窄过一次，旧版本还留着。',
    epistemic: 'interpretation',
    refIds: ['ins-12', 'ev-22', 'ev-24'],
    perspective: 'insights',
  },
  {
    id: 'disc-03',
    kind: 'possibility',
    title: '「表征」这条线你停在五月，但它还在你自己的笔记里长',
    why: '这可能只是一次没做完的探索，也可能是一个你还没承认的方向。系统不知道，只能把两边摆给你看。',
    epistemic: 'hypothesis',
    refIds: ['foc-02', 'prj-01', 'prj-07'],
    perspective: 'timeline',
  },
]
