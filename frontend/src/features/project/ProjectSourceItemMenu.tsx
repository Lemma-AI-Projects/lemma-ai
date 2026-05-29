import {
  Download,
  Ellipsis,
  Pencil,
  Trash2,
} from 'lucide-react'
import { ActionMenu, ActionMenuItem } from '@/components/ActionMenu'
import { Button } from '@/components/ui/button'

export function ProjectSourceItemMenu({ sourceId }: { sourceId: string }) {
  const log = (action: string) => console.log(action, sourceId)

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
      <ActionMenuItem icon={Pencil} label="Rename" onSelect={() => log('Rename')} />
      <ActionMenuItem
        icon={Download}
        label="Download"
        onSelect={() => log('Download')}
      />
      <ActionMenuItem
        icon={Trash2}
        label="Remove"
        destructive
        onSelect={() => log('Remove')}
      />
    </ActionMenu>
  )
}
