import { useState } from 'react'
import {
  Archive,
  Ellipsis,
  Folder,
  FolderInput,
  FolderPlus,
  FolderOpen,
  Pencil,
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
import { useMoveConversationMutation } from '@/hooks/useMoveConversation'
import {
  useConversationsQuery,
  useDeleteConversationMutation,
} from './conversationApi'
import { RenameConversationDialog } from './RenameConversationDialog'

/** 跨域数据由页面层注入（feature 间不直接引用），仅取菜单所需字段。 */
export interface MoveTargetProject {
  id: string
  name: string
}

export function ConversationMoreMenu({
  conversationId,
  projects,
  onDeleted,
}: {
  /** 新会话态（尚未产生 id）为 undefined，重命名/删除/移动不可用。 */
  conversationId?: string
  projects: MoveTargetProject[]
  onDeleted: () => void
}) {
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  // 与侧边栏共享同一份列表缓存，仅用于取当前标题作为重命名初始值
  const { data: conversations } = useConversationsQuery()
  const deleteMutation = useDeleteConversationMutation()
  const moveMutation = useMoveConversationMutation()
  const currentTitle =
    conversations?.find((item) => item.id === conversationId)?.title ?? ''

  const handleAction = (label: string) => {
    console.log(label)
  }

  const handleMove = (projectId: string) => {
    if (!conversationId) return
    moveMutation.mutate(
      { conversationId, projectId },
      {
        onError: (error) => console.error('Failed to move conversation', error),
      }
    )
  }

  const handleDelete = () => {
    if (!conversationId) return
    deleteMutation.mutate(
      { conversationId },
      {
        onSuccess: onDeleted,
        onError: (error) => console.error('Failed to delete conversation', error),
      }
    )
  }

  return (
    <>
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

          {projects.map((project) => (
            <ActionMenuItem
              key={project.id}
              label={project.name}
              icon={Folder}
              disabled={!conversationId || moveMutation.isPending}
              onSelect={() => handleMove(project.id)}
            />
          ))}
        </ActionMenuSub>

        <ActionMenuItem
          label="Rename"
          icon={Pencil}
          disabled={!conversationId}
          onSelect={() => setRenameDialogOpen(true)}
        />
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
          disabled={!conversationId || deleteMutation.isPending}
          onSelect={handleDelete}
        />
      </ActionMenu>

      {conversationId && (
        <RenameConversationDialog
          key={`${conversationId}-${currentTitle}`}
          open={renameDialogOpen}
          onOpenChange={setRenameDialogOpen}
          conversationId={conversationId}
          initialTitle={currentTitle}
        />
      )}
    </>
  )
}
