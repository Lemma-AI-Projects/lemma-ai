/**
 * 品牌件。
 *
 * Lemma 没有吉祥物 —— 凡是需要「一张脸」的地方（开场、背书带）一律用标本身。
 * 标直接取 public/favicon.svg，不在源码里再抄一份路径。
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

/**
 * MIT 的字标。沙盒占位：一个内联 SVG 文字标，等官方素材到位再换。
 * 用文字而不是手绘路径 —— 免得在评审时把「像不像」当成结论。
 */
export function MitWordmark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 58 26"
      role="img"
      aria-label="MIT"
      className={cn('h-4 w-auto', className)}
    >
      <text
        x="0"
        y="21"
        fontSize="24"
        fontWeight="700"
        letterSpacing="1.5"
        fill="#A31F34"
        fontFamily="ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
      >
        MIT
      </text>
    </svg>
  )
}

/** 背书带：谁做的 + 学历出处。只出现在最后一屏。 */
export function BuiltByBand({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3.5',
        className
      )}
    >
      <LemmaMark className="size-7 shrink-0" />

      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium text-zinc-800">
          Built by the best minds in education
        </div>
        <div className="mt-0.5 text-[12px] text-zinc-500">
          Ceaser Zhao · Ekai Sun
        </div>
      </div>

      <MitWordmark className="shrink-0" />
    </div>
  )
}