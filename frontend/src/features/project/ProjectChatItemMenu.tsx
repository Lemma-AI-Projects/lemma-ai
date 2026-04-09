import {
  Archive,
  ChevronRight,
  Ellipsis,
  Folder,
  FolderInput,
  FolderMinus,
  FolderPlus,
  type LucideIcon,
  Pencil,
  Share,
  Trash2,
} from 'lucide-react'
import { DropdownMenu as DropdownMenuPrimitive } from 'radix-ui'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { projectItems } from '@/mock/projectItems'

const itemCls =
  'relative flex cursor-default items-center gap-2 rounded-md px-2 py-2 text-[14px] text-foreground outline-hidden select-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-accent data-[highlighted]:text-foreground'
const panelCls =
  'z-50 w-48 overflow-hidden rounded-md border bg-popover p-1.5 text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2'

function Item({ icon: Icon, label, destructive, onSelect }: {
  icon: LucideIcon; label: string; destructive?: boolean; onSelect: () => void
}) {
  return (
    <DropdownMenuPrimitive.Item
      className={cn(itemCls, destructive && 'text-destructive data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive')}
      onSelect={onSelect}
    >
      <Icon className="ml-0.5 size-[17px] shrink-0 text-inherit" />
      <span>{label}</span>
    </DropdownMenuPrimitive.Item>
  )
}

export function ProjectChatItemMenu({ chatId, projectName }: { chatId: string; projectName: string }) {
  const log = (action: string) => console.log(action, chatId)

  const topItems: { icon: LucideIcon; label: string }[] = [
    { icon: Share, label: 'Share' },
    { icon: Pencil, label: 'Rename' },
  ]

  const bottomItems: { icon: LucideIcon; label: string; destructive?: boolean }[] = [
    { icon: FolderMinus, label: `Remove from ${projectName}` },
    { icon: Archive, label: 'Archive' },
    { icon: Trash2, label: 'Delete', destructive: true },
  ]

  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger asChild>
        <Button variant="ghost" size="icon-xs" aria-label="More actions" onClick={(e) => e.stopPropagation()}>
          <Ellipsis className="size-5" />
        </Button>
      </DropdownMenuPrimitive.Trigger>

      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          align="end" sideOffset={8}
          onCloseAutoFocus={(e) => e.preventDefault()}
          onClick={(e) => e.stopPropagation()}
          className={panelCls}
        >
          {topItems.map((i) => <Item key={i.label} {...i} onSelect={() => log(i.label)} />)}

          <DropdownMenuPrimitive.Sub>
            <DropdownMenuPrimitive.SubTrigger className={itemCls}>
              <FolderInput className="ml-0.5 size-[17px] shrink-0 text-inherit" />
              <span>Move to Project</span>
              <ChevronRight className="ml-auto translate-x-0.5 size-[19px] text-inherit" />
            </DropdownMenuPrimitive.SubTrigger>
            <DropdownMenuPrimitive.Portal>
              <DropdownMenuPrimitive.SubContent sideOffset={8} className={panelCls}>
                <Item icon={FolderPlus} label="New Project" onSelect={() => log('New Project')} />
                <DropdownMenuPrimitive.Separator className="mx-2 my-1 h-px bg-border" />
                {projectItems.map((p) => (
                  <Item key={p.label} icon={Folder} label={p.label} onSelect={() => log(p.label)} />
                ))}
              </DropdownMenuPrimitive.SubContent>
            </DropdownMenuPrimitive.Portal>
          </DropdownMenuPrimitive.Sub>

          {bottomItems.map((i) => <Item key={i.label} {...i} onSelect={() => log(i.label)} />)}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  )
}
