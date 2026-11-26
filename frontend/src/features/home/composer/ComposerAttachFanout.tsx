import { useId, useState, type ComponentProps } from 'react'
import { Paperclip, type LucideIcon } from 'lucide-react'

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
} from '@/features/home/composer/composerAttachments'
import { useStayPutWhileHovered } from '@/features/home/composer/useStayPutWhileHovered'
import { cn } from '@/lib/utils'

// 从加号里滑出来的一个来源。
function FanoutPill({
  children,
  className,
  icon: Icon,
  ...props
}: ComponentProps<'button'> & { icon: LucideIcon }) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[13.5px] leading-5 whitespace-nowrap text-zinc-600 outline-none transition-colors hover:bg-zinc-100 hover:text-zinc-950 focus-visible:bg-zinc-100 focus-visible:text-zinc-950 data-[state=open]:bg-zinc-100 data-[state=open]:text-zinc-950',
        className
      )}
    >
      <Icon className="size-4 shrink-0" />
      {children}
    </button>
  )
}

// 加号菜单（展开胶囊）：点加号不弹菜单，几个来源直接在输入框底部这一行从加号里滑出来；
// 再点加号（这时是个叉）收回去。「文件」一点就打开选文件窗口，其它来源点开是各自的一小张列表。
// 少一层浮层：一眼看到能附什么，传文件只要两下。
export function ComposerAttachFanout({
  attachments,
  library,
  onPickFiles,
  onToggle,
}: ComposerAttachMenuProps) {
  const sourcesId = useId()
  const [open, setOpen] = useState(false)
  const stayPut = useStayPutWhileHovered()
  const attachedIds = new Set(attachments.map((attachment) => attachment.id))

  return (
    <div className="flex items-center">
      <ComposerAttachTrigger
        aria-expanded={open}
        aria-controls={sourcesId}
        data-state={open ? 'open' : 'closed'}
        onClick={() => setOpen((current) => !current)}
      />
      {/* 宽度从 0 过渡到内容宽度（网格的 0fr → 1fr）；收起时整组不可聚焦、不可点。 */}
      <div
        id={sourcesId}
        inert={!open}
        className={cn(
          'grid transition-[grid-template-columns,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
          open ? 'grid-cols-[1fr] opacity-100' : 'grid-cols-[0fr] opacity-0'
        )}
      >
        <div className="flex min-w-0 items-center gap-0.5 overflow-hidden pl-1.5">
          <FanoutPill icon={Paperclip} onClick={onPickFiles}>
            文件
          </FanoutPill>
          {COMPOSER_LIBRARY_KINDS.map(({ kind, label, short, Icon }) => {
            const items = listLibraryAttachments(library, kind)

            return (
              <Popover key={kind}>
                <PopoverTrigger asChild>
                  <FanoutPill icon={Icon} aria-label={label}>
                    {short}
                  </FanoutPill>
                </PopoverTrigger>
                <PopoverContent
                  side="top"
                  align="start"
                  sideOffset={8}
                  aria-label={label}
                  className="w-fit max-w-56 min-w-40 rounded-lg p-1 shadow-none"
                  {...stayPut}
                >
                  {items.length === 0 ? (
                    <ComposerAttachEmptyRow />
                  ) : (
                    // 最多露出六行半，再多就在卡片里滚动。
                    <ComposerAttachScrollArea className="max-h-[214px]">
                      {items.map((item) => (
                        <ComposerAttachItemRow
                          key={item.id}
                          attachment={item}
                          attached={attachedIds.has(item.id)}
                          onClick={() => onToggle(item)}
                        />
                      ))}
                    </ComposerAttachScrollArea>
                  )}
                </PopoverContent>
              </Popover>
            )
          })}
        </div>
      </div>
    </div>
  )
}
