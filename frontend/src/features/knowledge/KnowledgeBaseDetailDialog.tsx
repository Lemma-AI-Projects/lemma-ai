import { Download, Eye } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { triggerDownload, type KnowledgeBaseItem } from './getKnowledgeBaseItems'

function MetaRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 text-[13px] leading-[18px]">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-end text-foreground">{value}</span>
    </div>
  )
}

export function KnowledgeBaseDetailDialog({
  item,
  open,
  onOpenChange,
}: {
  item: KnowledgeBaseItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const sourceLabel =
    item?.source === 'uploaded' ? '已上传' : item?.source === 'generated' ? '已生成' : '—'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-5">
        {item ? (
          <>
            <DialogHeader>
              <DialogTitle className="break-words pr-6">
                {item.displayName}
              </DialogTitle>
              <DialogDescription>
                {item.extensionLabel} · {item.sizeLabel} · {item.formattedModifiedAt}
              </DialogDescription>
            </DialogHeader>

            <div className="flex min-h-[200px] max-h-[60vh] items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
              {item.previewUrl ? (
                item.previewKind === 'video' ? (
                  <video
                    src={item.previewUrl}
                    controls
                    playsInline
                    className="h-full max-h-[60vh] w-full bg-black"
                  />
                ) : (
                  <img
                    src={item.previewUrl}
                    alt={item.displayName}
                    className="max-h-[60vh] max-w-full object-contain"
                  />
                )
              ) : (
                <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
                  <item.Icon className={cn('size-14', item.iconColor)} />
                  <p className="max-w-[20rem] text-[13px] leading-[18px] text-muted-foreground">
                    该文件类型暂不支持在线预览，可下载后在本地查看。
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-zinc-200 bg-background px-4 py-2">
              <MetaRow label="类型" value={item.categoryLabel} />
              <MetaRow label="大小" value={item.sizeLabel} />
              <MetaRow label="修改时间" value={item.formattedModifiedAt} />
              <MetaRow label="来源" value={sourceLabel} />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                关闭
              </Button>
              <Button
                type="button"
                onClick={() => triggerDownload(item)}
                className="gap-2"
              >
                {item.previewUrl ? (
                  <Download className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
                下载
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
