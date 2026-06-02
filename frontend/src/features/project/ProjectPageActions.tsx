import { Ellipsis, Settings, Share2 } from 'lucide-react'
import { ActionMenu, ActionMenuItem } from '@/components/ActionMenu'
import { Button } from '@/components/ui/button'

export function ProjectPageActions() {
  const handleAction = (label: string) => {
    console.log(label)
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
          label="项目设置"
          icon={Settings}
          onSelect={() => handleAction('项目设置')}
        />
      </ActionMenu>
    </div>
  )
}
