import { Check } from 'lucide-react'

import { useAppTranslation } from '@/i18n'
import { cn } from '@/lib/utils'
import type { ImportSpace } from './types'

export interface ImportDestinationStepProps {
  spaces: ImportSpace[]
  value: string | null
  onChange: (id: string) => void
}

/**
 * 第 3 步：落点。
 *
 * **单选，且只能是 learn space** —— 导入产物是 `pages(kind=imported)`，
 * 必须挂在某个空间下，跨空间混入在数据模型上就不成立。
 * 从空间内进入时默认已经选中当前空间（少一步操作），从 `/knowledge` 进入则必选。
 */
export function ImportDestinationStep({
  spaces,
  value,
  onChange,
}: ImportDestinationStepProps) {
  const { t } = useAppTranslation()

  return (
    <div className="flex flex-col gap-2">
      <div role="radiogroup" aria-label={t('import.destinationTitle')} className="space-y-2">
        {spaces.map((space) => {
          const isSelected = value === space.id
          return (
            <button
              key={space.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChange(space.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors',
                'focus-visible:ring-[3px] focus-visible:ring-foreground/10 focus-visible:outline-none',
                isSelected
                  ? 'border-foreground/40 bg-zinc-50'
                  : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'
              )}
            >
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-zinc-900">
                {space.name}
              </span>
              <span
                aria-hidden
                className={cn(
                  'flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors',
                  isSelected ? 'border-foreground bg-foreground' : 'border-zinc-300'
                )}
              >
                {isSelected && <Check className="size-2.5 text-background" strokeWidth={4} />}
              </span>
            </button>
          )
        })}
      </div>

      <p className="text-xs leading-5 text-zinc-500">
        {t('import.destinationHint')}
      </p>
    </div>
  )
}
