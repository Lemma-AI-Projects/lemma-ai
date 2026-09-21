import { useCallback } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'

import { usePageBlocksQuery } from '@/features/docs/docApi'
import type { DocBlock } from '@/features/docs/types'

/**
 * 一块板（资料层）的查看页 —— **只读预览**。
 *
 * 它要回答的是「这块板里到底有什么」：导入进来的资料、Agent 存下的笔记，
 * 都在这里看得见分段。**块编辑器（TipTap）仍然没做**，所以页面上如实写着
 * 只读，而不是给一个假的可编辑区域 —— 只读的正文加上诚实的一句话，比一个
 * 点了没反应的光标有用得多。
 *
 * 它同时承担诊断作用：后端 `DOC_FULL_API_ENABLED=false` 时，这里会明确
 * 说明「资料层未启用」，而不是一个看不出原因的空白。
 */
export function DocEditorView() {
  const { id, pageId } = useParams<{ id: string; pageId: string }>()
  const navigate = useNavigate()
  const blocksQuery = usePageBlocksQuery(pageId)
  const blocks = blocksQuery.data?.blocks ?? []

  const handleBack = useCallback(() => {
    navigate(`/learn-spaces/${id}`)
  }, [id, navigate])

  return (
    <div className="h-screen w-screen bg-zinc-100 p-2 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="flex h-full w-full flex-col gap-4 overflow-hidden rounded-2xl bg-white p-6 dark:bg-background">
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            aria-label="返回工作台"
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="truncate text-base font-medium">
            {blocksQuery.data?.title ??
              (blocksQuery.isPending ? '读取中…' : '板块')}
          </h1>
          {blocksQuery.data && (
            <span className="ml-auto shrink-0 text-xs text-muted-foreground">
              只读预览 · 正文编辑还没做
            </span>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {blocksQuery.isPending ? (
            <div className="mx-auto max-w-2xl space-y-3">
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  className="h-4 animate-pulse rounded bg-muted"
                  style={{ opacity: 1 - index * 0.2 }}
                />
              ))}
            </div>
          ) : blocksQuery.isError ? (
            <div className="mx-auto max-w-md pt-16 text-center">
              <p className="text-sm text-zinc-500">读不到这一块板</p>
              <p className="mt-2 text-xs text-zinc-400">
                如果后端刚补上资料层，请确认迁移已 apply 且
                <code className="mx-1 rounded bg-zinc-100 px-1 dark:bg-zinc-800">
                  DOC_FULL_API_ENABLED=true
                </code>
                —— 未启用时接口回 503，而不是空列表。
              </p>
            </div>
          ) : blocks.length === 0 ? (
            <div className="mx-auto max-w-md pt-16 text-center text-sm text-zinc-500">
              这一块板还没有内容
            </div>
          ) : (
            <article className="mx-auto max-w-2xl space-y-3 pb-8">
              {blocks.map((block) => (
                <BlockView key={block.id} block={block} />
              ))}
            </article>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * One stored block. The shapes are the ones `services/doc_service.py`'s
 * `markdown_to_blocks` writes — this renderer and that parser are the two ends
 * of the same contract, so an unknown type degrades to its text instead of
 * silently rendering nothing.
 */
function BlockView({ block }: { block: DocBlock }) {
  const content = (block.content ?? {}) as {
    text?: string
    level?: number
    ordered?: boolean
    items?: string[]
    language?: string
  }

  switch (block.type) {
    case 'heading': {
      const level = Math.min(Math.max(content.level ?? 2, 1), 6)
      const className =
        level === 1
          ? 'text-xl font-semibold'
          : level === 2
            ? 'text-lg font-medium'
            : 'text-base font-medium'
      return <p className={`${className} pt-2`}>{content.text}</p>
    }
    case 'list':
      return content.ordered ? (
        <ol className="list-decimal space-y-1 pl-5 text-sm leading-6">
          {(content.items ?? []).map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ol>
      ) : (
        <ul className="list-disc space-y-1 pl-5 text-sm leading-6">
          {(content.items ?? []).map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      )
    case 'code':
      return (
        <pre className="overflow-x-auto rounded-lg bg-zinc-100 p-3 text-xs leading-5 dark:bg-zinc-900">
          <code>{content.text}</code>
        </pre>
      )
    case 'quote':
      return (
        <blockquote className="border-l-2 border-zinc-300 pl-3 text-sm text-muted-foreground dark:border-zinc-700">
          {content.text}
        </blockquote>
      )
    case 'divider':
      return <hr className="border-zinc-200 dark:border-zinc-800" />
    default:
      return (
        <p className="text-sm leading-6 whitespace-pre-wrap">
          {content.text ?? ''}
        </p>
      )
  }
}
