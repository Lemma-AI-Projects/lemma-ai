import {
  Archive,
  Ellipsis,
  Folder,
  FolderInput,
  FolderPlus,
  FolderOpen,
  Pin,
  Trash2,
} from 'lucide-react'
import {
  ActionMenu,
  ActionMenuItem,
  ActionMenuSeparator,
  ActionMenuSub,
} from '@/components/ActionMenu'
import { Button } from '@/components/ui/button'
import { projectItems } from '@/mock/projectItems'

export function ConversationMoreMenu() {
  const handleAction = (label: string) => {
    console.log(label)
  }

  return (
    <ActionMenu
      trigger={
        <Button
          variant="outline"
          aria-label="More actions"
          className="size-[34px] rounded-full bg-transparent p-0 hover:bg-muted"
        >
          <Ellipsis className="size-4" />
        </Button>
      }
    >
      <ActionMenuItem
        label="Files in chat"
        icon={FolderOpen}
        onSelect={() => handleAction('Files in chat')}
      />

      <ActionMenuSub
        label="Move to Project"
        icon={FolderInput}
        onClick={() => handleAction('Move to Project')}
      >
        <ActionMenuItem
          label="New Project"
          icon={FolderPlus}
          onSelect={() => handleAction('New Project')}
        />

        <ActionMenuSeparator />

        {projectItems.map((item) => (
          <ActionMenuItem
            key={item.label}
            label={item.label}
            icon={Folder}
            onSelect={() => handleAction(item.label)}
          />
        ))}
      </ActionMenuSub>

      <ActionMenuItem
        label="Pin Chat"
        icon={Pin}
        onSelect={() => handleAction('Pin Chat')}
      />
      <ActionMenuItem
        label="Archive"
        icon={Archive}
        onSelect={() => handleAction('Archive')}
      />
      <ActionMenuItem
        label="Delete"
        icon={Trash2}
        destructive
        onSelect={() => handleAction('Delete')}
      />
    </ActionMenu>
  )
}
