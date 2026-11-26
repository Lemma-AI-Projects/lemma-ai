import { useRef, type ReactNode } from 'react'

import { InputAddMenu } from '@/components/InputAddMenu'
import { ComposerAttachCascadeMenu } from '@/features/home/composer/ComposerAttachCascadeMenu'
import { ComposerAttachFanout } from '@/features/home/composer/ComposerAttachFanout'
import { ComposerAttachPanesPanel } from '@/features/home/composer/ComposerAttachPanesPanel'
import { ComposerAttachSearchPanel } from '@/features/home/composer/ComposerAttachSearchPanel'
import { type ComposerAttachMenuProps } from '@/features/home/composer/composerAttachments'

// 输入框左下角加号的候选样式：
// - legacy：现状。原来的加号菜单，里面混着传文件、上下文开关、联网开关和工具；
// - cascade：分级菜单。一层列来源，资料在各自的二级菜单里；
// - search：搜索面板。一个搜索框加一个列表，所有来源的资料在同一层；
// - panes：分栏面板。顶上一个搜索框，左边来源、右边资料，同时可见；
// - fanout：展开胶囊。不弹菜单，来源直接在输入框底部这一行滑出来。
// 后四种都只做「附参考资料」一件事。
export type ComposerAttachMenuVariant =
  | 'legacy'
  | 'cascade'
  | 'search'
  | 'panes'
  | 'fanout'

const VARIANT_MENUS: Record<
  Exclude<ComposerAttachMenuVariant, 'legacy'>,
  (props: ComposerAttachMenuProps) => ReactNode
> = {
  cascade: ComposerAttachCascadeMenu,
  search: ComposerAttachSearchPanel,
  panes: ComposerAttachPanesPanel,
  fanout: ComposerAttachFanout,
}

// 输入框左下角的加号：给这次对话附上参考资料，具体长什么样由 `variant` 决定。
// 选文件用的是系统自带的窗口，那个看不见的 <input type="file"> 放在这里，各种样式共用。
export function ComposerAttachMenu({
  variant,
  ...props
}: Omit<ComposerAttachMenuProps, 'onPickFiles'> & {
  variant: ComposerAttachMenuVariant
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (variant === 'legacy') {
    return <InputAddMenu menuAlignOffset={-14} />
  }

  const Menu = VARIANT_MENUS[variant]

  return (
    <>
      <Menu {...props} onPickFiles={() => fileInputRef.current?.click()} />
      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        tabIndex={-1}
        onChange={(event) => {
          const files = Array.from(event.target.files ?? [])
          if (files.length > 0) {
            props.onAddFiles(files)
          }
          // 清空选择，下次再选同一个文件也会触发 change。
          event.target.value = ''
        }}
      />
    </>
  )
}
