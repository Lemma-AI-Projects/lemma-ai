import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type Ref,
} from 'react'
import {
  Archive,
  ChevronRight,
  CircleAlert,
  Ellipsis,
  FileText,
  Folder,
  LayoutGrid,
  LoaderCircle,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
  type LucideIcon,
} from 'lucide-react'
import { ActionMenu, ActionMenuItem } from '@/components/ActionMenu'
import { cn } from '@/lib/utils'
import {
  useCreatePageMutation,
  useDeletePageMutation,
  useImportPageMutation,
  useProjectPagesQuery,
  useRenamePageMutation,
} from './docApi'
import type { DocPage, PageKind } from './types'

interface ShelterDrawerProps {
  /** 当前 learn space（板块都归它）。 */
  projectId: string
  onClose: () => void
  /** 点进一块板：交给路由 `/learn-spaces/:id/docs/:pageId`。 */
  onOpenPage: (pageId: string) => void
  className?: string
}

// 与后端 api/v1/pages.py 的 IMPORT_MAX_BYTES 保持一致。前端先拦一次是为了
// 省一次往返，后端那一份才是权威（前端拦不住改过的客户端）。
const IMPORT_MAX_BYTES = 1024 * 1024
const IMPORT_EXTENSIONS = ['.md', '.markdown', '.txt']

function isImportableName(name: string): boolean {
  const lower = name.toLowerCase()
  return IMPORT_EXTENSIONS.some((extension) => lower.endsWith(extension))
}

function statusOf(error: unknown): number | undefined {
  return (error as { response?: { status?: number } })?.response?.status
}

function describeImportError(error: unknown): string {
  switch (statusOf(error)) {
    case 503:
      return '资料层未启用（后端回 503），暂时导不进来。'
    case 413:
      return '文件超过 1 MB。'
    case 415:
      return '这个文件的编码读不出来 —— V1 只认 UTF-8 文本。'
    case 404:
      return '这个空间不在了。'
    default:
      return '导入失败，稍后再试。'
  }
}

interface GroupDef {
  kind: PageKind
  icon: LucideIcon
  label: string
}

const PAGE_ICON: Record<PageKind, LucideIcon> = {
  note: FileText,
  canvas: LayoutGrid,
  imported: Archive,
  folder: Folder,
}

const GROUPS: GroupDef[] = [
  { kind: 'note', icon: FileText, label: '笔记' },
  { kind: 'canvas', icon: LayoutGrid, label: '画布' },
  { kind: 'imported', icon: Archive, label: '资料' },
  { kind: 'folder', icon: Folder, label: '文件夹' },
]

/**
 * 左侧板块抽屉（learn space 的内容面，与右侧 ConversationPanel 对称）。
 *
 * 按 pages.kind 分组为可折叠 submenu；组内右键新建/重命名/删除。
 *
 * 四种状态，**互相不伪装**：
 *   读取中（骨架）· 读不到（明说原因：503 是「没启用」，不是「你没有板块」）·
 *   真的空（「还没有板块」）· 有内容。
 * 「导入」是这里自带的能力（文件选择 → 后端 /pages/import），不再由调用方注入，
 * 所以入口永远是真的 —— 点了没反应的按钮不做。
 */
export function ShelterDrawer({
  projectId,
  onClose,
  onOpenPage,
  className,
}: ShelterDrawerProps) {
  const pagesQuery = useProjectPagesQuery(projectId)
  const createPage = useCreatePageMutation(projectId)
  const renamePage = useRenamePageMutation(projectId)
  const deletePage = useDeletePageMutation(projectId)
  const importPage = useImportPageMutation(projectId)

  const [collapsed, setCollapsed] = useState<ReadonlySet<PageKind>>(new Set())
  const [creatingIn, setCreatingIn] = useState<PageKind | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [renaming, setRenaming] = useState<DocPage | null>(null)
  const [renameTitle, setRenameTitle] = useState('')
  const [importError, setImportError] = useState<string | null>(null)

  const createInputRef = useRef<HTMLInputElement>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const pages = useMemo(() => pagesQuery.data ?? [], [pagesQuery.data])

  const toggleGroup = useCallback((kind: PageKind) => {
    setCollapsed((current) => {
      const next = new Set(current)
      if (next.has(kind)) {
        next.delete(kind)
      } else {
        next.add(kind)
      }
      return next
    })
  }, [])

  const handleCreateNote = useCallback(() => {
    setCreatingIn('note')
    setNewTitle('')
    requestAnimationFrame(() => createInputRef.current?.focus())
  }, [])

  const commitCreate = useCallback(
    (kind: PageKind) => {
      const title = newTitle.trim()
      if (!title) {
        setCreatingIn(null)
        return
      }
      createPage.mutate({ title, kind, parentPageId: null })
      setCreatingIn(null)
      setNewTitle('')
    },
    [createPage, newTitle]
  )

  const startRename = useCallback(
    (page: DocPage) => {
      setRenaming(page)
      setRenameTitle(page.title)
      requestAnimationFrame(() => renameInputRef.current?.focus())
    },
    []
  )

  const commitRename = useCallback(() => {
    const title = renameTitle.trim()
    if (renaming && title && title !== renaming.title) {
      renamePage.mutate({ pageId: renaming.id, title })
    }
    setRenaming(null)
  }, [renamePage, renameTitle, renaming])

  const handleCreateKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') commitCreate(creatingIn ?? 'note')
    if (event.key === 'Escape') {
      setCreatingIn(null)
      setNewTitle('')
    }
  }

  const handleRenameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') commitRename()
    if (event.key === 'Escape') setRenaming(null)
  }

  const handleImportClick = useCallback(() => {
    setImportError(null)
    fileInputRef.current?.click()
  }, [])

  const handleFilePicked = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      // 先清 value：选同一个文件两次也要能再次触发 change。
      event.target.value = ''
      if (!file) return
      if (file.size > IMPORT_MAX_BYTES) {
        setImportError('文件超过 1 MB —— V1 只收 1 MB 以内的文本。')
        return
      }
      if (!isImportableName(file.name)) {
        setImportError('V1 只收文本（.md / .txt）。PDF、Word 这类还不能进来。')
        return
      }
      setImportError(null)
      importPage.mutate(
        { file },
        { onError: (error) => setImportError(describeImportError(error)) }
      )
    },
    [importPage]
  )

  const groups = useMemo(
    () =>
      GROUPS.map((group) => ({
        ...group,
        items: pages.filter((page) => page.kind === group.kind),
      })).filter((group) => group.items.length > 0),
    [pages]
  )

  // 「读不到」与「真的没有」是两件事，必须分开说：503 表示这个功能还没开，
  // 把它显示成「还没有板块」会让用户以为自己的东西丢了。
  const unavailableReason = useMemo(() => {
    if (!pagesQuery.isError) return null
    if (statusOf(pagesQuery.error) === 503) {
      return '资料层未启用（后端回了 503）：表还没建，或开关没打开。这不等于「你没有板块」。'
    }
    return '读不到板块：后端没有回应。这不等于「你没有板块」。'
  }, [pagesQuery.error, pagesQuery.isError])

  return (
    <aside
      className={cn(
        'flex w-72 shrink-0 flex-col overflow-hidden rounded-2xl border border-border bg-background',
        className
      )}
    >
      <header className="flex h-11 shrink-0 items-center justify-between pl-5 pr-2">
        <h2 className="text-sm font-medium text-foreground">
          {'板块'}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={'关闭板块抽屉'}
          title={'关闭板块抽屉'}
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-foreground/10"
        >
          <X className="size-4" />
        </button>
      </header>

      <div className="flex shrink-0 gap-1.5 px-3 pb-3">
        <button
          type="button"
          onClick={handleCreateNote}
          disabled={createPage.isPending}
          aria-label={'新建笔记'}
          className="flex h-8 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full bg-foreground px-3 text-[13px] font-medium text-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-foreground/20 disabled:cursor-default disabled:bg-zinc-200"
        >
          <Plus className="size-4" />
          <span className="truncate">{'新建笔记'}</span>
        </button>
        <button
          type="button"
          onClick={handleImportClick}
          disabled={importPage.isPending}
          aria-label={'导入'}
          title={'导入 .md / .txt'}
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-full border border-zinc-200 text-muted-foreground transition-colors',
            'hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-foreground/10',
            importPage.isPending && 'cursor-default opacity-60'
          )}
        >
          {importPage.isPending ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Upload className="size-4" />
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={'.md,.markdown,.txt,text/markdown,text/plain'}
          className="hidden"
          onChange={handleFilePicked}
        />
      </div>

      {importError && (
        <p className="px-5 pb-2 text-xs text-amber-600 dark:text-amber-400">
          {importError}
        </p>
      )}

      <div className="min-h-0 flex-1 scrollbar-fade overflow-y-auto px-2 pb-3">
        {pagesQuery.isPending ? (
          <div className="space-y-1 px-2 py-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-8 animate-pulse rounded-md bg-muted"
                style={{ opacity: 1 - i * 0.25 }}
              />
            ))}
          </div>
        ) : unavailableReason ? (
          <div className="mx-2 mt-1 flex flex-col items-center gap-1 rounded-lg border border-dashed border-amber-300 bg-amber-50/50 px-3 py-6 text-center dark:bg-amber-950/20">
            <CircleAlert className="size-5 text-amber-500" strokeWidth={1.5} />
            <p className="text-[13px] text-foreground">{'读不到板块'}</p>
            <p className="text-xs text-muted-foreground">{unavailableReason}</p>
            <button
              type="button"
              onClick={() => void pagesQuery.refetch()}
              className="mt-1 rounded-full border border-zinc-200 px-3 py-1 text-xs text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-foreground/10"
            >
              {'重试'}
            </button>
          </div>
        ) : pages.length === 0 ? (
          <div className="mx-2 mt-1 flex flex-col items-center gap-1 rounded-lg border border-dashed border-zinc-300 bg-transparent px-3 py-6 text-center">
            <FileText className="size-5 text-zinc-300" strokeWidth={1.5} />
            <p className="text-[13px] text-muted-foreground">
              {'还没有板块'}
            </p>
            <p className="text-xs text-muted-foreground/80">
              {'新建一篇笔记，或导入一份 .md / .txt 资料'}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {/* 新建后的内联编辑行：挂在目标组顶部。 */}
            {creatingIn && (
              <div className="px-1 py-0.5">
                <GroupInlineInput
                  inputRef={createInputRef}
                  value={newTitle}
                  onChange={setNewTitle}
                  onSubmit={() => commitCreate(creatingIn)}
                  onCancel={() => {
                    setCreatingIn(null)
                    setNewTitle('')
                  }}
                  onKeyDown={handleCreateKeyDown}
                  placeholder={'输入板块标题…'}
                />
              </div>
            )}

            {groups.map((group) => {
              const isCollapsed = collapsed.has(group.kind)
              return (
                <div key={group.kind} className="px-1 py-0.5">
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.kind)}
                    aria-expanded={!isCollapsed}
                    className="flex h-8 w-full items-center gap-1.5 rounded-md px-2 text-[13px] font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-foreground/10"
                  >
                    <ChevronRight
                      className={cn(
                        'size-4 shrink-0 text-muted-foreground transition-transform duration-150 ease-out',
                        !isCollapsed && 'rotate-90'
                      )}
                    />
                    <group.icon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 text-left">
                      {group.label}
                    </span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {group.items.length}
                    </span>
                  </button>

                  {!isCollapsed && (
                    <div className="mt-0.5 space-y-0.5">
                      {group.items.map((page) => {
                        const ItemIcon = PAGE_ICON[page.kind]
                        const isRenamingThis = renaming?.id === page.id
                        return (
                          <div
                            key={page.id}
                            className="group flex h-8 items-center rounded-md pr-1 pl-2 transition-colors hover:bg-muted"
                          >
                            <button
                              type="button"
                              onClick={() => onOpenPage(page.id)}
                              className="flex h-full min-w-0 flex-1 items-center gap-2 text-left focus-visible:outline-none"
                            >
                              <ItemIcon className="size-4 shrink-0 text-muted-foreground" />
                              <span className="truncate text-[13px] text-foreground">
                                {page.title}
                              </span>
                            </button>

                            <div className="opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                              <ActionMenu
                                width="sm"
                                onContentClick={(event) =>
                                  event.stopPropagation()
                                }
                                trigger={
                                  <button
                                    type="button"
                                    aria-label={`「板块操作」${page.title}`}
                                    onClick={(event) =>
                                      event.stopPropagation()
                                    }
                                    className="flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                                  >
                                    <Ellipsis className="size-4" />
                                  </button>
                                }
                              >
                                <ActionMenuItem
                                  icon={Pencil}
                                  label={'重命名'}
                                  onSelect={() => startRename(page)}
                                />
                                <ActionMenuItem
                                  icon={Trash2}
                                  label={'删除'}
                                  destructive
                                  onSelect={() => deletePage.mutate(page.id)}
                                />
                              </ActionMenu>
                            </div>

                            {isRenamingThis && (
                              <GroupInlineInput
                                inputRef={renameInputRef}
                                value={renameTitle}
                                onChange={setRenameTitle}
                                onSubmit={commitRename}
                                onCancel={() => setRenaming(null)}
                                onKeyDown={handleRenameKeyDown}
                                placeholder={page.title}
                              />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </aside>
  )
}

function GroupInlineInput({
  inputRef,
  value,
  onChange,
  onSubmit,
  onCancel,
  onKeyDown,
  placeholder,
}: {
  inputRef: Ref<HTMLInputElement>
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  onCancel: () => void
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
  placeholder: string
}) {

  // 两个按钮都 preventDefault 掉 mousedown：否则点击会让输入框先失焦触发 onBlur，
  // 把提交/取消抢在前面，按钮永远点不中。
  return (
    <div className="flex items-center gap-1.5 rounded-md border border-zinc-200 bg-background px-2 py-1">
      <input
        ref={inputRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={onCancel}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-6 min-w-0 flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-zinc-400"
      />
      <button
        type="button"
        onClick={onSubmit}
        onMouseDown={(event) => event.preventDefault()}
        aria-label={'确认'}
        className="flex size-5 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-colors hover:opacity-90"
      >
        <ChevronRight className="size-3" />
      </button>
      <button
        type="button"
        onClick={onCancel}
        onMouseDown={(event) => event.preventDefault()}
        aria-label={'取消'}
        className="flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X className="size-3" />
      </button>
    </div>
  )
}