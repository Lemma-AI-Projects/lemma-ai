import {
  Download,
  Ellipsis,
  Pencil,
  Trash2,
} from 'lucide-react'
import { ActionMenu, ActionMenuItem } from '@/components/ActionMenu'
import { Button } from '@/components/ui/button'

export function KnowledgeBaseItemMenu({
  itemId,
  fileName,
}: {
  itemId: string
  fileName: string
}) {
  const log = (action: string) => console.log(action, itemId)

  return (
    <ActionMenu
      width="sm"
      onContentClick={(event) => event.stopPropagation()}
      trigger={
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`打开“${fileName}”的操作菜单`}
          className="size-9 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground data-[state=open]:bg-muted"
          onClick={(event) => event.stopPropagation()}
        >
          <Ellipsis className="size-5" />
        </Button>
      }
    >
      <ActionMenuItem icon={Pencil} label="重命名" onSelect={() => log('Rename')} />
      <ActionMenuItem icon={Download} label="下载" onSelect={() => log('Download')} />
      <ActionMenuItem
        icon={Trash2}
        label="删除"
        destructive
        onSelect={() => log('Delete')}
      />
    </ActionMenu>
  )
}
