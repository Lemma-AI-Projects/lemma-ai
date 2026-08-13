import { useState } from 'react'
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
import { toast } from 'sonner'
import {
  ActionMenu,
  ActionMenuItem,
  ActionMenuSeparator,
  ActionMenuSub,
} from '@/components/ActionMenu'
import { Button } from '@/components/ui/button'
import { useMoveConversationMutation } from '@/hooks/useMoveConversation'
import { useDeleteConversationMutation } from '@/features/conversation/conversationApi'
import { useProjectsQuery } from './projectApi'
import { RenameConversationDialog } from '@/features/conversation/RenameConversationDialog'

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
  const deleteMutation = useDeleteConversationMutation()
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  // 移到其他项目：排除当前所在项目
  const otherProjects = (projects ?? []).filter((item) => item.id !== projectId)

  const handleMove = (targetProjectId: string | null) => {
    moveMutation.mutate(
      { conversationId: chatId, projectId: targetProjectId },
      {
        onError: (error) => console.error('Failed to move conversation', error),
      }
    )
  }

  const handleDelete = () => {
    deleteMutation.mutate(
      { conversationId: chatId },
      {
        onError: (error) => console.error('Failed to delete conversation', error),
      }
    )
  }

  const topItems: { icon: LucideIcon; label: string; onSelect: () => void }[] = [
    { icon: Share, label: 'Share', onSelect: () => toast.info('分享功能开发中，敬请期待') },
    { icon: Pencil, label: 'Rename', onSelect: () => setRenameDialogOpen(true) },
  ]

  return (
    <>
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
            icon={item.icon}
            label={item.label}
            onSelect={item.onSelect}
          />
        ))}

        <ActionMenuSub label="Move to Project" icon={FolderInput}>
          <ActionMenuItem
            icon={FolderPlus}
            label="New Project"
            onSelect={() => toast.info('新建项目功能开发中，敬请期待')}
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
        <ActionMenuItem icon={Archive} label="Archive" onSelect={() => toast.info('归档功能开发中，敬请期待')} />
        <ActionMenuItem
          icon={Trash2}
          label="Delete"
          destructive
          onSelect={handleDelete}
        />
      </ActionMenu>

      <RenameConversationDialog
        key={`${chatId}-rename`}
        open={renameDialogOpen}
        onOpenChange={setRenameDialogOpen}
        conversationId={chatId}
        initialTitle=""
      />
    </>
  )
}
