import { Dialog as DialogPrimitive } from 'radix-ui'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface UnansweredItem {
  index: number
  title: string
  missing: number
}

/** 提交前的未答确认：允许未填完提交，但要让人知道还差哪些。 */
export function UnansweredDialog({
  open,
  onOpenChange,
  items,
  isSubmitting,
  onJump,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: UnansweredItem[]
  isSubmitting: boolean
  onJump?: (index: number) => void
  onConfirm: () => void
}) {
  const total = items.reduce((sum, item) => sum + item.missing, 0)

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
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
              还有 {total} 处未作答
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="mt-2 text-sm leading-6 text-muted-foreground">
              未作答的部分会按未答处理，提交后不能再修改。
            </DialogPrimitive.Description>
            {items.length > 1 || onJump ? (
              <ul className="mt-4 max-h-56 overflow-y-auto rounded-xl border border-zinc-200">
                {items.map((item) => (
                  <li key={item.index} className="border-b border-zinc-200 last:border-b-0">
                    {onJump ? (
                      <button
                        type="button"
                        onClick={() => onJump(item.index)}
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-zinc-100"
                      >
                        <span className="text-zinc-800">{item.title}</span>
                        <span className="text-zinc-500">{item.missing} 处未答</span>
                      </button>
                    ) : (
                      <div className="flex items-center justify-between px-3 py-2 text-sm">
                        <span className="text-zinc-800">{item.title}</span>
                        <span className="text-zinc-500">{item.missing} 处未答</span>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="flex items-center justify-end gap-2 px-4 pt-5 pb-4">
            <DialogPrimitive.Close asChild>
              <Button type="button" variant="ghost" size="sm" className="rounded-full">
                返回作答
              </Button>
            </DialogPrimitive.Close>
            <Button
              type="button"
              size="sm"
              disabled={isSubmitting}
              onClick={onConfirm}
              className="rounded-full bg-zinc-950 text-white hover:bg-zinc-800"
            >
              {isSubmitting ? '提交中…' : '仍然提交'}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
