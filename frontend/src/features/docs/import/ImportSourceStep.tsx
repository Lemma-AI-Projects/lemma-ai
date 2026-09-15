import { FolderOpen, Lock } from 'lucide-react'

import { useAppTranslation } from '@/i18n'
import { cn } from '@/lib/utils'
import { IMPORT_SOURCES } from './sources'
import type { ImportSourceKind } from './types'

export interface ImportSourceStepProps {
  value: ImportSourceKind | null
  onChange: (kind: ImportSourceKind) => void
}

/**
 * 第 1 步：选择来源。
 *
 * 品牌来源用**官方 logo**（`public/icons/{obsidian,notion}.svg`，与 bilibili/youtube
 * 同一套规范）；没有品牌方的「本地文件夹」退化为通用图标。
 * 选完不直接跳过 —— 底部「继续」才是前进，避免误点把整条流程带走。
 */
export function ImportSourceStep({ value, onChange }: ImportSourceStepProps) {
  const { t } = useAppTranslation()

  return (
    <div role="radiogroup" aria-label={t('import.sourceTitle')} className="space-y-2">
      {IMPORT_SOURCES.map((source) => {
        const isSelected = value === source.kind
        return (
          <button
            key={source.kind}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(source.kind)}
            className={cn(
              'flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors',
              'focus-visible:ring-[3px] focus-visible:ring-foreground/10 focus-visible:outline-none',
              isSelected
                ? 'border-foreground/40 bg-zinc-50'
                : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'
            )}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] border border-zinc-200 bg-white">
              {source.logoSrc ? (
                <img
                  src={source.logoSrc}
                  alt=""
                  className="size-[18px]"
                  aria-hidden
                />
              ) : (
                <FolderOpen
                  className="size-[18px] text-zinc-500"
                  strokeWidth={1.75}
                  aria-hidden
                />
              )}
            </span>

            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-medium text-zinc-900">
                {t(source.labelKey)}
              </span>
              <span className="mt-0.5 block text-xs text-zinc-500">
                {t(source.hintKey)}
              </span>
            </span>

            {source.requiresAuth && (
              <span className="flex shrink-0 items-center gap-1 rounded-full border border-zinc-200 px-2 py-0.5 text-[11px] text-zinc-500">
                <Lock className="size-3" aria-hidden />
                {t('import.sourceNotionBadge')}
              </span>
            )}

            <span
              aria-hidden
              className={cn(
                'flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors',
                isSelected ? 'border-foreground' : 'border-zinc-300'
              )}
            >
              {isSelected && (
                <span className="size-2 rounded-full bg-foreground" />
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}
