import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { isAxiosError } from 'axios'
import { Grid3x3, Loader2 } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import {
  useCreatePageMutation,
  useDeletePageMutation,
  usePageBlocksQuery,
  useProjectPagesQuery,
  useRenamePageMutation,
  useSavePageBlocksMutation,
  useUploadMaterialMutation,
} from '@/features/docs/docApi'
import {
  describeMaterialError,
  isMaterialName,
  materialMimeFor,
} from '@/features/docs/importFile'
import type { DocBlock } from '@/features/docs/types'
import { ConversationPanel } from '@/features/learn-space/workspace/ConversationPanel'
import { useProjectQuery } from '@/features/project/projectApi'
import { useActiveGoalQuery } from '@/features/learn-space/goal/goalApi'
import { goalLine } from '@/features/learn-space/goal/goalText'
import {
  useMethodStatusQuery,
  type MethodStatus,
} from '@/features/learn-space/method/methodApi'
import { cn } from '@/lib/utils'

import { BlockEditor } from './BlockEditor'
import { ConflictPanel } from './ConflictPanel'
import { FocusRail } from './FocusRail'
import { FocusRoamBar } from './FocusRoamBar'
import { FocusTopBar, type FocusPanelMode } from './FocusTopBar'
import { MalaChips } from './MalaChips'
import { MaterialView } from './MaterialView'
import type { MalaBundleChip } from './malaChipsOps'
import {
  appendBlock,
  blocksFromDraft,
  draftFromBlocks,
  outlineOf,
  signatureOf,
  textOf,
  toggleKey,
  type DraftBlock,
} from './blockOps'
import { applyFrozenOrder } from './focusOrder'
import {
  MAX_MALA_ITEMS,
  createBoardContext,
  malaFailureText,
} from '@/features/board/boardContextApi'

/** 预览/评审用：不连后端，直接渲染这一份数据（`/preview/focus`）。 */
export interface FocusPreviewData {
  spaceName: string
  /**
   * 空间名旁边那一行方位（"期末考到 90 分 · 还有 21 天"）。真实页面上由
   * `/projects/{id}/goals/active` 算出来；没有目标时是 `null`。
   */
  goalLine?: string | null
  /**
   * method 状态栏的四格（在做什么 / 要你做什么 / 什么算完成 + 和目标的关�系）。
   * 真实页面上来自 `/api/v1/methods/status`。
   */
  methodStatus?: MethodStatus
  title: string
  blocks: DocBlock[]
  /**
   * 空间的资料。上传件（PDF／图片）**没有 `blocks`**，靠 `originalName` / `mime`
   * 才能在聚焦里认出它——预览里也把这两个字段带上，好演练"非文本资料"那一支。
   */
  pages: {
    id: string
    title: string
    originalName?: string | null
    mime?: string | null
  }[]
  /** 当前这一份在 `pages` 里的下标（页码胶囊显示的就是它）。 */
  pageIndex: number
  /** 当前这一份的 id —— 左栏靠它把"你在哪"标出来。 */
  pageId?: string
}

/** 一份资料是不是"文件在后面撑着"（上传件）——只看这两个字段。 */
interface FocusPageMeta {
  originalName?: string | null
  mime?: string | null
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
 * 这一版实装的：新顶栏（空间名+聚焦 · method 状态栏 · Mala · 左栏开关 · 对话窗格开关）·
 * 左栏大纲与空间资料 · **可编辑正文**（自研块编辑器，六种块）· 前后漫游（钉在页面
 * 最下面的 `FocusRoamBar`，页码也在那儿）· 空态 ·
 * **非文本资料**（上传的图片内联预览、PDF 走 `features/docs/pdf/PdfViewer` 真渲染、
 * 其它类型给文件卡 —— 分三支，看 `MaterialView`）·
 * **次序冻结**（进聚焦时抄下次序，刷新才重排，看 `FocusSession` / `focusOrder`）·
 * **就地 edit**（顶栏「编辑」下拉：新建笔记／文件夹、上传；左栏资料项悬停重命名／
 * 删除 —— 只在真页面上给，预览是评审入口，见 `canEdit`）·
 * **冲突面板**（`ConflictPanel`：抽出来好让离屏 harness 直接钉住它那三句话与三个出口）。
 * **没实装（也不假装）**：Mala 的投送接线（按钮渲染成禁用并写明原因）、边注、语义层、
 * 阅读位置 —— 各自在页面上有说明，或者干脆不出现。PDF 的文本选择／搜索／批注／
 * 锚点与缩略图也没有，别把顶栏那点翻页当成"文档内第 N 页"。
 */
export function FocusView({ preview }: { preview?: FocusPreviewData }) {
  const params = useParams<{ id: string; pageId?: string }>()
  if (preview) return <FocusDocument key="preview" preview={preview} />
  return <FocusSession spaceId={params.id} pageId={params.pageId} />
}

/**
 * 一次聚焦会话的外壳 —— **次序在这里冻结**。
 *
 * 为什么不在 `FocusDocument` 里：换一份资料时它按 `key` 重挂（草稿、脏标记、
 * 冲突状态全部归零），冻结的次序不能跟着一起归零。它挂在重挂边界**之上**，只在
 * 整页刷新时重算 —— 这正是 v1-plan §6 拍的口径（进聚焦时冻结，刷新才重排）。
 */
function FocusSession({ spaceId, pageId }: { spaceId?: string; pageId?: string }) {
  const pagesQuery = useProjectPagesQuery(spaceId)
  const [frozenIds, setFrozenIds] = useState<string[] | null>(null)

  const serverPages = pagesQuery.data
  // 第一次拿到列表就把次序抄下来，之后不再改。抄的是**次序**不是快照 —— 新建的
  // （不在序列里）接末尾、删掉的（找不到项）自然跳过，等着 `applyFrozenOrder`。
  useEffect(() => {
    if (frozenIds !== null) return
    if (!serverPages || serverPages.length === 0) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFrozenIds(serverPages.map((page) => page.id))
  }, [frozenIds, serverPages])

  const materials = useMemo(
    () =>
      applyFrozenOrder(
        (serverPages ?? []).map((page) => ({ id: page.id, title: page.title })),
        frozenIds
      ),
    [frozenIds, serverPages]
  )
  const pageMeta = (serverPages ?? []).find((row) => row.id === pageId)

  return (
    <FocusDocument
      // **换一份资料就重挂一次**（key 用 pageId）：草稿、脏标记、冲突状态全部跟着
      // 归零，不需要一个"pageId 变了就手动清一堆 state"的 effect —— 那种 effect
      // 既难写对（顺序、竞态），又是 react-hooks 规则明确不鼓励的形状。
      key={pageId ?? 'empty'}
      spaceId={spaceId}
      pageId={pageId}
      materials={materials}
      isPagesLoading={pagesQuery.isPending}
      pageMeta={pageMeta}
    />
  )
}

function FocusDocument({
  spaceId,
  pageId,
  preview,
  materials: sessionMaterials = [],
  isPagesLoading: sessionPagesLoading = false,
  pageMeta: sessionPageMeta,
}: {
  spaceId?: string
  pageId?: string
  preview?: FocusPreviewData
  /** 空间里的资料（已按冻结次序排好）——漫游与左栏用。 */
  materials?: { id: string; title: string }[]
  isPagesLoading?: boolean
  /** 当前这一份的资料元数据（上传件才有 `originalName` / `mime`）。 */
  pageMeta?: FocusPageMeta
}) {
  const navigate = useNavigate()

  const projectQuery = useProjectQuery(spaceId)
  const blocksQuery = usePageBlocksQuery(pageId)
  const saveMutation = useSavePageBlocksMutation()

  // 聚焦里的 edit（M4）：写完想就地开新的一份，不用回网格。三件事全都复用网格
  // 那一套 mutation —— 新建落到当前空间，上传走 `material_storage`。
  const createPage = useCreatePageMutation(spaceId ?? '')
  const renamePage = useRenamePageMutation(spaceId ?? '')
  const deletePage = useDeletePageMutation(spaceId ?? '')
  const uploadMaterial = useUploadMaterialMutation(spaceId ?? '')
  const [materialNote, setMaterialNote] = useState<string | null>(null)

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
  /**
   * Mala 圈选中的块。⚠️ **刻意与 `draft` 分开**：它不是文档内容（不进草稿、不
   * 触发保存、不参与冲突比较），而是"这一次想交给 Agent 什么"的临时意图 ——
   * 两者生命周期不同，混在一起会让"取消圈选"看起来像"删了一段字"。
   *
   * 换页自动归零：`FocusDocument` 以 `pageId` 为 key **重挂**（见 :150 那段注释），
   * 所以页码一变这批 key 就没了 —— 不需要一个"pageId 变了就清空"的 effect。
   */
  const [selectedKeys, setSelectedKeys] = useState<ReadonlySet<string>>(() => new Set())
  /**
   * 圈选是**意图式**更新，不是"设成新集合"。
   * ⚠️ 用户圈选时会连着点三四块，那些点击落在同一个 React 批次里、只重渲染一次。
   * 若每次都基于 `selectedKeys` 的旧值算新集合，第二块就会覆盖第一块 —— 而且
   * **没有任何报错**，只是 quietly 少了几块。函数式更新让批处理累积它们。
   */
  const toggleBlockSelected = useCallback((key: string) => {
    setSelectedKeys((prev) => toggleKey(prev, key))
  }, [])
  const clearBlockSelection = useCallback(() => setSelectedKeys(new Set()), [])
  /**
   * Mala 投出去的材料包 —— **一次圈选一个包**。
   *
   * ⚠️ 与 `selectedKeys` 分开的两层状态：圈着的是"我正在选什么"，投出去的是
   * "我已经交给 Agent 什么"。前者随时可变、Esc 就没；后者要一直挂在那儿直到
   * 下一轮发送把它用掉。混成一个状态的话，"取消圈选"会长得像"撤回过一次的投送"。
   */
  const [bundles, setBundles] = useState<MalaBundleChip[]>([])
  const [malaBusy, setMalaBusy] = useState(false)
  const [malaError, setMalaError] = useState<string | null>(null)

  /**
   * 点 Mala：圈中的块 → 一个材料包。
   *
   * ⚠️ **不过滤空块**：按钮上的数字就是 `selectedKeys.size`，而"界面上的条数
   * 必须等于实际带上的条数"（后端绝不截断，超限直接 422）。提前过滤会让这两个
   * 数字对不上，而用户没有任何办法看出差别 —— 宁可让后端用它的原话拒绝。
   */
  const handleMalaClick = useCallback(async () => {
    if (!spaceId || selectedKeys.size === 0 || malaBusy) return
    setMalaBusy(true)
    setMalaError(null)
    try {
      const picked = draft.filter((block) => selectedKeys.has(block.key))
      const bundle = await createBoardContext({
        projectId: spaceId,
        items: picked.map((block) => ({
          shapeId: block.key,
          type: block.type,
          text: textOf(block),
        })),
      })
      setBundles((prev) => [
        ...prev,
        { id: bundle.id, itemCount: bundle.itemCount, label: bundle.label },
      ])
    } catch (error) {
      setMalaError(malaFailureText(error))
    } finally {
      setMalaBusy(false)
    }
  }, [draft, malaBusy, selectedKeys, spaceId])

  /**
   * 圈中的块里有没有一句可读的话。⚠️ 后端的 `no_readable_text` 拒绝**整批**，
   * 而一次注定被拒的点击该被省掉 —— 所以在点之前就查，而不是等它 422 之后再说。
   * 分割线算"没有文本"：它本来就没有字。
   */
  const pickedHasText = useMemo(
    () =>
      draft.some(
        (block) => selectedKeys.has(block.key) && textOf(block).trim() !== ''
      ),
    [draft, selectedKeys]
  )

  /**
   * Mala 为什么点不动。⚠️ **空选区预先禁用**，而不是点了才告诉用户空 ——
   * 那是浪费一次点击。上限提示也在这里：后端超 24 项直接 422，而 422 之后用户
   * 要重新圈一次，所以在还差几块的时候就该说。
   */
  const malaDisabledReason = malaBusy
    ? '正在打包…'
    : !spaceId
      ? '预览页没有真实空间，圈选暂不可用'
      : selectedKeys.size === 0
        ? '先圈出块：按住 ⌘（或 Ctrl）点选'
        : selectedKeys.size > MAX_MALA_ITEMS
          ? `一次最多 ${MAX_MALA_ITEMS} 块，分两次投`
          : !pickedHasText
            ? '圈中的块里没有可读的文字'
            : undefined
  // 对话面板三档：正常 / 全屏 / 收起。面板里那条「折起」收到 `hidden`，顶栏那个
  // 图标按钮按档位换脸（收起时变「打开对话」）—— 两者是同一件事的两个入口。
  const [panelMode, setPanelMode] = useState<FocusPanelMode>('normal')
  const isPanelFull = panelMode === 'full'
  const isPanelHidden = panelMode === 'hidden'
  // 左栏开着没有。它是 224px 固定宽，窗口一窄就只能靠操作系统去躲 —— 所以给
  // 顶栏一个开关，收起时整个不渲染（`FocusRail` 没有值得留住的本地状态）。
  const [isRailOpen, setRailOpen] = useState(true)
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

  // 顶栏那一行方位：这个空间正在为什么花时间。没有目标时是 null —— 顶栏就什么都
  // 不加（"还没有目标"属于简报，不属于标题栏）。预览走 fixture 里写死的那一条。
  const { goal } = useActiveGoalQuery(spaceId)
  const direction = preview ? (preview.goalLine ?? null) : goalLine(goal ?? null)

  // method 状态栏：这个空间**现在**在被怎么教（右栏那段会话的做法），加上这个空间
  // 的方向。传 conversationId 是为了跟着右栏那段会话走；还没开会话时后端会回落到
  // "这个空间最近教过的那一段"。预览不连后端，直接用 fixture 里那一份。
  const { status: methodStatus } = useMethodStatusQuery(
    spaceId,
    conversationId
  )
  const methodBar = preview ? preview.methodStatus : methodStatus
  // 预览只有一份 fixture；真实页面上次序已经在 `FocusSession` 冻结好了。
  const materials = preview ? preview.pages : sessionMaterials
  const currentIndex = preview
    ? preview.pageIndex
    : materials.findIndex((page) => page.id === pageId)
  const hasPage = Boolean(pageId) || Boolean(preview)
  const pagesLoading = preview ? false : sessionPagesLoading

  const goToPage = useCallback(
    (index: number) => {
      const target = materials[index]
      if (!target || !spaceId) return
      navigate(`/learn-spaces/${spaceId}/docs/${target.id}`)
    },
    [materials, navigate, spaceId]
  )

  // 底部漫游条的数据。只有一份资料（或站在列表外）时是 `null` —— 底部那条整个
  // 不出现，而不是画一个点了没用的 1/1。
  const roam =
    currentIndex >= 0 && materials.length > 1
      ? {
          index: currentIndex,
          count: materials.length,
          onPrev: () => goToPage(currentIndex - 1),
          onNext: () => goToPage(currentIndex + 1),
        }
      : null

  // `edit` 三个入口只在真页面上给（预览是免登录的评审入口，连不上后端，接上去
  // 就是点了没反应的东西）。
  const canEdit = !preview && Boolean(spaceId)

  const handleNewPage = useCallback(
    (kind: 'note' | 'folder') => {
      if (!spaceId) return
      createPage.mutate(
        { title: kind === 'folder' ? '新建文件夹' : '未命名笔记', kind },
        {
          // 新建的笔记**直接进去写**；它是冻结次序里没有的 id，`applyFrozenOrder`
          // 会把它接在末尾 —— 正是 §4.1 拍的那条。文件夹留在原地不动。
          onSuccess: (created) => {
            if (kind === 'note') navigate(`/learn-spaces/${spaceId}/docs/${created.id}`)
          },
        }
      )
    },
    [createPage, navigate, spaceId]
  )

  const handleUpload = useCallback(
    (files: File[]) => {
      if (!spaceId) return
      setMaterialNote(null)
      for (const file of files) {
        if (!isMaterialName(file.name)) {
          setMaterialNote(`「${file.name}」不是支持的格式：只收 PDF 与图片。`)
          continue
        }
        uploadMaterial.mutate(
          { file, mime: materialMimeFor(file) },
          { onError: (error) => setMaterialNote(describeMaterialError(error)) }
        )
      }
    },
    [spaceId, uploadMaterial]
  )

  const handleRenamePage = useCallback(
    (targetId: string, title: string) => {
      if (!spaceId) return
      renamePage.mutate({ pageId: targetId, title })
    },
    [renamePage, spaceId]
  )

  const handleDeletePage = useCallback(
    (targetId: string) => {
      if (!spaceId) return
      deletePage.mutate(targetId)
      // 删掉的正是脚下这一份 → 退回冻结次序里**前一份**（§4.1）；没有前一份就回网格。
      if (targetId === pageId) {
        const index = materials.findIndex((row) => row.id === targetId)
        const fallback = index > 0 ? materials[index - 1] : null
        navigate(
          fallback ? `/learn-spaces/${spaceId}/docs/${fallback.id}` : `/learn-spaces/${spaceId}`
        )
      }
    },
    [deletePage, materials, navigate, pageId, spaceId]
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

  const outline = useMemo(() => outlineOf(draft), [draft])
  const page = preview ? undefined : blocksQuery.data
  // 当前这一份的资料元数据：上传件才有 `originalName`（`doc/types.ts` 的约定）。
  const pageMeta = preview
    ? preview.pages.find((row) => row.id === preview.pageId)
    : sessionPageMeta
  const materialName = pageMeta?.originalName ?? null
  const isFileBacked = Boolean(materialName)
  // PDF 会渲染成一整页可翻的版面，`max-w-2xl` 太窄 —— 单独放宽到 `max-w-4xl`。
  // 判据与 `MaterialView` 一致：先看 mime，再退回扩展名。
  const isPdfMaterial =
    (pageMeta?.mime ?? '').includes('application/pdf') ||
    /\.pdf$/i.test(materialName ?? '')

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
          goalLine={direction}
          methodStatus={methodBar}
          onExit={() => (spaceId ? navigate(`/learn-spaces/${spaceId}`) : navigate('/learn-spaces'))}
          malaDisabledReason={malaDisabledReason}
          malaCount={selectedKeys.size}
          onMalaClick={() => void handleMalaClick()}
          edit={
            canEdit
              ? {
                  onNewFolder: () => handleNewPage('folder'),
                  onNewNote: () => handleNewPage('note'),
                  onUpload: handleUpload,
                }
              : undefined
          }
          onTogglePanel={() =>
            // 正常 ⇄ 全屏；收起时这一步就是"把面板叫回来"。
            setPanelMode((mode) => (mode === 'normal' ? 'full' : 'normal'))
          }
          panelMode={panelMode}
          railOpen={isRailOpen}
          onToggleRail={() => setRailOpen((open) => !open)}
        />

        {materialNote && (
          <p className="shrink-0 border-b border-amber-200 bg-amber-50 px-3 py-1 text-[12px] text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
            {materialNote}
          </p>
        )}

        <div className="relative flex min-h-0 flex-1">
          {!isPanelFull && isRailOpen && (
            <FocusRail
              outline={outline}
              onJump={jumpToBlock}
              pages={materials}
              currentPageId={pageId ?? preview?.pageId}
              onSelectPage={(id) =>
                spaceId ? navigate(`/learn-spaces/${spaceId}/docs/${id}`) : undefined
              }
              isPagesLoading={pagesLoading}
              onRenamePage={canEdit ? handleRenamePage : undefined}
              onDeletePage={canEdit ? handleDeletePage : undefined}
            />
          )}

          {!isPanelFull && (
            <div ref={scrollRef} className="min-w-0 flex-1 overflow-y-auto">
              {!hasPage ? (
                <FocusEmptyState
                  pages={materials}
                  isPagesLoading={pagesLoading}
                  spaceId={spaceId ?? ''}
                  onOpenPage={(id) => navigate(`/learn-spaces/${spaceId}/docs/${id}`)}
                />
              ) : (
              <div
                className={cn(
                  'mx-auto px-8 py-6',
                  isPdfMaterial ? 'max-w-4xl' : 'max-w-2xl'
                )}
              >
                <div className="flex items-baseline gap-2">
                  <h1 className="truncate text-base font-medium">{title}</h1>
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
                  <ConflictPanel
                    onShowDiff={() => setDiffOpen(true)}
                    onOverwrite={() => void performSave(conflict.serverUpdatedAt)}
                    onUseServer={() => {
                      setDraft(conflict.serverDraft)
                      setDirty(false)
                      setConflict(null)
                      setSaveState('idle')
                      void blocksQuery.refetch()
                    }}
                  />
                )}

                <div className="mt-4">
                  {isFileBacked ? (
                    <MaterialView
                      pageId={pageId ?? preview?.pageId ?? ''}
                      originalName={materialName ?? ''}
                      mime={pageMeta?.mime}
                      isPreview={Boolean(preview)}
                    />
                  ) : !preview && blocksQuery.isPending ? (
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
                      <p className="text-[13px] text-zinc-500">这一块板还没有内容</p>
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
                      selectedKeys={selectedKeys}
                      onSelectionToggle={toggleBlockSelected}
                      onSelectionClear={clearBlockSelection}
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
            malaChips={
              <>
                <MalaChips
                  chips={bundles}
                  onRemove={(bundleId) =>
                    setBundles((prev) => prev.filter((bundle) => bundle.id !== bundleId))
                  }
                />
                {/* 打包失败的一行小字。⚠️ 不是按钮下面一段红字 —— 那是这个产品
                    里最难看的一种错误态；`reason` 原话保留，用户能照着改。 */}
                {malaError && (
                  <p className="mb-2 px-1 text-[12px] text-zinc-500">{malaError}</p>
                )}
              </>
            }
            contextBundleIds={bundles.map((bundle) => bundle.id)}
            onContextBundlesConsumed={() => setBundles([])}
            // 「折起」：面板收到 `hidden`（宽度归零/不占位，但保持挂载 —— 草稿与
            // 流式输出都留着），再打开走顶栏那个图标按钮。
            onCollapse={() => setPanelMode('hidden')}
            className={cn(
              isPanelHidden && 'hidden',
              isPanelFull && 'flex-1'
            )}
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

        {/* 翻页钉在页面最下面 —— 正文在滚，它不滚。对话全屏时藏起来：那时正文
            根本没显示，翻页没有意义。 */}
        {!isPanelFull && roam && <FocusRoamBar {...roam} />}
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
