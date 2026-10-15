import type { TrajectoryResponse } from './trajectoryApi'

/**
 * 轨迹（**真数据版**）的 mock —— 只给评审用（`/preview/trajectory-events`）。
 *
 * ⚠️ 这份 fixture 的形状**逐字段对齐后端** `GET /projects/{id}/trajectory` 的返回
 * （`schemas/trajectory.py`）。它不是"编得好看"的那种 mock：里面的九类事件
 * 和后端真的会读出来的九类**一一对应**，包括两条容易被抹平的：
 * 一条**时间是近似的**（边注：块没有时间戳），一条**归不到空间**（通知没有 `projectId`）。
 *
 * ⚠️ 与隔壁 `mockData.ts` 的区别：那份是**旧的假数据原型**的形状
 * （`TrajectorySpace`，带四问、period、milestone），对应 `/preview/trajectory`。
 * 这一份对应真数据版（`TrajectoryResponse`）。**两份不要混用。**
 */

export const TRAJECTORY_EVENTS_FIXTURE: TrajectoryResponse = {
  spaceId: 'p-trajectory-fixture',
  span: { fromAt: '2026-09-03T09:12:00+08:00', toAt: '2026-10-14T21:40:00+08:00' },
  events: [
    {
      id: 'pages:1',
      kind: 'material',
      at: '2026-09-03T09:12:00+08:00',
      atAccuracy: 'exact',
      title: '放进一份资料「第三章 · 特征值讲义」',
      source: { table: 'pages', id: '1' },
      href: '/preview/focus',
    },
    {
      id: 'space_goals:1',
      kind: 'goal',
      at: '2026-09-03T09:20:00+08:00',
      atAccuracy: 'exact',
      title: '设了一个目标：把特征值这一章学明白',
      source: { table: 'space_goals', id: '1' },
      href: '/preview/goal',
    },
    {
      id: 'ai_conversations:1',
      kind: 'conversation',
      at: '2026-09-03T09:41:00+08:00',
      atAccuracy: 'exact',
      title: '聊了一次：「特征值到底是什么」',
      source: { table: 'ai_conversations', id: '1' },
      href: '/preview/focus',
    },
    {
      id: 'blocks:1',
      kind: 'annotation',
      at: '2026-09-12T20:03:00+08:00',
      // ⚠️ 块没有时间戳 ⇒ 这是它所在页的更新时间。**必须标出来。**
      atAccuracy: 'approx',
      title: '写下一条边注：方向不变才是关键，长度变了不算',
      source: { table: 'blocks', id: '1' },
      href: '/preview/focus',
    },
    {
      id: 'board_context_bundles:1',
      kind: 'bundle',
      at: '2026-09-21T14:26:00+08:00',
      atAccuracy: 'exact',
      title: '圈了一批材料「特征值定义那几块」（3 块）',
      source: { table: 'board_context_bundles', id: '1' },
      href: '/preview/focus',
    },
    {
      id: 'knowledge_evidence:1',
      kind: 'evidence',
      at: '2026-09-26T22:15:00+08:00',
      atAccuracy: 'exact',
      title: '记下一条证据：correct（独立做对）',
      source: { table: 'knowledge_evidence', id: '1' },
      href: null,
    },
    {
      id: 'space_memories:1',
      kind: 'memory',
      at: '2026-09-27T08:02:00+08:00',
      atAccuracy: 'exact',
      title: '记住了一件事：他反复卡在「方向不变」这个直觉上。',
      source: { table: 'space_memories', id: '1' },
      href: null,
    },
    {
      id: 'coordinator_decisions:1',
      kind: 'decision',
      at: '2026-10-02T07:30:00+08:00',
      atAccuracy: 'exact',
      title: '系统做了一个决定：REVIEW',
      source: { table: 'coordinator_decisions', id: '1' },
      href: null,
    },
    {
      id: 'notifications:1',
      kind: 'notification',
      at: '2026-10-14T21:40:00+08:00',
      atAccuracy: 'exact',
      title: '提醒：明天回来看看特征值',
      source: { table: 'notifications', id: '1' },
      href: null,
    },
  ],
  // ⚠️ 通知表没有空间字段：这两条取不到 `projectId`，所以**单独数出来**，
  // 而不是塞进上面那条时间线。
  unattributed: { notifications_without_space: 2 },
  truncated: false,
}

/** 空空间 —— 空态是它的一等状态，不是"还没加载"。 */
export const TRAJECTORY_EVENTS_EMPTY: TrajectoryResponse = {
  spaceId: 'p-trajectory-empty',
  span: { fromAt: null, toAt: null },
  events: [],
  unattributed: {},
  truncated: false,
}
