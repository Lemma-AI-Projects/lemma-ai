import {
  Download,
  Ellipsis,
  Pencil,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { ActionMenu, ActionMenuItem } from '@/components/ActionMenu'
import { Button } from '@/components/ui/button'

export function ProjectSourceItemMenu({ sourceId: _sourceId }: { sourceId: string }) {
  const notify = (action: string) => toast.info(`${action}功能开发中，敬请期待`)

  return (
    <ActionMenu
      width="sm"
      onContentClick={(event) => event.stopPropagation()}
      trigger={
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="More actions"
          onClick={(e) => e.stopPropagation()}
        >
          <Ellipsis className="size-5" />
        </Button>
      }
    >
      <ActionMenuItem icon={Pencil} label="Rename" onSelect={() => notify('Rename')} />
      <ActionMenuItem
        icon={Download}
        label="Download"
        onSelect={() => notify('Download')}
      />
      <ActionMenuItem
        icon={Trash2}
        label="Remove"
        destructive
        onSelect={() => notify('Remove')}
      />
    </ActionMenu>
  )
}
