import { ArrowLeft } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { usePageQuery, usePageBlocksQuery, useSavePageBlocksMutation } from '@/features/docs/docApi'
import { DocEditor } from '@/features/docs/DocEditor'
import { useAppTranslation } from '@/i18n'
import type { BlockIn } from './types'

export function DocEditorView() {
  const { id, pageId } = useParams<{ id: string; pageId: string }>()
  const navigate = useNavigate()
  const { t } = useAppTranslation()

  const pageQuery = usePageQuery(pageId)
  const blocksQuery = usePageBlocksQuery(pageId)
  const saveBlocks = useSavePageBlocksMutation()

  const [conflict, setConflict] = useState(false)

  const handleSave = useCallback(
    (blocks: BlockIn[]) => {
      if (!pageQuery.data || !pageId) return
      setConflict(false)
      saveBlocks.mutate(
        {
          pageId,
          blocks,
          updatedAt: pageQuery.data.updatedAt,
        },
        {
          onError: (error: unknown) => {
            const axiosError = error as { response?: { status?: number } }
            if (axiosError?.response?.status === 409) {
              setConflict(true)
            }
          },
          onSuccess: (data) => {
            pageQuery.data.updatedAt = data.updatedAt
          },
        }
      )
    },
    [pageId, pageQuery.data, saveBlocks]
  )

  const handleReload = useCallback(() => {
    setConflict(false)
    pageQuery.refetch()
    blocksQuery.refetch()
  }, [pageQuery, blocksQuery])

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
        </div>

        {conflict && (
          <div className="flex items-center gap-2 bg-amber-50 px-4 py-2 text-sm text-amber-700">
            <span>This page was modified by another session.</span>
            <button
              type="button"
              onClick={handleReload}
              className="font-medium underline hover:text-amber-900"
            >
              Reload
            </button>
          </div>
        )}

        {blocksQuery.isPending ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="space-y-3">
              <div className="h-4 w-48 animate-pulse rounded bg-zinc-200" />
              <div className="h-4 w-36 animate-pulse rounded bg-zinc-200" />
              <div className="h-4 w-44 animate-pulse rounded bg-zinc-200" />
            </div>
          </div>
        ) : blocksQuery.isError ? (
          <div className="flex flex-1 items-center justify-center text-sm text-zinc-400">
            <div className="text-center">
              <p>Document API unavailable.</p>
              <p className="mt-1 text-xs text-zinc-300">
                Enable DOC_FULL_API_ENABLED in backend/.env
              </p>
            </div>
          </div>
        ) : (
          <DocEditor
            initialBlocks={blocksQuery.data?.blocks ?? []}
            onSave={handleSave}
          />
        )}
      </div>
    </div>
  )
}
