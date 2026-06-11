import { useRef, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useRenameConversationMutation } from './conversationApi'

export function RenameConversationDialog({
  open,
  onOpenChange,
  conversationId,
  initialTitle,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  conversationId: string
  initialTitle: string
}) {
  const [title, setTitle] = useState(initialTitle)
  const inputRef = useRef<HTMLInputElement>(null)
  const renameMutation = useRenameConversationMutation()

  const trimmedTitle = title.trim()
  const isSubmitDisabled = trimmedTitle.length === 0 || renameMutation.isPending

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setTitle(initialTitle)
      renameMutation.reset()
    }
    onOpenChange(nextOpen)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSubmitDisabled) return
    renameMutation.mutate(
      { conversationId, title: trimmedTitle },
      { onSuccess: () => onOpenChange(false) }
    )
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            inputRef.current?.focus()
            inputRef.current?.select()
          }}
          aria-describedby={undefined}
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl bg-background shadow-xl outline-hidden',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95'
          )}
        >
          <div className="flex min-h-14 items-start gap-2 p-2 ps-4">
            <div className="mt-1 flex flex-col">
              <DialogPrimitive.Title className="text-lg font-normal text-foreground">
                重命名会话
              </DialogPrimitive.Title>
            </div>
            <div className="grow" />
            <DialogPrimitive.Close asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="关闭"
                className="rounded-full"
              >
                <X className="size-5" />
              </Button>
            </DialogPrimitive.Close>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="px-4 pt-1">
              <input
                ref={inputRef}
                type="text"
                autoComplete="off"
                aria-label="会话标题"
                maxLength={200}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="h-10 w-full rounded-md border border-zinc-200 bg-background px-3 text-sm text-foreground outline-none placeholder:text-zinc-400"
              />
              {renameMutation.isError && (
                <p className="mt-2 text-xs text-destructive">
                  重命名失败，请重试
                </p>
              )}
            </div>

            <div className="flex items-center justify-end px-3 pb-3 pt-4">
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitDisabled}
                className="rounded-full"
              >
                {renameMutation.isPending ? '保存中…' : '保存'}
              </Button>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
