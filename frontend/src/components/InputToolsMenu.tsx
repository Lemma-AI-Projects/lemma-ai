import { useState, type ComponentProps, type ReactNode } from 'react'
import {
  Blocks,
  ChevronRight,
  FileText,
  ListChecks,
  MessageCircle,
  Paperclip,
  Sparkles,
  Target,
  type LucideIcon,
} from 'lucide-react'
import { DropdownMenu as DropdownMenuPrimitive } from 'radix-ui'
import { cn } from '@/lib/utils'
import { Switch } from '@/components/ui/switch'

interface InputToolsMenuAction {
  Icon: LucideIcon
  id: string
  label: string
  onSelect?: () => void
}

interface InputToolsMenuToggle {
  Icon: LucideIcon
  defaultChecked?: boolean
  id: string
  label: string
  onCheckedChange?: (checked: boolean) => void
}

interface InputToolsMenuPlugin {
  Icon: LucideIcon
  id: string
  label: string
  onSelect?: () => void
}

interface InputToolsMenuProps {
  actions?: InputToolsMenuAction[]
  align?: ComponentProps<typeof DropdownMenuPrimitive.Content>['align']
  children: ReactNode
  plugins?: InputToolsMenuPlugin[]
  side?: ComponentProps<typeof DropdownMenuPrimitive.Content>['side']
  sideOffset?: number
  toggles?: InputToolsMenuToggle[]
}

const defaultActions: InputToolsMenuAction[] = [
  {
    Icon: Paperclip,
    id: 'add-files',
    label: 'Add photos and files',
  },
  {
    Icon: MessageCircle,
    id: 'attach-wechat',
    label: 'Attach WeChat',
  },
]

const defaultToggles: InputToolsMenuToggle[] = [
  {
    Icon: Sparkles,
    defaultChecked: true,
    id: 'include-context',
    label: 'Include context',
  },
  {
    Icon: ListChecks,
    id: 'plan-mode',
    label: 'Plan mode',
  },
  {
    Icon: Target,
    id: 'track-goal',
    label: 'Track goal',
  },
]

const defaultPlugins: InputToolsMenuPlugin[] = [
  {
    Icon: FileText,
    id: 'documents',
    label: 'Documents',
  },
]

const itemClassName =
  'flex h-8 w-full cursor-default items-center gap-2 rounded-[8px] px-2 text-left text-[13px] text-zinc-800 outline-none transition-colors select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-zinc-100 data-[state=open]:bg-zinc-100'

const contentClassName =
  'z-50 w-[236px] overflow-hidden rounded-[14px] border border-zinc-200 bg-white p-1.5 text-zinc-900 shadow-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2'

function createInitialToggleState(toggles: InputToolsMenuToggle[]) {
  return toggles.reduce<Record<string, boolean>>((state, toggle) => {
    state[toggle.id] = Boolean(toggle.defaultChecked)
    return state
  }, {})
}

export function InputToolsMenu({
  actions = defaultActions,
  align = 'start',
  children,
  plugins = defaultPlugins,
  side = 'top',
  sideOffset = 8,
  toggles = defaultToggles,
}: InputToolsMenuProps) {
  const [toggleState, setToggleState] = useState(() =>
    createInitialToggleState(toggles)
  )

  function updateToggle(toggle: InputToolsMenuToggle) {
    setToggleState((current) => {
      const nextChecked = !current[toggle.id]
      toggle.onCheckedChange?.(nextChecked)
      return {
        ...current,
        [toggle.id]: nextChecked,
      }
    })
  }

  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger asChild>
        {children}
      </DropdownMenuPrimitive.Trigger>

      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          align={align}
          side={side}
          sideOffset={sideOffset}
          className={contentClassName}
        >
          {actions.map((action) => (
            <DropdownMenuPrimitive.Item
              key={action.id}
              className={itemClassName}
              onSelect={action.onSelect}
            >
              <action.Icon className="size-[15px] shrink-0 text-zinc-500" />
              <span className="truncate">{action.label}</span>
            </DropdownMenuPrimitive.Item>
          ))}

          {toggles.length > 0 && (
            <DropdownMenuPrimitive.Separator className="mx-2 my-1.5 h-px bg-zinc-200" />
          )}

          {toggles.map((toggle) => (
            <DropdownMenuPrimitive.Item
              key={toggle.id}
              className={itemClassName}
              onSelect={(event) => {
                event.preventDefault()
                updateToggle(toggle)
              }}
            >
              <toggle.Icon className="size-[15px] shrink-0 text-zinc-500" />
              <span className="min-w-0 flex-1 truncate">{toggle.label}</span>
              <Switch
                checked={toggleState[toggle.id]}
                size="sm"
                className="pointer-events-none shadow-none data-[state=checked]:bg-zinc-900 data-[state=unchecked]:bg-zinc-200"
                aria-hidden="true"
                tabIndex={-1}
              />
            </DropdownMenuPrimitive.Item>
          ))}

          {plugins.length > 0 && (
            <>
              <DropdownMenuPrimitive.Separator className="mx-2 my-1.5 h-px bg-zinc-200" />
              <DropdownMenuPrimitive.Sub>
                <DropdownMenuPrimitive.SubTrigger className={itemClassName}>
                  <Blocks className="size-[15px] shrink-0 text-zinc-500" />
                  <span className="min-w-0 flex-1 truncate">Plugins</span>
                  <ChevronRight className="size-3.5 shrink-0 text-zinc-400" />
                </DropdownMenuPrimitive.SubTrigger>

                <DropdownMenuPrimitive.Portal>
                  <DropdownMenuPrimitive.SubContent
                    sideOffset={6}
                    className={cn(contentClassName, 'w-[216px]')}
                  >
                    <div className="px-2 pt-1 pb-1.5 text-[12px] font-medium text-zinc-400">
                      {plugins.length} installed plugins
                    </div>
                    {plugins.map((plugin) => (
                      <DropdownMenuPrimitive.Item
                        key={plugin.id}
                        className={itemClassName}
                        onSelect={plugin.onSelect}
                      >
                        <plugin.Icon className="size-[15px] shrink-0 text-zinc-500" />
                        <span className="truncate">{plugin.label}</span>
                      </DropdownMenuPrimitive.Item>
                    ))}
                  </DropdownMenuPrimitive.SubContent>
                </DropdownMenuPrimitive.Portal>
              </DropdownMenuPrimitive.Sub>
            </>
          )}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  )
}
