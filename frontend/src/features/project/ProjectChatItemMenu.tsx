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
import { useMoveConversationMutation } from '@/hooks/useMoveConversation'
import { useProjectsQuery } from './projectApi'

export function ProjectChatItemMenu({
  chatId,
  projectId,
  projectName,
}: {
  chatId: string
  projectId: string
  projectName: string
}) {
  const { data: projects } = useProjectsQuery()
  const moveMutation = useMoveConversationMutation()
  // 移到其他项目：排除当前所在项目
  const otherProjects = (projects ?? []).filter((item) => item.id !== projectId)

  const log = (action: string) => console.log(action, chatId)

  const handleMove = (targetProjectId: string | null) => {
    moveMutation.mutate(
      { conversationId: chatId, projectId: targetProjectId },
      {
        onError: (error) => console.error('Failed to move conversation', error),
      }
    )
  }

  const topItems: { icon: LucideIcon; label: string }[] = [
    { icon: Share, label: 'Share' },
    { icon: Pencil, label: 'Rename' },
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
        {otherProjects.map((project) => (
          <ActionMenuItem
            key={project.id}
            icon={Folder}
            label={project.name}
            disabled={moveMutation.isPending}
            onSelect={() => handleMove(project.id)}
          />
        ))}
      </ActionMenuSub>

      <ActionMenuItem
        icon={FolderMinus}
        label={`Remove from ${projectName}`}
        disabled={moveMutation.isPending}
        onSelect={() => handleMove(null)}
      />
      <ActionMenuItem icon={Archive} label="Archive" onSelect={() => log('Archive')} />
      <ActionMenuItem
        icon={Trash2}
        label="Delete"
        destructive
        onSelect={() => log('Delete')}
      />
    </ActionMenu>
  )
}
