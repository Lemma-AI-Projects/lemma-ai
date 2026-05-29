import {
  Archive,
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
import {
  ActionMenu,
  ActionMenuItem,
  ActionMenuSeparator,
  ActionMenuSub,
} from '@/components/ActionMenu'
import { Button } from '@/components/ui/button'
import { projectItems } from '@/mock/projectItems'

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
    <ActionMenu
      onContentClick={(event) => event.stopPropagation()}
      trigger={
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="More actions"
          onClick={(event) => event.stopPropagation()}
        >
          <Ellipsis className="size-5" />
        </Button>
      }
    >
      {topItems.map((item) => (
        <ActionMenuItem
          key={item.label}
          {...item}
          onSelect={() => log(item.label)}
        />
      ))}

      <ActionMenuSub label="Move to Project" icon={FolderInput}>
        <ActionMenuItem
          icon={FolderPlus}
          label="New Project"
          onSelect={() => log('New Project')}
        />
        <ActionMenuSeparator />
        {projectItems.map((project) => (
          <ActionMenuItem
            key={project.label}
            icon={Folder}
            label={project.label}
            onSelect={() => log(project.label)}
          />
        ))}
      </ActionMenuSub>

      {bottomItems.map((item) => (
        <ActionMenuItem
          key={item.label}
          {...item}
          onSelect={() => log(item.label)}
        />
      ))}
    </ActionMenu>
  )
}
