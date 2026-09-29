import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { isAxiosError } from 'axios'
import { Grid3x3, Loader2, Paperclip } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import {
  fetchMaterialObjectUrl,
  usePageBlocksQuery,
  useProjectPagesQuery,
  useSavePageBlocksMutation,
} from '@/features/docs/docApi'
import type { DocBlock } from '@/features/docs/types'
import { ConversationPanel } from '@/features/learn-space/workspace/ConversationPanel'
import { useProjectQuery } from '@/features/project/projectApi'
import { cn } from '@/lib/utils'

import { BlockEditor } from './BlockEditor'
import { FocusRail } from './FocusRail'
import { FocusTopBar } from './FocusTopBar'
import {
  appendBlock,
  blocksFromDraft,
  draftFromBlocks,
  outlineOf,
  signatureOf,
  type DraftBlock,
} from './blockOps'

/** 预览/评审用：不连后端，直接渲染这一份数据（`/preview/focus`）。 */
export interface FocusPreviewData {
  spaceName: string
  method?: string
  title: string
  blocks: DocBlock[]
  pages: { id: string; title: string }[]
  /** 当前这一份在 `pages` 里的下标（页码胶囊显示的就是它）。 */
  pageIndex: number
  /** 当前这一份的 id —— 左栏靠它把"你在哪"标出来。 */
  pageId?: string
}

type SaveState = 'idle' | 'saving' | 'saved' | 'conflict' | 'error'

const AUTOSAVE_DELAY = 1200

/**
 * 聚焦 —— 三视角里用户停留最久的那个，也是唯一能写的那个。
 *
 * 它就是原来那条资料路由（`learn-spaces/:id/docs/:pageId`）升级来的：形状本来就
 * 是对的（全屏、不套 AppLayout、自带标题），缺的是**能写**、**有语义层的位置**、
 * 以及**在资料之间一直往前走**。设计见 `.workbuddy/research/focus-mode-design.md`。
 *
 * 这一版实装的：新顶栏（空间名+聚焦 · method 状态栏 · 页码 · Mala · 对话全屏）·
 * 左栏大纲与空间资料 · **可编辑正文**（自研块编辑器，六种块）· 前后漫游 · 空态。
 * **没实装（也不假装）**：Mala 的投送接线、边注、语义层、PDF 渲染、阅读位置 ——
 * 各自在页面上有说明，或者干脆不出现。
 */
export function FocusView({ preview }: { preview?: FocusPreviewData }) {
  const params = useParams<{ id: string; pageId?: string }>()
  if (preview) return <FocusDocument key="preview" preview={preview} />
  // **换一份资料就重挂一次**（key 用 pageId）：草稿、脏标记、冲突状态全部跟着
  // 归零，不需要一个"pageId 变了就手动清一堆 state"的 effect —— 那种 effect
  // 既难写对（顺序、竞态），又是 react-hooks 规则明确不鼓励的形状。
  return (
    <FocusDocument
      key={params.pageId ?? 'empty'}
      spaceId={params.id}
      pageId={params.pageId}
    />
  )
}

function FocusDocument({
  spaceId,
  pageId,
  preview,
}: {
  spaceId?: string
  pageId?: string
  preview?: FocusPreviewData
}) {
  const navigate = useNavigate()

  const projectQuery = useProjectQuery(spaceId)
  const pagesQuery = useProjectPagesQuery(spaceId)
  const blocksQuery = usePageBlocksQuery(pageId)
  const saveMutation = useSavePageBlocksMutation()

  const [draft, setDraft] = useState<DraftBlock[]>(() =>
    preview ? draftFromBlocks(preview.blocks) : []
  )
  const [isDirty, setDirty] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [conflict, setConflict] = useState<{
    serverDraft: DraftBlock[]
    serverUpdatedAt: string | null
  } | null>(null)
  const [isDiffOpen, setDiffOpen] = useState(false)
  const [isPanelFull, setPanelFull] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const draftRef = useRef(draft)
  const dirtyRef = useRef(isDirty)
  const updatedAtRef = useRef<string | null>(preview ? 'preview' : null)

  // ref 只在 effect 里同步（渲染期写 ref 会被 react-hooks 规则拦，而且它确实
  // 会在并发渲染下读到半成品）。这两个都声明在下面那些 effect **之前** ——
  // 依赖它们的判断必须先看到最新的值。
  useEffect(() => {
    draftRef.current = draft
  }, [draft])
  useEffect(() => {
    dirtyRef.current = isDirty
  }, [isDirty])

  const spaceName = preview?.spaceName ?? projectQuery.data?.name ?? ''

  const materials = useMemo(
    () => (preview?.pages ?? (pagesQuery.data ?? []).map((page) => ({ id: page.id, title: page.title }))),
    [pagesQuery.data, preview?.pages]
  )
  const currentIndex = preview
    ? preview.pageIndex
    : materials.findIndex((page) => page.id === pageId)
  const hasPage = Boolean(pageId) || Boolean(preview)

  const goToPage = useCallback(
    (index: number) => {
      const target = materials[index]
      if (!target || !spaceId) return
      navigate(`/learn-spaces/${spaceId}/docs/${target.id}`)
    },
    [materials, navigate, spaceId]
  )

  // 服务端 → 草稿。两种情况下不动草稿：用户正在写（这时服务端变了 = 冲突），
  // 以及内容其实一模一样（例如刚保存完回来的重取 —— 不动就不会把光标顶掉）。
  //
  // 这个 effect 是**把外部系统（react-query 的缓存）同步进本地可编辑状态**，
  // 规则本身允许这种例外：本地状态必须存在（用户每敲一个字都要立刻看到），
  // 又不能每次渲染都从缓存重算（那会把 caret 顶掉）。仓库里同形状的那处
  // （`useConversationChat.ts:295`）也是这么标注的。
  useEffect(() => {
    if (preview) return
    const data = blocksQuery.data
    if (!data) return
    const serverDraft = draftFromBlocks(data.blocks)
    const previousUpdatedAt = updatedAtRef.current
    const serverUpdatedAt = data.updatedAt

    if (dirtyRef.current) {
      if (previousUpdatedAt && serverUpdatedAt !== previousUpdatedAt) {
        updatedAtRef.current = serverUpdatedAt
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setConflict({ serverDraft, serverUpdatedAt })
        setSaveState('conflict')
      }
      return
    }
    if (signatureOf(serverDraft) !== signatureOf(draftRef.current)) {
      setDraft(serverDraft)
    }
    updatedAtRef.current = serverUpdatedAt
    setSaveState((current) => (current === 'error' ? current : 'idle'))
  }, [blocksQuery.data, preview])

  const performSave = useCallback(
    async (expectedAt?: string | null) => {
      if (preview || !pageId) return
      const updatedAt = expectedAt ?? updatedAtRef.current
      if (!updatedAt) return
      setSaveState('saving')
      try {
        await saveMutation.mutateAsync({
          pageId,
          blocks: blocksFromDraft(draftRef.current),
          updatedAt,
        })
        setDirty(false)
        setConflict(null)
        setSaveState('saved')
      } catch (error) {
        const isStale = isAxiosError(error) && error.response?.status === 409
        if (!isStale) {
          setSaveState('error')
          return
        }
        // 409：先把**服务器上现在的版本**取回来再展示 —— 拿旧数据做对比是假的。
        const fresh = await blocksQuery.refetch()
        const serverUpdatedAt = fresh.data?.updatedAt ?? null
        updatedAtRef.current = serverUpdatedAt
        setConflict({
          serverDraft: draftFromBlocks(fresh.data?.blocks ?? []),
          serverUpdatedAt,
        })
        setSaveState('conflict')
      }
    },
    [blocksQuery, pageId, preview, saveMutation]
  )

  // 输入停下来就存，不用记得按保存。Cmd/Ctrl+S 也接在编辑器上。
  useEffect(() => {
    if (preview || !isDirty) return
    const handle = window.setTimeout(() => {
      void performSave()
    }, AUTOSAVE_DELAY)
    return () => window.clearTimeout(handle)
  }, [draft, isDirty, performSave, preview])

  // 离开这一份资料（或这个页面）时，手上还没落的东西先交出去 —— 自动保存有
  // 1.2 秒的窗口，点了左侧另一份资料就走的话，那 1.2 秒里的字不该就这么没了。
  const saveRef = useRef(performSave)
  useEffect(() => {
    saveRef.current = performSave
  }, [performSave])
  useEffect(
    () => () => {
      if (dirtyRef.current) void saveRef.current()
    },
    []
  )

  // ← → 漫游。手在输入框里的时候不算 —— 那是在正文里挪光标。
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const tag = target?.tagName
      if (tag === 'TEXTAREA' || tag === 'INPUT' || target?.isContentEditable) return
      if (event.key === 'ArrowLeft') goToPage(currentIndex - 1)
      if (event.key === 'ArrowRight') goToPage(currentIndex + 1)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [currentIndex, goToPage])

  const handleDraftChange = useCallback(
    (next: DraftBlock[]) => {
      setDraft(next)
      if (!preview) setDirty(true)
    },
    [preview]
  )

  const jumpToBlock = useCallback((index: number) => {
    const key = draftRef.current[index]?.key
    if (!key) return
    scrollRef.current
      ?.querySelector(`[data-block-key="${key}"]`)
      ?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }, [])

  const openFile = useCallback(async () => {
    if (!pageId) return
    const url = await fetchMaterialObjectUrl(pageId)
    window.open(url, '_blank', 'noopener')
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }, [pageId])

  const outline = useMemo(() => outlineOf(draft), [draft])
  const page = preview ? undefined : blocksQuery.data
  const pageMeta = (pagesQuery.data ?? []).find((row) => row.id === pageId)
  const isFileBacked = Boolean(pageMeta?.mime)

  const saveLabel =
    saveState === 'saving'
      ? '保存中…'
      : saveState === 'error'
        ? '保存失败'
        : saveState === 'conflict'
          ? '有冲突'
          : isDirty
            ? '未保存'
            : saveState === 'saved'
              ? '已保存'
              : ''

  const title = preview?.title ?? page?.title ?? (blocksQuery.isPending ? '读取中…' : '这块板')

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-zinc-100 p-2 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl bg-white dark:bg-background">
        <FocusTopBar
          spaceName={spaceName}
          isNameLoading={!preview && projectQuery.isPending}
          method={preview?.method}
          roam={
            currentIndex >= 0 && materials.length > 1
              ? {
                  index: currentIndex,
                  count: materials.length,
                  onPrev: () => goToPage(currentIndex - 1),
                  onNext: () => goToPage(currentIndex + 1),
                }
              : null
          }
          onExit={() => (spaceId ? navigate(`/learn-spaces/${spaceId}`) : navigate('/learn-spaces'))}
          malaDisabledReason="Mala 的投送还没接线（后端已就绪，下一轮接上）"
          onTogglePanel={() => setPanelFull((value) => !value)}
          isPanelFull={isPanelFull}
        />

        <div className="relative flex min-h-0 flex-1">
          {!isPanelFull && (
            <FocusRail
              outline={outline}
              onJump={jumpToBlock}
              pages={materials}
              currentPageId={pageId ?? preview?.pageId}
              onSelectPage={(id) =>
                spaceId ? navigate(`/learn-spaces/${spaceId}/docs/${id}`) : undefined
              }
              isPagesLoading={!preview && pagesQuery.isPending}
            />
          )}

          {!isPanelFull && (
            <div ref={scrollRef} className="min-w-0 flex-1 overflow-y-auto">
              {!hasPage ? (
                <FocusEmptyState
                  pages={materials}
                  isPagesLoading={!preview && pagesQuery.isPending}
                  spaceId={spaceId ?? ''}
                  onOpenPage={(id) => navigate(`/learn-spaces/${spaceId}/docs/${id}`)}
                />
              ) : (
              <div className="mx-auto max-w-2xl px-8 py-6">
                <div className="flex items-baseline gap-2">
                  <h1 className="truncate text-base font-medium">{title}</h1>
                  {isFileBacked && (
                    <span className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-500 dark:bg-zinc-800">
                      文件资料
                    </span>
                  )}
                  <span
                    className={cn(
                      'ml-auto shrink-0 text-[11px]',
                      saveState === 'conflict' || saveState === 'error'
                        ? 'text-amber-600'
                        : 'text-zinc-400'
                    )}
                  >
                    {saveLabel}
                  </span>
                </div>

                {saveState === 'conflict' && conflict && (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[13px] text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
                    <p>
                      这份资料在别处被改过，<strong>你手上的这一版还没落</strong>。
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setDiffOpen(true)}
                        className="rounded border border-amber-300 px-2 py-1 text-xs hover:bg-amber-100 dark:border-amber-800 dark:hover:bg-amber-900"
                      >
                        看差异
                      </button>
                      <button
                        type="button"
                        onClick={() => void performSave(conflict.serverUpdatedAt)}
                        className="rounded bg-amber-600 px-2 py-1 text-xs text-white hover:bg-amber-700"
                      >
                        用我的覆盖
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDraft(conflict.serverDraft)
                          setDirty(false)
                          setConflict(null)
                          setSaveState('idle')
                          void blocksQuery.refetch()
                        }}
                        className="rounded border border-amber-300 px-2 py-1 text-xs hover:bg-amber-100 dark:border-amber-800 dark:hover:bg-amber-900"
                      >
                        用服务器上的（丢掉我的）
                      </button>
                    </div>
                  </div>
                )}

                {isFileBacked && pageId && !preview && (
                  <div className="mt-4 flex items-center gap-2 rounded-lg border border-zinc-200 p-3 text-[13px] dark:border-zinc-800">
                    <Paperclip className="size-4 shrink-0 text-zinc-400" />
                    <span className="min-w-0 flex-1 truncate text-zinc-600 dark:text-zinc-300">
                      {pageMeta?.originalName ?? '上传的文件'}
                    </span>
                    <button
                      type="button"
                      onClick={() => void openFile()}
                      className="shrink-0 rounded border border-zinc-200 px-2 py-1 text-xs hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                    >
                      打开文件
                    </button>
                  </div>
                )}

                <div className="mt-4">
                  {!preview && blocksQuery.isPending ? (
                    <div className="space-y-3">
                      {[0, 1, 2, 3].map((index) => (
                        <div
                          key={index}
                          className="h-4 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800"
                          style={{ opacity: 1 - index * 0.2 }}
                        />
                      ))}
                    </div>
                  ) : !preview && blocksQuery.isError ? (
                    <div className="pt-10 text-center text-[13px] text-zinc-500">
                      <p>读不到这一块板</p>
                      <p className="mt-2 text-xs text-zinc-400">
                        后端刚补上资料层时，请确认迁移已 apply 且
                        <code className="mx-1 rounded bg-zinc-100 px-1 dark:bg-zinc-800">
                          DOC_FULL_API_ENABLED=true
                        </code>
                        —— 未启用时接口回 503，而不是空列表。
                      </p>
                    </div>
                  ) : draft.length === 0 ? (
                    <div className="pt-10 text-center">
                      <p className="text-[13px] text-zinc-500">
                        {isFileBacked ? '这块板还没有你写的正文' : '这一块板还没有内容'}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          const result = appendBlock(draft, 'paragraph')
                          handleDraftChange(result.draft)
                          window.setTimeout(() => jumpToBlock(0), 0)
                        }}
                        className="mt-3 rounded-full bg-zinc-900 px-3 py-1.5 text-xs text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
                      >
                        开始写
                      </button>
                    </div>
                  ) : (
                    <BlockEditor
                      blocks={draft}
                      onChange={handleDraftChange}
                      onSaveShortcut={() => void performSave()}
                    />
                  )}
                </div>

                {draft.length > 0 && !isFileBacked && <FocusFooterHint />}
              </div>
              )}
            </div>
          )}

          <ConversationPanel
            projectId={spaceId}
            spaceName={spaceName || '这个空间'}
            conversationId={conversationId}
            onConversationChange={setConversationId}
            className={isPanelFull ? 'flex-1' : undefined}
          />

          {isDiffOpen && conflict && (
            <div className="absolute inset-0 z-10 bg-white/95 p-6 backdrop-blur-sm dark:bg-zinc-950/95">
              <div className="mx-auto flex h-full max-w-2xl flex-col">
                <div className="flex items-center gap-3 pb-3">
                  <h2 className="text-sm font-medium">服务器上的这一版</h2>
                  <button
                    type="button"
                    onClick={() => setDiffOpen(false)}
                    className="ml-auto rounded border border-zinc-200 px-2 py-1 text-xs hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                  >
                    关掉
                  </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                  <BlockEditor
                    blocks={conflict.serverDraft}
                    onChange={() => undefined}
                    readOnly
                  />
                </div>
                <p className="pt-3 text-xs text-zinc-500">
                  左边这版是服务器上现在的；你手上的那版还在下面那个编辑区里，选"用我的覆盖"就写回去。
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function FocusFooterHint() {
  return (
    <p className="pt-6 text-[11px] leading-5 text-zinc-400">
      回车分一段，退格并回上一段；左侧标题那个按钮可以换段落类型。
      <span className="mx-1 rounded bg-zinc-100 px-1 dark:bg-zinc-800">←</span>
      <span className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">→</span>
      在资料之间走（手在正文里时不算）。
    </p>
  )
}

/**
 * 空态（null stack）—— 聚焦默认不打开任何资料。
 *
 * **"继续上次"和"让 Agent 推荐"这里没有**：前者要阅读位置（还没做），后者要等
 * 你拍板。空态里放一个点了没反应的入口，比少一个入口糟。
 */
export function FocusEmptyState({
  pages,
  isPagesLoading,
  onOpenPage,
  spaceId,
}: {
  pages: { id: string; title: string }[]
  isPagesLoading?: boolean
  onOpenPage: (pageId: string) => void
  spaceId: string
}) {
  return (
    <div className="mx-auto max-w-md pt-24 text-center">
      <h2 className="text-sm font-medium">还没有打开任何资料</h2>
      <p className="mt-2 text-xs text-zinc-500">聚焦是空的 —— 这里从不假装有内容</p>

      {isPagesLoading ? (
        <div className="mt-6 flex justify-center">
          <Loader2 className="size-4 animate-spin text-zinc-300" />
        </div>
      ) : pages.length > 0 ? (
        <ul className="mt-6 space-y-1 text-left">
          {pages.slice(0, 8).map((page) => (
            <li key={page.id}>
              <button
                type="button"
                onClick={() => onOpenPage(page.id)}
                className="block w-full truncate rounded border border-zinc-200 px-3 py-2 text-left text-[13px] transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
              >
                {page.title || '未命名'}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 text-[13px] text-zinc-500">
          这个空间还没有资料 —— 先去放一份进来。
        </p>
      )}

      <Link
        to={`/learn-spaces/${spaceId}`}
        className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-zinc-200 px-3 py-1.5 text-xs text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200"
      >
        <Grid3x3 className="size-3.5" />
        去网格挑一份
      </Link>
    </div>
  )
}
