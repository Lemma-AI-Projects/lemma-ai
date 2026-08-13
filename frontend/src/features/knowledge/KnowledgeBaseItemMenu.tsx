import {
  Download,
  Ellipsis,
  Pencil,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { ActionMenu, ActionMenuItem } from '@/components/ActionMenu'
import { Button } from '@/components/ui/button'

export function KnowledgeBaseItemMenu({
  fileName,
  itemId: _itemId,
}: {
  itemId: string
  fileName: string
}) {
  const notify = (action: string) => toast.info(`${action}功能开发中，敬请期待`)

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
      <ActionMenuItem icon={Pencil} label="重命名" onSelect={() => notify('重命名')} />
      <ActionMenuItem icon={Download} label="下载" onSelect={() => notify('下载')} />
      <ActionMenuItem
        icon={Trash2}
        label="删除"
        destructive
        onSelect={() => notify('删除')}
      />
    </ActionMenu>
  )
}
