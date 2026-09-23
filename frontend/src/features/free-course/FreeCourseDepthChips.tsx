import { useAppTranslation } from '@/i18n'
import { cn } from '@/lib/utils'

/**
 * 问卷四个维度的键。与后端 `_QUESTION_SET` 一致。
 * 刻意**不导出**：这个文件只能导出组件，否则 react-refresh 的 fast refresh 会失效
 * （`react-refresh/only-export-components`）。目前也没有第二个消费方。
 */
const TUNING_DIMS = ['course_volume', 'depth', 'focus', 'pace'] as const

export interface FreeCourseDepthChipsProps {
  /**
   * 维度 → 取值。键是 `course_volume|depth|focus|pace`，值与后端枚举一致。
   *
   * 两种来源共用这一个形状：
   * - 蓝图页给**已落库**的 `course.tuning`（这课到底是按什么生成的）
   * - 暂停点给**用户当前的选择**（还没提交时的实时预览）
   */
  dims: Record<string, unknown> | null | undefined
  /** 芯片前的引导语，例如「按直觉理解 · 标准体量生成」。不给就不渲染。 */
  label?: string
  className?: string
}

/**
 * 「体量 / 深度 / 侧重 / 节奏」四枚芯片。
 *
 * 参考稿的屏 4 有这一排，但一直没做。补它的理由不是"对齐设计稿"，而是：
 * 这四项是**用户自己选的**，选完就再也看不到 —— 用户会忘了自己选过什么，
 * 也不知道现在看到的课程是按什么参数生成的。
 *
 * 无值（或只有 skip）时**返回 null**，不渲染空壳：宁可什么都不显示，
 * 也不要一排"未选择"占位。
 */
export function FreeCourseDepthChips({
  dims,
  label,
  className,
}: FreeCourseDepthChipsProps) {
  const { t } = useAppTranslation()

  if (!dims) return null

  const chips = TUNING_DIMS.map((dim) => {
    const value = dims[dim]
    if (typeof value !== 'string' || value.length === 0) return null
    return t(
      `freeCourse.tuning.optionLabel.${dim}.${value}` as Parameters<
        ReturnType<typeof useAppTranslation>['t']
      >[0],
      { defaultValue: value }
    )
  }).filter((chip): chip is string => chip !== null)

  if (chips.length === 0) return null

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {label && (
        <span className="text-[12px] text-zinc-400">{label}</span>
      )}
      {chips.map((chip) => (
        <span
          key={chip}
          className="rounded-full border border-zinc-200 px-2 py-[1px] text-[11.5px] leading-5 text-zinc-500 dark:border-zinc-700 dark:text-zinc-400"
        >
          {chip}
        </span>
      ))}
    </div>
  )
}
