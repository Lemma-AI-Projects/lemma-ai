/**
 * Mala chips 的纯规则 —— 与组件分开，因为 **它们要被单测钉住**，而组件不能
 * （本仓库没有 jsdom，见 `MalaChips.test.tsx` 的说明）。
 *
 * 拆成独立文件的另一个理由：`react-refresh/only-export-components` 不允许一个
 * 文件既导出组件又导出别的东西 —— 那条规则在这里是对的，混在一起会让 chips
 * 的重加载掉整份规则。
 */

export interface MalaBundleChip {
  id: string
  /** 这一包里有多少块材料。 */
  itemCount: number
  /** 圈选时给的名字；没给就是 null。 */
  label: string | null
  /**
   * 这批材料里第一块的 key —— 「回到出处」用它。
   *
   * ⚠️ 为什么存 key 而不是存位置：位置是**创建那一刻**的快照，而用户接下来可能
   * 编辑、挪动、甚至删掉那块。key 至少能在块还在的时候精确找到它；位置只能
   * 指向"曾经在那儿"。所以主路径是 key，位置（`boundingBox`）只是兜底。
   */
  firstShapeId: string | null
}

/** 一次最多露几个 chip。再多就收成 `+N 组` —— 收起来的那些仍可删（见展开）。 */
export const VISIBLE_CHIPS = 4

/**
 * 露哪些、收多少。**纯函数**：窄面板放不下一排 chip，而"撑破布局"和"看不见后面
 * 那几个"是两种坏法，这个函数负责在后两者之间选一个，并且让测试能钉住选的是哪个。
 */
export function visibleChips(chips: readonly MalaBundleChip[]): {
  shown: MalaBundleChip[]
  overflow: number
} {
  return {
    shown: chips.slice(0, VISIBLE_CHIPS),
    overflow: Math.max(0, chips.length - VISIBLE_CHIPS),
  }
}

/** 总计多少块 —— 用户问"我到底带了多少东西"时唯一有用的数字。 */
export function totalItems(chips: readonly MalaBundleChip[]): number {
  return chips.reduce((sum, chip) => sum + chip.itemCount, 0)
}
