import { Check, X } from 'lucide-react'

import type { SlotVerdict } from '@/types/question'
import { cn } from '@/lib/utils'

/** 行内空、选项卡片旁边的小标记；只有客观题才有对错。 */
export function VerdictMark({ verdict, className }: { verdict: SlotVerdict | undefined; className?: string }) {
  if (verdict === 'correct') {
    return <Check aria-label="正确" className={cn('inline size-4 shrink-0 text-emerald-600', className)} />
  }
  if (verdict === 'incorrect' || verdict === 'partial') {
    return <X aria-label={verdict === 'partial' ? '部分正确' : '错误'} className={cn('inline size-4 shrink-0 text-red-500', className)} />
  }
  return null
}
