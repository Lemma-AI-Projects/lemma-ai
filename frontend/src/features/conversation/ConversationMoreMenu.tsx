import {
  Archive,
  ChevronRight,
  Ellipsis,
  Folder,
  FolderInput,
  FolderPlus,
  FolderOpen,
  type LucideIcon,
  Pin,
  Trash2,
} from 'lucide-react'
import { DropdownMenu as DropdownMenuPrimitive } from 'radix-ui'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { projectItems } from '@/mock/projectItems'

const menuItemClassName =
  'relative flex cursor-default items-center gap-2 rounded-md px-2 py-2 text-[14px] text-foreground outline-hidden select-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-accent data-[highlighted]:text-foreground'
const menuContentClassName =
  'z-50 w-48 overflow-hidden rounded-md border bg-popover p-1.5 text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2'

function MenuItem({
  label,
  icon: Icon,
  destructive = false,
  onSelect,
}: {
  label: string
  icon: LucideIcon
  destructive?: boolean
  onSelect: () => void
}) {
  return (
    <DropdownMenuPrimitive.Item
      className={cn(
        menuItemClassName,
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

export function ConversationMoreMenu() {
  const handleAction = (label: string) => {
    console.log(label)
  }

  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger asChild>
        <Button
          variant="outline"
          aria-label="More actions"
          className="size-9 rounded-full bg-transparent p-0 hover:bg-muted"
        >
          <Ellipsis className="size-4" />
        </Button>
      </DropdownMenuPrimitive.Trigger>

      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          align="end"
          sideOffset={8}
          onCloseAutoFocus={(event) => event.preventDefault()}
          className={menuContentClassName}
        >
          <MenuItem
            label="Files in chat"
            icon={FolderOpen}
            onSelect={() => handleAction('Files in chat')}
          />

          <DropdownMenuPrimitive.Sub>
            <DropdownMenuPrimitive.SubTrigger
              onClick={() => handleAction('Move to Project')}
              className={menuItemClassName}
            >
              <FolderInput className="ml-0.5 size-[17px] shrink-0 text-inherit" />
              <span>Move to Project</span>
              <ChevronRight className="ml-auto translate-x-0.5 size-[19px] text-inherit" />
            </DropdownMenuPrimitive.SubTrigger>

            <DropdownMenuPrimitive.Portal>
              <DropdownMenuPrimitive.SubContent
                sideOffset={8}
                className={menuContentClassName}
              >
                <MenuItem
                  label="New Project"
                  icon={FolderPlus}
                  onSelect={() => handleAction('New Project')}
                />

                <DropdownMenuPrimitive.Separator className="mx-2 my-1 h-px bg-border" />

                {projectItems.map((item) => (
                  <MenuItem
                    key={item.label}
                    label={item.label}
                    icon={Folder}
                    onSelect={() => handleAction(item.label)}
                  />
                ))}
              </DropdownMenuPrimitive.SubContent>
            </DropdownMenuPrimitive.Portal>
          </DropdownMenuPrimitive.Sub>

          <MenuItem
            label="Pin Chat"
            icon={Pin}
            onSelect={() => handleAction('Pin Chat')}
          />
          <MenuItem
            label="Archive"
            icon={Archive}
            onSelect={() => handleAction('Archive')}
          />
          <MenuItem
            label="Delete"
            icon={Trash2}
            destructive
            onSelect={() => handleAction('Delete')}
          />
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  )
}
