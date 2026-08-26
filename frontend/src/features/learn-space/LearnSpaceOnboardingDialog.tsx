import { type FormEvent, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useCreateProjectMutation } from '@/features/project/projectApi'
import { useTranslation } from 'react-i18next'

/**
 * Learn space 创建 —— 极简单步：起名 → 创建 → 直接进入空间。
 * （已删除伙伴塑造 onboarding：不生成/不编辑 agent 档案，创建即收获一个
 * 同名可进的空间，agent 人设留待空间内设置页声明。）
 */
export function LearnSpaceOnboardingDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const [spaceName, setSpaceName] = useState('')

  const createMutation = useCreateProjectMutation()
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSpaceName('')
      createMutation.reset()
    }
    onOpenChange(nextOpen)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = spaceName.trim()
    if (!trimmed || createMutation.isPending) return
    createMutation.mutate(
      { name: trimmed },
      {
        onSuccess: (created) => {
          handleOpenChange(false)
          navigate(`/project/${created.id}`)
        },
      }
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
          }}
          aria-describedby={undefined}
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl bg-background shadow-xl outline-hidden',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95'
          )}
        >
          <form onSubmit={handleSubmit}>
            {/* Header */}
            <div className="flex min-h-14 items-start gap-2 p-2 ps-4">
              <div className="mt-1 flex max-w-[calc(100%-100px)] flex-col">
                <DialogPrimitive.Title className="text-lg font-normal text-foreground">
                  {t('learnSpace.createTitle')}
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="text-xs text-muted-foreground">
                  {t('learnSpace.definition')}
                </DialogPrimitive.Description>
              </div>
              <div className="grow" />
              <DialogPrimitive.Close asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('learnSpace.close')}
                  className="rounded-full"
                >
                  <X className="size-5" />
                </Button>
              </DialogPrimitive.Close>
            </div>

            <div className="flex-1 px-4 pt-1">
              <label
                htmlFor="learn-space-name"
                className="mb-2 block text-sm text-foreground"
              >
                {t('learnSpace.whatToLearn')}
              </label>
              <input
                ref={inputRef}
                id="learn-space-name"
                type="text"
                autoComplete="off"
                placeholder={t('learnSpace.placeholder')}
                value={spaceName}
                onChange={(event) => setSpaceName(event.target.value)}
                className="h-10 w-full rounded-md border border-zinc-200 bg-background px-3 text-sm text-foreground outline-none placeholder:text-zinc-400"
              />
            </div>

            <div className="flex items-center justify-end px-3 pb-3 pt-4">
              <Button
                type="submit"
                size="sm"
                disabled={spaceName.trim().length === 0 || createMutation.isPending}
                className="-translate-x-px -translate-y-px rounded-full"
              >
                {createMutation.isPending
                  ? t('learnSpace.creating')
                  : t('learnSpace.create')}
              </Button>
            </div>

            {createMutation.isError && (
              <p className="px-4 pb-3 text-center text-xs text-destructive">
                {t('learnSpace.createFailed')}
              </p>
            )}
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}