import { ArrowLeft } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'

import {
  usePageQuery,
} from '@/features/docs/docApi'
import { useAppTranslation } from '@/i18n'

/**
 * 文档编辑器占位页（P0.4 骨架）。
 *
 * P0.3 只落地「从 shelter 抽屉可导航到这里」的骨头：读板块标题、给一个返回
 * 工作台的入口。块级编辑（TipTap + 保存流）在 P0.4 实装，门控 doc_editor_enabled。
 */
export function DocEditorView() {
  const { id, pageId } = useParams<{ id: string; pageId: string }>()
  const navigate = useNavigate()
  const { t } = useAppTranslation()
  const pageQuery = usePageQuery(pageId)

  return (
    <div className="h-screen w-screen bg-zinc-50 text-zinc-950">
      <div className="flex h-full flex-col">
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-zinc-200/80 bg-white px-4">
          <button
            type="button"
            onClick={() => navigate(`/learn-spaces/${id}`)}
            aria-label={t('workspace.shelterBack')}
            title={t('workspace.shelterBack')}
            className="flex size-8 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-zinc-900/10"
          >
            <ArrowLeft className="size-4" />
          </button>
          <h1 className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-900">
            {pageQuery.data?.title ?? '…'}
          </h1>
          <span className="text-xs text-zinc-400">
            {t('workspace.shelterEditorPlaceholder')}
          </span>
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center">
          <p className="text-sm text-zinc-400">
            {t('workspace.shelterEditorPlaceholder')}
          </p>
        </div>
      </div>
    </div>
  )
}