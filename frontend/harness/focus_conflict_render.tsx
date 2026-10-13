/**
 * Offscreen-render harness for 聚焦模式的 **409 冲突面板** —— NOT application code.
 *
 * 为什么单独一个 harness：撞 409 是 `FocusView` 里**唯一会丢字**的路径，而它平时
 * 根本跑不到 —— 真丢字的那一刻才是这段代码第一次被跑，这是 MVP 里最不能留的赌。
 * 这里直接把真的 `ConflictPanel`（`FocusView` 也用它）渲染出来，把三句话与三个
 * 出口钉住；`.mjs` 那边还有一组反面对照（正常渲染时这块**不许出现**）。
 *
 * 面板是纯展示组件（`onShowDiff` / `onOverwrite` / `onUseServer` 都只是回调），
 * 不需要 Provider，也不需要 DOM 事件。
 */

import { ConflictPanel } from '@/features/learn-space/focus/ConflictPanel'

export function FocusConflictRenderHarness() {
  return (
    <ConflictPanel
      onShowDiff={() => undefined}
      onOverwrite={() => undefined}
      onUseServer={() => undefined}
    />
  )
}