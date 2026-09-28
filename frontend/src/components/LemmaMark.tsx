/**
 * Lemma 标。
 *
 * 取 public/favicon.svg —— 路径只在这里出现一次，别处一律引这个组件，
 * 免得哪天换标要满仓库找 <img src="/favicon.svg">。
 */

import { cn } from '@/lib/utils'

export function LemmaMark({ className }: { className?: string }) {
  return (
    <img
      src="/favicon.svg"
      alt="Lemma"
      draggable={false}
      className={cn('size-10 select-none', className)}
    />
  )
}