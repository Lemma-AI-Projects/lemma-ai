import type { ReactNode } from 'react'
import {
  Check,
  Download,
  Ellipsis,
  Eye,
  Folder,
  Inbox,
  Pencil,
  Trash2,
} from 'lucide-react'
import { ActionMenu, ActionMenuItem, ActionMenuSeparator, ActionMenuSub } from '@/components/ActionMenu'
import { Button } from '@/components/ui/button'
import type { KnowledgeBaseFolder } from './getKnowledgeBaseItems'

export function KnowledgeBaseItemMenu({
  itemId,
  fileName,
  folders,
  currentFolderId,
  onView,
  onDownload,
  onMove,
}: {
  itemId: string
  fileName: string
  folders: KnowledgeBaseFolder[]
  currentFolderId: string | null
  onView: () => void
  onDownload: () => void
  onMove: (folderId: string | null) => void
}) {
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
      <ActionMenuItem icon={Eye} label="查看" onSelect={onView} />
      <ActionMenuItem icon={Download} label="下载" onSelect={onDownload} />
      <ActionMenuSeparator />
      <ActionMenuSub icon={Folder} label="移动到">
        <ActionMenuItem onSelect={() => onMove(null)}>
          <MoveTargetRow
            icon={<Inbox className="ml-0.5 size-[17px] shrink-0 text-inherit" />}
            label="默认"
            selected={currentFolderId === null}
          />
        </ActionMenuItem>
        {folders.map((folder) => (
          <ActionMenuItem key={folder.id} onSelect={() => onMove(folder.id)}>
            <MoveTargetRow
              icon={<Folder className="ml-0.5 size-[17px] shrink-0 text-inherit" />}
              label={folder.name}
              selected={currentFolderId === folder.id}
            />
          </ActionMenuItem>
        ))}
      </ActionMenuSub>
      <ActionMenuItem
        icon={Pencil}
        label="重命名"
        onSelect={() => console.log('Rename', itemId)}
      />
      <ActionMenuItem
        icon={Trash2}
        label="删除"
        destructive
        onSelect={() => console.log('Delete', itemId)}
      />
    </ActionMenu>
  )
}

function MoveTargetRow({
  icon,
  label,
  selected,
}: {
  icon: ReactNode
  label: string
  selected: boolean
}) {
  return (
    <span className="flex w-full items-center gap-2">
      {icon}
      <span className="flex-1 truncate">{label}</span>
      {selected && <Check className="size-4 shrink-0 text-foreground" />}
    </span>
  )
}
