import { useRef, useState, type KeyboardEvent } from 'react'
import { Paperclip, Search } from 'lucide-react'

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  ComposerAttachItemRow,
  ComposerAttachScrollArea,
  ComposerAttachTrigger,
} from '@/features/home/composer/ComposerAttachParts'
import {
  COMPOSER_LIBRARY_KINDS,
  listLibraryAttachments,
  type ComposerAttachMenuProps,
} from '@/features/home/composer/composerAttachments'
import { COMPOSER_MENU_ROW_CLASS_NAME } from '@/features/home/composer/composerMenuStyles'
import { useStayPutWhileHovered } from '@/features/home/composer/useStayPutWhileHovered'
import { cn } from '@/lib/utils'

// 加号菜单（搜索面板）：一个搜索框加一个列表，所有来源的资料都在这一层，
// 靠每行前面的图标区分来源；打字就筛选，不用先想「它在哪一类」。
// 全程可以只用键盘：上下键移动，回车附上或取消，最后一行固定是「上传文件」。
export function ComposerAttachSearchPanel({
  attachments,
  library,
  onPickFiles,
  onToggle,
}: ComposerAttachMenuProps) {
  const rowsRef = useRef<HTMLDivElement>(null)
  const stayPut = useStayPutWhileHovered()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  const attachedIds = new Set(attachments.map((attachment) => attachment.id))
  const keyword = query.trim().toLowerCase()
  const results = COMPOSER_LIBRARY_KINDS.flatMap(({ kind }) =>
    listLibraryAttachments(library, kind)
  ).filter((item) => keyword === '' || item.title.toLowerCase().includes(keyword))
  // 资料之后还有固定的一行「上传文件」，它的序号就是 results.length。
  const uploadIndex = results.length
  const active = Math.min(activeIndex, uploadIndex)

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setQuery('')
      setActiveIndex(0)
    }
    setOpen(next)
  }

  const pickFiles = () => {
    setOpen(false)
    onPickFiles()
  }

  const moveActive = (delta: number) => {
    const rowCount = uploadIndex + 1
    const next = (active + delta + rowCount) % rowCount
    setActiveIndex(next)
    rowsRef.current
      ?.querySelector(`[data-row-index="${next}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // 输入法还在选字时，上下键和回车是给输入法用的。
    if (event.nativeEvent.isComposing) {
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      moveActive(event.key === 'ArrowDown' ? 1 : -1)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (active === uploadIndex) {
        pickFiles()
      } else {
        onToggle(results[active])
      }
    }
  }

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
        className="w-64 rounded-lg p-1 shadow-none"
        {...stayPut}
      >
        <label className="flex h-8 items-center gap-2 rounded-sm bg-zinc-100 px-2">
          <Search className="size-4 shrink-0 text-zinc-400" />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setActiveIndex(0)
            }}
            onKeyDown={handleKeyDown}
            placeholder="搜索课程、练习、资料"
            aria-label="搜索参考资料"
            className="min-w-0 flex-1 bg-transparent text-[14px] text-zinc-950 outline-none placeholder:text-zinc-400"
          />
        </label>

        <div ref={rowsRef} className="pt-1">
          {/* 最多露出六行半（每行 33px），再多就在这一块里滚动。 */}
          <ComposerAttachScrollArea className="max-h-[214px]">
            {results.map((item, index) => (
              <ComposerAttachItemRow
                key={item.id}
                attachment={item}
                attached={attachedIds.has(item.id)}
                active={index === active}
                showIcon
                // 键盘操作都在搜索框里完成，行本身不进 Tab 顺序。
                tabIndex={-1}
                data-row-index={index}
                onMouseMove={() => setActiveIndex(index)}
                onClick={() => onToggle(item)}
              />
            ))}
            {results.length === 0 && (
              <p className="px-2 py-1.5 text-[14px] leading-5 text-zinc-500">
                没有找到相关的资料
              </p>
            )}
          </ComposerAttachScrollArea>
          <button
            type="button"
            tabIndex={-1}
            data-row-index={uploadIndex}
            onMouseMove={() => setActiveIndex(uploadIndex)}
            onClick={pickFiles}
            className={cn(
              COMPOSER_MENU_ROW_CLASS_NAME,
              'mt-1',
              active === uploadIndex && 'bg-accent'
            )}
          >
            <Paperclip className="size-4 shrink-0 text-zinc-500" />
            上传文件
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
