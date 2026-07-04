import { useState } from 'react'
import { Ellipsis, Pencil, Settings, Share2, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { ActionMenu, ActionMenuItem } from '@/components/ActionMenu'
import { Button } from '@/components/ui/button'
import { useDeleteProjectMutation } from './projectApi'
import { RenameProjectDialog } from './RenameProjectDialog'

export function ProjectPageActions({
  projectId,
  projectName,
}: {
  projectId?: string
  projectName: string
}) {
  const navigate = useNavigate()
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const deleteMutation = useDeleteProjectMutation()

  const handleAction = (label: string) => {
    console.log(label)
  }

  const handleDelete = () => {
    if (!projectId) return
    // 项目内会话不删除，自动回落主列表（mutation 内已按前缀刷新两侧列表）
    deleteMutation.mutate(
      { projectId },
      {
        onSuccess: () => navigate('/home'),
        onError: (error) => console.error('Failed to delete project', error),
      }
    )
  }

  return (
    <div className="absolute right-4 top-4 flex items-center gap-3">
      <Button
        variant="outline"
        aria-label="Share project"
        className="h-9 rounded-full bg-transparent px-3 hover:bg-muted"
      >
        <Share2 className="size-4" />
        <span className="text-sm font-medium">Share</span>
      </Button>
      <ActionMenu
        width="sm"
        trigger={
          <Button
            variant="outline"
            aria-label="More actions"
            className="size-9 rounded-full bg-transparent p-0 hover:bg-muted"
          >
            <Ellipsis className="size-4" />
          </Button>
        }
      >
        <ActionMenuItem
          label="重命名"
          icon={Pencil}
          disabled={!projectId}
          onSelect={() => setRenameDialogOpen(true)}
        />
        <ActionMenuItem
          label="项目设置"
          icon={Settings}
          onSelect={() => handleAction('项目设置')}
        />
        <ActionMenuItem
          label="删除项目"
          icon={Trash2}
          destructive
          disabled={!projectId || deleteMutation.isPending}
          onSelect={handleDelete}
        />
      </ActionMenu>

      {projectId && (
        <RenameProjectDialog
          key={`${projectId}-${projectName}`}
          open={renameDialogOpen}
          onOpenChange={setRenameDialogOpen}
          projectId={projectId}
          initialName={projectName}
        />
      )}
    </div>
  )
}
