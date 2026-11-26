import { Check, Paperclip } from 'lucide-react'

import { InputMenu, InputMenuItem, InputMenuSub } from '@/components/InputMenu'
import { ComposerAttachTrigger } from '@/features/home/composer/ComposerAttachParts'
import {
  COMPOSER_LIBRARY_KINDS,
  listLibraryAttachments,
  type ComposerAttachMenuProps,
} from '@/features/home/composer/composerAttachments'

// 加号菜单（分级菜单）：一层只列来源，每个来源的资料收在各自的二级菜单里。
// 和原来的加号菜单是同一种形式，只是内容换成了「附资料」这一件事。
// 在二级菜单里点一份资料不会关掉菜单，可以连着勾好几份。
export function ComposerAttachCascadeMenu({
  attachments,
  library,
  onPickFiles,
  onToggle,
}: ComposerAttachMenuProps) {
  const attachedIds = new Set(attachments.map((attachment) => attachment.id))

  return (
    <InputMenu
      alignOffset={-14}
      contentClassName="w-44 min-w-0 rounded-lg"
      trigger={<ComposerAttachTrigger />}
    >
      <InputMenuItem icon={Paperclip} label="上传文件" onSelect={onPickFiles} />
      {COMPOSER_LIBRARY_KINDS.map(({ kind, label, Icon }) => {
        const items = listLibraryAttachments(library, kind)

        return (
          <InputMenuSub
            key={kind}
            icon={Icon}
            label={label}
            // 资料多的时候二级菜单限高，在菜单里滚动。
            contentClassName="scrollbar-hidden max-h-[240px] overflow-y-auto"
          >
            {items.length === 0 ? (
              <InputMenuItem disabled label="这里还没有内容" />
            ) : (
              items.map((item) => (
                <InputMenuItem
                  key={item.id}
                  onSelect={(event) => {
                    event.preventDefault()
                    onToggle(item)
                  }}
                >
                  <span className="min-w-0 flex-1 truncate">{item.title}</span>
                  {attachedIds.has(item.id) && (
                    <Check className="size-4 shrink-0 text-foreground" />
                  )}
                </InputMenuItem>
              ))
            )}
          </InputMenuSub>
        )
      })}
    </InputMenu>
  )
}
