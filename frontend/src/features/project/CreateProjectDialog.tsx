import { type FormEvent, useRef, useState } from 'react'
import { Folder, Info, Pencil, X } from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useCreateProjectMutation } from './projectApi'

export function CreateProjectDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [projectName, setProjectName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const createMutation = useCreateProjectMutation()

  const isSubmitDisabled =
    projectName.trim().length === 0 || createMutation.isPending

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setProjectName('')
      createMutation.reset()
    }
    onOpenChange(nextOpen)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = projectName.trim()
    if (!trimmed || createMutation.isPending) return
    createMutation.mutate(
      { name: trimmed },
      {
        onSuccess: () => {
          setProjectName('')
          onOpenChange(false)
        },
      }
    )
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        />
        <DialogPrimitive.Content
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            inputRef.current?.focus()
          }}
          aria-describedby={undefined}
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl bg-background shadow-xl outline-hidden',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95'
          )}
        >
          {/* Header */}
          <div className="flex min-h-14 items-start gap-2 p-2 ps-4">
            <div className="mt-1 flex max-w-[calc(100%-100px)] flex-col">
              <DialogPrimitive.Title className="text-lg font-normal text-foreground">
                创建项目
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

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="flex-1 px-4 pt-1">
              <div className="mb-2">
                <label
                  htmlFor="project-name"
                  className="mb-2 block text-sm text-foreground"
                >
                  项目名称
                </label>

                {/*
                  Grid trick borrowed from ChatGPT: the input and the icon-picker
                  button both sit on row 1. The input spans all columns (visually
                  the full input), while the picker occupies just column 1 and
                  lands inside the input's extra start padding (ps-11). This
                  avoids `position: absolute` and keeps tab order natural.
                */}
                <div className="grid grid-cols-[auto_minmax(0,1fr)]">
                  <input
                    ref={inputRef}
                    id="project-name"
                    name="projectName"
                    type="text"
                    autoComplete="off"
                    placeholder="哥本哈根之旅"
                    value={projectName}
                    onChange={(event) => setProjectName(event.target.value)}
                    className="col-span-full row-1 h-10 w-full rounded-md border border-zinc-200 bg-background px-3 pe-10 ps-11 text-sm text-foreground outline-none placeholder:text-zinc-400"
                  />
                  <button
                    type="button"
                    aria-label="打开项目图标和颜色菜单"
                    className="group col-1 row-1 flex size-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <div className="relative">
                      <Folder className="size-5 group-hover:invisible" />
                      <Pencil className="invisible absolute inset-0 size-5 group-hover:visible" />
                    </div>
                  </button>
                </div>
              </div>

              {/* Info callout */}
              <aside className="mt-4 flex items-center rounded-lg bg-muted p-3">
                <div className="me-2 flex size-6 items-center justify-center text-muted-foreground">
                  <Info className="size-5" />
                </div>
                <p className="text-pretty text-xs text-muted-foreground">
                  项目功能可将聊天、文件和自定义指令集中保存，以便用于持续进行的工作，或者单纯用于整理内容，让一切更井然有序。
                </p>
              </aside>

              {createMutation.isError && (
                <p className="mt-2 text-xs text-destructive">
                  创建项目失败，请重试
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end px-3 pb-3 pt-4">
              <div className="flex flex-col gap-3 sm:flex-row-reverse">
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitDisabled}
                  className="-translate-x-px -translate-y-px rounded-full"
                >
                  {createMutation.isPending ? '创建中…' : '创建项目'}
                </Button>
              </div>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
