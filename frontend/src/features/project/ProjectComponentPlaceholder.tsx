import type { LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/**
 * Learn space 组件占位视图（诚实占位：组件形态已就位，内容随对应阶段接入）
 * - Board：E1 接入（画布渲染）
 * - Courses：课程与 learn space 的绑定接入后填充
 */
export function ProjectComponentPlaceholder({
  icon: Icon,
  titleKey,
  descKey,
}: {
  icon: LucideIcon
  titleKey: string
  descKey: string
}) {
  const { t } = useTranslation()

  return (
    <div className="mt-6 flex flex-col items-center gap-3 rounded-xl border border-dashed border-zinc-300 bg-transparent px-6 py-14 text-center">
      <Icon className="size-8 text-zinc-300" strokeWidth={1.5} />
      <p className="text-sm font-medium text-zinc-500">{t(titleKey)}</p>
      <p className="max-w-sm text-xs leading-relaxed text-zinc-400">
        {t(descKey)}
      </p>
    </div>
  )
}
