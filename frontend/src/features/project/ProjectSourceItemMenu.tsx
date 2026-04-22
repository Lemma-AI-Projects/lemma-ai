import {
  Download,
  Ellipsis,
  type LucideIcon,
  Pencil,
  Trash2,
} from 'lucide-react'
import { DropdownMenu as DropdownMenuPrimitive } from 'radix-ui'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const itemCls =
  'relative flex cursor-default items-center gap-2 rounded-md px-2 py-2 text-[14px] text-foreground outline-hidden select-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-accent data-[highlighted]:text-foreground'
const panelCls =
  'z-50 w-44 overflow-hidden rounded-md border bg-popover p-1.5 text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2'

function Item({
  icon: Icon,
  label,
  destructive,
  onSelect,
}: {
  icon: LucideIcon
  label: string
  destructive?: boolean
  onSelect: () => void
}) {
  return (
    <DropdownMenuPrimitive.Item
      className={cn(
        itemCls,
        destructive &&
          'text-destructive data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive'
      )}
      onSelect={onSelect}
    >
      <Icon className="ml-0.5 size-[17px] shrink-0 text-inherit" />
      <span>{label}</span>
    </DropdownMenuPrimitive.Item>
  )
}

export function ProjectSourceItemMenu({ sourceId }: { sourceId: string }) {
  const log = (action: string) => console.log(action, sourceId)

  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="More actions"
          onClick={(e) => e.stopPropagation()}
        >
          <Ellipsis className="size-5" />
        </Button>
      </DropdownMenuPrimitive.Trigger>

      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          align="end"
          sideOffset={8}
          onCloseAutoFocus={(e) => e.preventDefault()}
          onClick={(e) => e.stopPropagation()}
          className={panelCls}
        >
          <Item icon={Pencil} label="Rename" onSelect={() => log('Rename')} />
          <Item
            icon={Download}
            label="Download"
            onSelect={() => log('Download')}
          />
          <Item
            icon={Trash2}
            label="Remove"
            destructive
            onSelect={() => log('Remove')}
          />
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  )
}
