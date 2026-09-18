import { Dialog as DialogPrimitive } from 'radix-ui'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useDeleteCourseMutation } from './courseApi'

export function DeleteCourseDialog({
  open,
  onOpenChange,
  courseId,
  courseTitle,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  courseId: string
  courseTitle: string
}) {
  const deleteMutation = useDeleteCourseMutation()

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) deleteMutation.reset()
    onOpenChange(nextOpen)
  }

  const handleDelete = () => {
    deleteMutation.mutate(
      { courseId },
      { onSuccess: () => onOpenChange(false) }
    )
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            'fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl bg-background shadow-xl outline-hidden',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95'
          )}
        >
          <div className="px-5 pt-5">
            <DialogPrimitive.Title className="text-lg font-normal text-foreground">
              删除课程
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="mt-2 text-sm leading-6 text-muted-foreground">
              将删除《{courseTitle}》的全部章节、学习点与已转存的视频，伴学会话也会一并移除。此操作不可撤销。
            </DialogPrimitive.Description>
            {deleteMutation.isError && (
              <p className="mt-3 text-xs text-destructive">删除失败，请重试</p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 px-4 pt-5 pb-4">
            <DialogPrimitive.Close asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-full"
              >
                取消
              </Button>
            </DialogPrimitive.Close>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={handleDelete}
              className="rounded-full"
            >
              {deleteMutation.isPending ? '删除中…' : '删除'}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
