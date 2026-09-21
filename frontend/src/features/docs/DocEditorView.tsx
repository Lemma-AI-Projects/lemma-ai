import { useCallback } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'

import { usePageQuery } from '@/features/docs/docApi'

/**
 * 一块板（资料层）的查看页。
 *
 * **本页目前只是落点，不是编辑器**：ShelterDrawer 点进来必须有个真页面，
 * 否则一个能点却 404 的入口比没有入口更糟。块编辑器（TipTap）是独立的一步，
 * 尚未实装 —— 所以这里如实说「还没做」，而不是给一个假的可编辑区域。
 *
 * 它同时承担一个诊断作用：后端 `DOC_FULL_API_ENABLED=false` 时，
 * 这里会明确显示「资料层未启用」，而不是一个看不出原因的空白。
 */
export function DocEditorView() {
  const { id, pageId } = useParams<{ id: string; pageId: string }>()
  const navigate = useNavigate()
  const pageQuery = usePageQuery(pageId)

  const handleBack = useCallback(() => {
    navigate(`/learn-spaces/${id}`)
  }, [id, navigate])

  return (
    <div className="h-screen w-screen bg-zinc-100 p-2 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="flex h-full w-full flex-col gap-4 overflow-hidden rounded-2xl bg-white p-6 dark:bg-background">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            aria-label="返回工作台"
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="truncate text-base font-medium">
            {pageQuery.data?.title ?? (pageQuery.isPending ? '读取中…' : '板块')}
          </h1>
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center">
          {pageQuery.isError ? (
            <div className="max-w-md text-center">
              <p className="text-sm text-zinc-500">读不到这一块板</p>
              <p className="mt-2 text-xs text-zinc-400">
                如果后端刚补上资料层，请确认迁移已 apply 且
                <code className="mx-1 rounded bg-zinc-100 px-1 dark:bg-zinc-800">
                  DOC_FULL_API_ENABLED=true
                </code>
                —— 未启用时接口回 503，而不是空列表。
              </p>
            </div>
          ) : (
            <div className="max-w-md text-center">
              <p className="text-sm text-zinc-500">块编辑将在下一步实装</p>
              <p className="mt-2 text-xs text-zinc-400">
                这一块板的标题已经可以读写；正文的块编辑器（TipTap）还没有做。
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
