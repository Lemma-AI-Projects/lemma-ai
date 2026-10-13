/**
 * 聚焦模式里「资料次序」的冻结规则 —— **纯函数，零 React、零 I/O**。
 *
 * 为什么需要它：`/api/v1/pages` 是按 `updated_at desc` 排的（`doc_service.py:83`）。
 * 你在聚焦里读第 3 份、随手写一句 ⇒ 自动保存 ⇒ `updated_at` 变了 ⇒ 列表重排 ⇒
 * 脚下这一份可能变成第 1 份，"下一份"于是跳到别处。这不是"体验稍差"，是**方位感
 * 丢了** —— 所以进入聚焦时把当前次序抄下来，一直用到刷新页面为止。
 *
 * 拍板口径（v1-plan §6 第 1 条）：
 *
 * 1. **进聚焦时冻结**当前顺序，刷新页面才重排；
 * 2. 冻结之后**新建**的资料追加到末尾（否则刚建的笔记在漫游里找不到）；
 * 3. **删除**掉的资料从冻结序列里自动跳过（它不在新列表里，自然不会出现）。
 *
 * 冻结序列记的是**次序**（一串 id），不是快照。所以：列表里新增的 id 天然排在
 * 末尾；列表里消失的 id 因为找不到对应项而不占位。
 */

export interface OrderablePage {
  id: string
}

/**
 * 按冻结次序重排资料。
 *
 * @param pages    服务端刚回来的那一份（次序可能已经因为保存而变了）
 * @param frozenIds 进聚焦时抄下来的 id 次序；`null` = **还没冻结**（首次渲染），
 *                  此时原样返回 —— 不排序本身就是"我还没抄"的诚实表达。
 *
 * 排序规则：在 `frozenIds` 里有名次的按名次排；没有名次的（新新建）按它们在
 * `pages` 里的相对顺序接在末尾。两者都不改 `pages` 里的对象本身。
 */
export function applyFrozenOrder<T extends OrderablePage>(
  pages: T[],
  frozenIds: readonly string[] | null
): T[] {
  if (!frozenIds) return pages

  const rank = new Map<string, number>()
  frozenIds.forEach((id, index) => {
    // 第一个出现的名次为准（重复 id 不该发生，真发生了也不该把后来的当更早）。
    if (!rank.has(id)) rank.set(id, index)
  })

  return pages
    .map((page, index) => ({ page, index }))
    .sort((a, b) => {
      const ra = rank.get(a.page.id)
      const rb = rank.get(b.page.id)
      // 两个都不在冻结序列里：保持它们在服务端列表里的相对次序。
      if (ra === undefined && rb === undefined) return a.index - b.index
      // 冻结过的排在没冻结的（新建）前面。
      if (ra === undefined) return 1
      if (rb === undefined) return -1
      return ra - rb
    })
    .map((entry) => entry.page)
}