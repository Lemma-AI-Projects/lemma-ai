import type { ReactNode } from 'react'
import { CircleCheck } from 'lucide-react'

import { useAppTranslation } from '@/i18n'
import { findSource } from './sources'
import type { ImportSelectionCount, ImportSourceKind, ImportSpace } from './types'

export interface ImportResultStepProps {
  source: ImportSourceKind
  counts: ImportSelectionCount
  destination: ImportSpace
}

/**
 * 第 4 步：结果。
 *
 * 「已完成」的说法交给事实，规则交给文案：**数量与会话都是用户刚选出来的真实值**
 * （不是模型估的），而「内部链接会指向同空间同名板块」是一条**转换规则**，
 * 所以写成将来时而不是「已解析完毕」—— 除非后端真的报回了链接数。
 */
export function ImportResultStep({
  source,
  counts,
  destination,
}: ImportResultStepProps) {
  const { t } = useAppTranslation()
  const sourceOption = findSource(source)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-2 py-2 text-center">
        <span className="flex size-10 items-center justify-center rounded-full bg-foreground text-background">
          <CircleCheck className="size-5" aria-hidden />
        </span>
        <p className="text-[13px] font-medium text-zinc-900">
          {t('import.resultTitle')}
        </p>
      </div>

      <div className="rounded-xl border border-zinc-200 p-3">
        <Row label={t('import.resultSource')}>
          <span className="flex items-center gap-1.5">
            {sourceOption.logoSrc ? (
              <img src={sourceOption.logoSrc} alt="" className="size-4" aria-hidden />
            ) : null}
            {t(sourceOption.labelKey)}
          </span>
        </Row>
        <Row label={t('import.resultContent')}>
          {t('import.contentSelected', {
            files: counts.files,
            folders: counts.folders,
          })}
        </Row>
        <Row label={t('import.resultDestination')}>{destination.name}</Row>
      </div>

      <p className="text-xs leading-5 text-zinc-500">{t('import.resultNote')}</p>
    </div>
  )
}

function Row({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <span className="shrink-0 text-xs text-zinc-400">{label}</span>
      <span className="min-w-0 truncate text-[13px] text-zinc-800">{children}</span>
    </div>
  )
}
