import { useRef, useState, type DragEvent, type KeyboardEvent } from 'react'
import { Paperclip, Search, Upload, type LucideIcon } from 'lucide-react'

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  ComposerAttachEmptyRow,
  ComposerAttachItemRow,
  ComposerAttachScrollArea,
  ComposerAttachTrigger,
} from '@/features/home/composer/ComposerAttachParts'
import {
  COMPOSER_LIBRARY_KINDS,
  listLibraryAttachments,
  type ComposerAttachMenuProps,
  type ComposerAttachSearchLayout,
  type ComposerAttachmentKind,
} from '@/features/home/composer/composerAttachments'
import { useStayPutWhileHovered } from '@/features/home/composer/useStayPutWhileHovered'
import { cn } from '@/lib/utils'

// 右栏的高度固定：切换来源、搜索时面板不会忽高忽低，资料多了在右栏里滚动。
// 正好露出六行半（每行 33px、行间 2px、上下各 4px 内边距），半行提示下面还有。
const PANE_HEIGHT_CLASS_NAME = 'h-[234px]'

// 搜索框和下面两栏怎么分开（候选，供 Sandbox 对比）。每一种都不用分割线：
// - plain：现状。搜索框不垫底色，图标和来源的图标在同一条竖线上，容易和来源那一列连成一片；
// - field：搜索框垫一层很浅的灰，是一个看得出边界的输入框；
// - column：搜索框归右栏。左边来源从顶上排起，右边是「搜索框 + 资料」，搜索框不再压在来源上面；
// - column-field：归右栏和垫底色合在一起。搜索框在右栏顶上，同时垫一层很浅的灰；
// - band：顶上一条通栏的浅色带，贴着面板的上沿和左右两边，像一条标题栏。
const SEARCH_FIELD_CLASS_NAME: Record<ComposerAttachSearchLayout, string> = {
  plain: 'flex h-8 items-center gap-2.5 px-2',
  field: 'flex h-8 items-center gap-2.5 rounded-sm bg-zinc-100 px-2',
  // 文字起点和右栏里资料的文字对齐（右栏内边距 4px + 行内边距 8px）。
  column: 'flex h-8 shrink-0 items-center gap-2.5 px-3',
  'column-field': 'flex h-8 shrink-0 items-center gap-2.5 rounded-sm bg-zinc-100 px-3',
  // 用负外边距抵掉面板的内边距，上面两个角跟面板的内圆角一致。
  band: '-mx-1 -mt-1 flex h-10 items-center gap-2.5 rounded-t-[calc(var(--radius)-1px)] bg-zinc-100/80 px-3',
}

const PANES: { kind: ComposerAttachmentKind; label: string; Icon: LucideIcon }[] = [
  { kind: 'file', label: '上传文件', Icon: Paperclip },
  ...COMPOSER_LIBRARY_KINDS,
]

// 加号菜单（分栏面板）：顶上一个搜索框，下面左边一列来源、右边是资料。
//
// 两种用法合在一张面板里：
// - 浏览：鼠标移到哪个来源，右栏就列出那个来源下的资料。来源和资料同时可见，
//   不用像分级菜单那样一层层展开再收起；
// - 搜索：一打字，右栏变成所有来源里匹配的资料，每行前面的图标标明来源，这时左边
//   没有哪个来源被选中；再把鼠标移到某个来源上，就只看那个来源里匹配的。
// 打开时焦点在搜索框里，可以只用键盘：上下键在右栏的资料里移动，回车附上或取消。
//
// 右栏是一块浅灰面板，已附上的资料是白片，和排期菜单是同一套配色；
// 左边选中的来源和右栏同色，看上去是连着的一块。
export function ComposerAttachPanesPanel({
  attachments,
  library,
  onAddFiles,
  onPickFiles,
  onToggle,
  searchLayout = 'plain',
}: ComposerAttachMenuProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const paneRef = useRef<HTMLDivElement>(null)
  const stayPut = useStayPutWhileHovered()
  // 搜索框是不是放在右栏顶上（而不是通栏压在两栏上面）。
  const searchInRightColumn =
    searchLayout === 'column' || searchLayout === 'column-field'
  const [open, setOpen] = useState(false)
  // 每次打开都停在「上传文件」。
  const [pane, setPane] = useState<ComposerAttachmentKind>('file')
  const [query, setQuery] = useState('')
  // 打字之后先搜全部来源；指到某个来源上之后，只看那个来源。
  const [searchEverywhere, setSearchEverywhere] = useState(true)
  // 键盘或鼠标停在右栏的第几行；-1 表示哪一行都没停。
  const [activeIndex, setActiveIndex] = useState(-1)
  const [dragOver, setDragOver] = useState(false)

  const attachedIds = new Set(attachments.map((attachment) => attachment.id))
  const keyword = query.trim().toLowerCase()
  const searching = keyword !== ''
  // 每个来源下（符合搜索词的）资料。
  const groups = COMPOSER_LIBRARY_KINDS.map(({ kind }) => ({
    kind,
    items: listLibraryAttachments(library, kind).filter(
      (item) => !searching || item.title.toLowerCase().includes(keyword)
    ),
  }))
  const showEverywhere = searching && searchEverywhere
  // 左边选中的来源；搜全部来源时没有。
  const selectedKind = showEverywhere ? null : pane
  const items = showEverywhere
    ? groups.flatMap((group) => group.items)
    : (groups.find((group) => group.kind === pane)?.items ?? [])
  const showUpload = selectedKind === 'file'
  // 搜索时默认停在第一条结果上，回车就能直接附上。
  const active = Math.min(
    searching ? Math.max(activeIndex, 0) : activeIndex,
    items.length - 1
  )

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setPane('file')
      setQuery('')
      setSearchEverywhere(true)
      setActiveIndex(-1)
    }
    setOpen(next)
  }

  const selectPane = (kind: ComposerAttachmentKind) => {
    setPane(kind)
    setSearchEverywhere(false)
    setActiveIndex(-1)
  }

  const pickFiles = () => {
    setOpen(false)
    onPickFiles()
  }

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault()
    setDragOver(false)
    const files = Array.from(event.dataTransfer.files)
    if (files.length > 0) {
      onAddFiles(files)
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // 输入法还在选字时，上下键和回车是给输入法用的。
    if (event.nativeEvent.isComposing) {
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (items.length === 0) {
        return
      }
      event.preventDefault()
      const delta = event.key === 'ArrowDown' ? 1 : -1
      const next =
        active < 0
          ? delta > 0
            ? 0
            : items.length - 1
          : (active + delta + items.length) % items.length
      setActiveIndex(next)
      paneRef.current
        ?.querySelector(`[data-row-index="${next}"]`)
        ?.scrollIntoView({ block: 'nearest' })
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (showUpload) {
        pickFiles()
      } else if (active >= 0) {
        onToggle(items[active])
      }
    }
  }

  const searchField = (
    <label className={SEARCH_FIELD_CLASS_NAME[searchLayout]}>
      <Search className="size-4 shrink-0 text-zinc-400" />
      <input
        ref={inputRef}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value)
          setSearchEverywhere(true)
          setActiveIndex(-1)
        }}
        onKeyDown={handleKeyDown}
        placeholder="搜索课程、练习、资料"
        aria-label="搜索参考资料"
        className="min-w-0 flex-1 bg-transparent text-[14px] text-zinc-950 outline-none placeholder:text-zinc-400"
      />
    </label>
  )

  const sourceRail = (
    <div
      role="tablist"
      aria-orientation="vertical"
      aria-label="资料来源"
      className="flex w-[144px] shrink-0 flex-col"
    >
      {PANES.map(({ kind, label, Icon }) => {
        const attachedCount = attachments.filter(
          (item) => item.kind === kind
        ).length
        // 搜索时，没有匹配结果的来源变淡。
        const noMatch =
          searching &&
          kind !== 'file' &&
          groups.find((group) => group.kind === kind)?.items.length === 0

        return (
          <button
            key={kind}
            type="button"
            role="tab"
            aria-selected={selectedKind === kind}
            // 指到或聚焦到一个来源就切过去；「上传文件」本身点一下就是选文件。
            onMouseEnter={() => selectPane(kind)}
            onFocus={() => selectPane(kind)}
            onClick={kind === 'file' ? pickFiles : undefined}
            className={cn(
              'flex w-full cursor-default items-center gap-2.5 rounded-sm px-2 py-1.5 text-[14px] text-zinc-950 outline-hidden transition-colors select-none',
              selectedKind === kind && 'bg-zinc-200/60',
              noMatch && selectedKind !== kind && 'text-zinc-400'
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate text-left">{label}</span>
            {/* 这个来源下已经附了几份。 */}
            {attachedCount > 0 && (
              <span className="text-xs text-zinc-500 tabular-nums">
                {attachedCount}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )

  const resultPane = (
    <div
      ref={paneRef}
      role="tabpanel"
      className="h-full min-w-0 flex-1 rounded-sm bg-zinc-200/60"
    >
      {showUpload ? (
        <div className="size-full p-1">
          <button
            type="button"
            onClick={pickFiles}
            onDragOver={(event) => {
              event.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={cn(
              'flex size-full flex-col items-center justify-center gap-2 rounded-sm text-[14px] leading-5 text-zinc-600 outline-none transition-colors hover:bg-white/50 hover:text-zinc-950 focus-visible:bg-white/50',
              dragOver && 'bg-white text-zinc-950'
            )}
          >
            <Upload className="size-5" />
            选择文件，或拖到这里
          </button>
        </div>
      ) : (
        // 换了来源或搜索词就换一个新的滚动区，列表回到顶部。
        <ComposerAttachScrollArea
          key={`${selectedKind ?? 'everywhere'}:${keyword}`}
          // 行与行之间留 2px：相邻的几份都附上时，白片各是各的，不会连成一整块。
          className="flex h-full flex-col gap-0.5 p-1"
        >
          {items.map((item, index) => {
            const attached = attachedIds.has(item.id)

            return (
              <ComposerAttachItemRow
                key={item.id}
                attachment={item}
                attached={attached}
                // 所有来源混在一起时，用图标标明每一条是哪来的。
                showIcon={showEverywhere}
                data-row-index={index}
                onMouseMove={() => setActiveIndex(index)}
                onClick={() => onToggle(item)}
                // 高亮只跟着 active 走（鼠标一动就会更新它），不用 CSS 的 :hover：
                // 不然鼠标停着不动、键盘在另一行时，会同时亮两行。
                className={cn(
                  'shrink-0 hover:bg-transparent focus-visible:bg-white/50',
                  index === active && 'bg-white/50 hover:bg-white/50',
                  attached && 'bg-white hover:bg-white focus-visible:bg-white/70',
                  attached && index === active && 'bg-white/70 hover:bg-white/70'
                )}
              />
            )
          })}
          {items.length === 0 &&
            (searching ? (
              <p className="px-2 py-1.5 text-[14px] leading-5 text-zinc-500">
                没有找到相关的资料
              </p>
            ) : (
              <ComposerAttachEmptyRow />
            ))}
        </ComposerAttachScrollArea>
      )}
    </div>
  )

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <ComposerAttachTrigger />
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        alignOffset={-14}
        sideOffset={8}
        aria-label="附上参考资料"
        // 打开时光标直接进搜索框（「归右栏」那种布局里，搜索框不是面板里的第一个可聚焦元素）。
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          inputRef.current?.focus()
        }}
        className="w-[364px] rounded-lg p-1 shadow-none"
        {...stayPut}
      >
        {searchInRightColumn ? (
          // 搜索框归右栏：左边来源从顶上排起，右边是「搜索框 + 资料」。
          <div className="flex gap-1">
            {sourceRail}
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              {searchField}
              <div className={PANE_HEIGHT_CLASS_NAME}>{resultPane}</div>
            </div>
          </div>
        ) : (
          <>
            {searchField}
            <div className={cn('mt-1 flex gap-1', PANE_HEIGHT_CLASS_NAME)}>
              {sourceRail}
              {resultPane}
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
