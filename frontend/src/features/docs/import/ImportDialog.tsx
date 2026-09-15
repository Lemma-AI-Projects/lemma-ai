import { useMemo, useState } from 'react'
import { Check } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAppTranslation } from '@/i18n'
import { cn } from '@/lib/utils'
import { ImportDestinationStep } from './ImportDestinationStep'
import { ImportResultStep } from './ImportResultStep'
import { ImportSourceStep } from './ImportSourceStep'
import { ImportTreeStep } from './ImportTreeStep'
import { IMPORT_STEPS, stepIndex } from './sources'
import { countSelection } from './treeUtils'
import type {
  ImportSourceKind,
  ImportSpace,
  ImportStep,
  ImportTreeNode,
} from './types'

export interface ImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 入口 A（空间内）传当前空间 id → 落点默认选中；入口 B（/knowledge）传 null → 必选。 */
  currentSpaceId: string | null
  spaces: ImportSpace[]
  /** 来源 → 该来源解析出的目录树。真实接入时由后端解析结果提供。 */
  treeForSource: (kind: ImportSourceKind) => ImportTreeNode[]
}

const NO_SELECTION: ReadonlySet<string> = new Set()

/**
 * 导入向导：选源 → 勾选子集 → 落点 → 结果。
 *
 * 四步而不是一屏：勾选子集那一步（目录树 + 半选 + 搜索）本身就是一屏的容量，
 * 硬塞进一屏会让「导到哪」和「导什么」互相挤。步骤之间可以回退，草稿不清空 ——
 * 中途改主意是常态，回退重选不该把已勾的东西丢掉。
 */
export function ImportDialog({
  open,
  onOpenChange,
  currentSpaceId,
  spaces,
  treeForSource,
}: ImportDialogProps) {
  const { t } = useAppTranslation()
  const [step, setStep] = useState<ImportStep>('source')
  const [source, setSource] = useState<ImportSourceKind | null>(null)
  const [selected, setSelected] = useState<ReadonlySet<string>>(NO_SELECTION)
  const [destinationId, setDestinationId] = useState<string | null>(currentSpaceId)

  const tree = useMemo(
    () => (source ? treeForSource(source) : []),
    [source, treeForSource]
  )
  const counts = useMemo(() => countSelection(selected, tree), [selected, tree])
  const destination = spaces.find((space) => space.id === destinationId) ?? null

  const activeIndex = stepIndex(step)
  const canAdvance =
    step === 'source'
      ? source !== null
      : step === 'content'
        ? counts.files > 0
        : step === 'destination'
          ? destination !== null
          : true

  function reset() {
    setStep('source')
    setSource(null)
    setSelected(NO_SELECTION)
    setDestinationId(currentSpaceId)
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset()
    onOpenChange(next)
  }

  function handleSourceChange(next: ImportSourceKind) {
    if (next === source) return
    setSource(next)
    // 换来源 = 换一棵树，旧的勾选 id 全部失效。
    setSelected(NO_SELECTION)
  }

  function handleNext() {
    if (!canAdvance) return
    const order = IMPORT_STEPS.map((item) => item.step)
    const next = order[activeIndex + 1]
    if (next) setStep(next)
    else handleOpenChange(false)
  }

  function handleBack() {
    const order = IMPORT_STEPS.map((item) => item.step)
    const prev = order[activeIndex - 1]
    if (prev) setStep(prev)
  }

  const isLastStep = step === 'result'

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{t('import.title')}</DialogTitle>
          <DialogDescription>{t(`import.${step}Title`)}</DialogDescription>
        </DialogHeader>

        <Stepper activeIndex={activeIndex} />

        {/* 不给共享 min-height：四步的自然高度差很大（第 2 步有目录树），
            按最高的一步定死会在其余三步留下一大块空白，看起来像布局坏了。
            让每步自己撑高度，唯一需要稳定的是第 2 步的树框（它自带 min/max）。 */}
        <div>
          {step === 'source' && (
            <ImportSourceStep value={source} onChange={handleSourceChange} />
          )}
          {step === 'content' && (
            <ImportTreeStep
              key={source ?? 'none'}
              tree={tree}
              selected={selected}
              onSelectedChange={setSelected}
            />
          )}
          {step === 'destination' && (
            <ImportDestinationStep
              spaces={spaces}
              value={destinationId}
              onChange={setDestinationId}
            />
          )}
          {step === 'result' && source && destination && (
            <ImportResultStep
              source={source}
              counts={counts}
              destination={destination}
            />
          )}
        </div>

        <div className="flex items-center justify-end gap-2">
          {activeIndex > 0 && !isLastStep && (
            <Button variant="ghost" onClick={handleBack}>
              {t('import.back')}
            </Button>
          )}
          <Button onClick={handleNext} disabled={!canAdvance}>
            {isLastStep ? t('import.done') : t('import.continue')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Stepper({ activeIndex }: { activeIndex: number }) {
  const { t } = useAppTranslation()

  return (
    <ol className="flex items-center gap-1.5" aria-label={t('import.stepsLabel')}>
      {IMPORT_STEPS.map((item, index) => {
        const isDone = index < activeIndex
        const isCurrent = index === activeIndex
        return (
          <li
            key={item.step}
            className="flex min-w-0 items-center gap-1.5"
            aria-current={isCurrent ? 'step' : undefined}
          >
            {index > 0 && (
              <span aria-hidden className="h-px w-3 shrink-0 bg-zinc-200" />
            )}
            <span
              className={cn(
                'flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-medium',
                isDone || isCurrent
                  ? 'bg-foreground text-background'
                  : 'border border-zinc-200 text-zinc-400'
              )}
            >
              {isDone ? <Check className="size-3" strokeWidth={3} /> : index + 1}
            </span>
            <span
              className={cn(
                'truncate text-xs',
                isCurrent ? 'font-medium text-zinc-900' : 'text-zinc-400'
              )}
            >
              {t(item.labelKey)}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
