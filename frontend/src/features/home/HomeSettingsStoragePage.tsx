import { ChevronRight } from 'lucide-react'

import { Field, FieldLabel } from '@/components/ui/field'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

const storageUsedPercent = 50

const storageManagementItems = [
  { title: '文件', description: '66.1 MB · 28 个文件' },
  { title: '图片', description: '7.32 MB · 12 张图片' },
]

export function HomeSettingsStoragePage() {
  return (
    <>
      <h2 className="text-lg font-normal text-zinc-900">存储空间</h2>
      <Separator className="mt-4 bg-zinc-200" />
      <div className="pt-6">
        <Field className="w-full">
          <FieldLabel htmlFor="storage-usage">
            <span>已使用 10 GB，共 20 GB</span>
            <span className="ml-auto">50%</span>
          </FieldLabel>
          <Progress
            value={storageUsedPercent}
            id="storage-usage"
            className="[&_[data-slot=progress-indicator]]:bg-black"
          />
        </Field>
      </div>

      <section className="pt-8">
        <h3 className="text-base font-normal text-zinc-900">管理存储空间</h3>
        <p className="mt-0.5 text-xs text-zinc-500">
          管理你的资料库，释放存储空间
        </p>

        <div className="mt-4">
          {storageManagementItems.map((item, index) => (
            <button
              key={item.title}
              type="button"
              className={cn(
                'flex min-h-12 w-full items-center gap-4 py-2 text-left outline-none transition-colors hover:bg-zinc-50 focus-visible:bg-zinc-50',
                index > 0 && 'border-t border-zinc-100'
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-normal text-zinc-900">
                  {item.title}
                </span>
                <span className="mt-0.5 block text-xs text-zinc-500">
                  {item.description}
                </span>
              </span>
              <ChevronRight
                className="size-5 shrink-0 text-zinc-400"
                strokeWidth={1.75}
              />
            </button>
          ))}
        </div>
      </section>
    </>
  )
}
