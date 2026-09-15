import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type Ref,
} from 'react'
import {
  Archive,
  ChevronRight,
  Ellipsis,
  FileText,
  Folder,
  LayoutGrid,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
  type LucideIcon,
} from 'lucide-react'
import { ActionMenu, ActionMenuItem } from '@/components/ActionMenu'
import { useAppTranslation } from '@/i18n'
import type { TranslationKey } from '@/i18n/keys'
import { cn } from '@/lib/utils'
import {
  useCreatePageMutation,
  useDeletePageMutation,
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
  /**
   * 「导入」入口。**不给就保持禁用** —— 导入还没接后端时，
   * 一个点开却什么都做不了的向导，比一个禁用按钮更糟。
   */
  onImport?: () => void
  className?: string
}

interface GroupDef {
  kind: PageKind
  icon: LucideIcon
  labelKey: TranslationKey
}

const PAGE_ICON: Record<PageKind, LucideIcon> = {
  note: FileText,
  canvas: LayoutGrid,
  imported: Archive,
  folder: Folder,
}

const GROUPS: GroupDef[] = [
  { kind: 'note', icon: FileText, labelKey: 'workspace.shelterGroupNotes' },
  { kind: 'canvas', icon: LayoutGrid, labelKey: 'workspace.shelterGroupCanvases' },
  { kind: 'imported', icon: Archive, labelKey: 'workspace.shelterGroupImported' },
  { kind: 'folder', icon: Folder, labelKey: 'workspace.shelterGroupFolders' },
]

/**
 * 左侧板块抽屉（learn space 的内容面，与右侧 ConversationPanel 对称）。
 *
 * 按 pages.kind 分组为可折叠 submenu；组内右键新建/重命名/删除。空组不渲染，
 * 全部为空或 API 不可用（门控关闭/未迁移）时退化为同一空态 —— 两项都意味着
 * 「还没有板块」，不把「未启用」伪装成别的。
 */
export function ShelterDrawer({
  projectId,
  onClose,
  onOpenPage,
  onImport,
  className,
}: ShelterDrawerProps) {
  const { t } = useAppTranslation()
  const pagesQuery = useProjectPagesQuery(projectId)
  const createPage = useCreatePageMutation(projectId)
  const renamePage = useRenamePageMutation(projectId)
  const deletePage = useDeletePageMutation(projectId)

  const [collapsed, setCollapsed] = useState<ReadonlySet<PageKind>>(new Set())
  const [creatingIn, setCreatingIn] = useState<PageKind | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [renaming, setRenaming] = useState<DocPage | null>(null)
  const [renameTitle, setRenameTitle] = useState('')

  const createInputRef = useRef<HTMLInputElement>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)

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

  const groups = useMemo(
    () =>
      GROUPS.map((group) => ({
        ...group,
        items: pages.filter((page) => page.kind === group.kind),
      })).filter((group) => group.items.length > 0),
    [pages]
  )
  // 全空 或 仍未取到数据（加载/失败都被当作「还没有板块」的空态）。
  const isEmpty = pagesQuery.isError || (pages.length === 0 && !pagesQuery.isPending)

  return (
    <aside
      className={cn(
        'flex w-72 shrink-0 flex-col overflow-hidden rounded-2xl border border-border bg-background',
        className
      )}
    >
      <header className="flex h-11 shrink-0 items-center justify-between pl-5 pr-2">
        <h2 className="text-sm font-medium text-foreground">
          {t('workspace.shelterTitle')}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('workspace.shelterClose')}
          title={t('workspace.shelterClose')}
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
          aria-label={t('workspace.shelterNewNote')}
          className="flex h-8 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full bg-foreground px-3 text-[13px] font-medium text-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-foreground/20 disabled:cursor-default disabled:bg-zinc-200"
        >
          <Plus className="size-4" />
          <span className="truncate">{t('workspace.shelterNewNote')}</span>
        </button>
        <button
          type="button"
          onClick={onImport}
          disabled={!onImport}
          aria-label={t('workspace.shelterImport')}
          title={t('workspace.shelterImport')}
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-full border border-zinc-200 text-muted-foreground transition-colors',
            onImport
              ? 'hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-foreground/10 focus-visible:outline-none'
              : 'disabled:cursor-default disabled:text-zinc-400'
          )}
        >
          <Upload className="size-4" />
        </button>
      </div>

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
        ) : isEmpty ? (
          <div className="mx-2 mt-1 flex flex-col items-center gap-1 rounded-lg border border-dashed border-zinc-300 bg-transparent px-3 py-6 text-center">
            <FileText className="size-5 text-zinc-300" strokeWidth={1.5} />
            <p className="text-[13px] text-muted-foreground">
              {t('workspace.shelterEmpty')}
            </p>
            <p className="text-xs text-muted-foreground/80">
              {t('workspace.shelterEmptyHint')}
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
                  placeholder={t('workspace.shelterCreatePlaceholder')}
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
                      {t(group.labelKey)}
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
                                    aria-label={`${t('workspace.shelterMoreActions')}${page.title}`}
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
                                  label={t('workspace.shelterRename')}
                                  onSelect={() => startRename(page)}
                                />
                                <ActionMenuItem
                                  icon={Trash2}
                                  label={t('workspace.shelterDelete')}
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
  const { t } = useAppTranslation()

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
        aria-label={t('workspace.shelterConfirm')}
        className="flex size-5 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-colors hover:opacity-90"
      >
        <ChevronRight className="size-3" />
      </button>
      <button
        type="button"
        onClick={onCancel}
        onMouseDown={(event) => event.preventDefault()}
        aria-label={t('workspace.shelterCancel')}
        className="flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X className="size-3" />
      </button>
    </div>
  )
}