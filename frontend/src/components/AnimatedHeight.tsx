import { useLayoutEffect, useRef, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

const EASING = 'cubic-bezier(0.22, 1, 0.36, 1)'

/**
 * 高度始终是 auto 的容器，只在 animateKey 变化（内容整体切换、流式多出一行这类
 * 离散变化）时补一段高度过渡。
 *
 * 与「用 ResizeObserver 追着内容设高度」的做法不同：平时不锁高度，所以内部自带
 * 过渡的折叠 / 展开不会被它滞后裁切。
 */
export function AnimatedHeight({
  animateKey,
  children,
  className,
  duration = 360,
}: {
  animateKey: string | number
  children: ReactNode
  className?: string
  duration?: number
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  /** 上一次静止时的自然高度，下一段过渡从这里起跳。 */
  const settledHeightRef = useRef<number | null>(null)
  /** 过渡被新的变化打断时的可见高度，保证衔接处不跳。 */
  const interruptedHeightRef = useRef<number | null>(null)

  // animateKey 之外的高度变化（例如用户展开了一个单元）也要记下来，
  // 否则下一段过渡会从过期的高度起跳。
  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return undefined
    const observer = new ResizeObserver(() => {
      if (container.getAnimations().length === 0) {
        settledHeightRef.current = container.getBoundingClientRect().height
      }
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return undefined

    const nextHeight = container.getBoundingClientRect().height
    const fromHeight = interruptedHeightRef.current ?? settledHeightRef.current
    interruptedHeightRef.current = null
    settledHeightRef.current = nextHeight

    if (
      fromHeight === null ||
      Math.abs(fromHeight - nextHeight) < 1 ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return undefined
    }

    const animation = container.animate(
      [{ height: `${fromHeight}px` }, { height: `${nextHeight}px` }],
      { duration, easing: EASING }
    )
    return () => {
      if (animation.playState === 'running') {
        interruptedHeightRef.current = container.getBoundingClientRect().height
      }
      animation.cancel()
    }
  }, [animateKey, duration])

  return (
    <div ref={containerRef} className={cn('overflow-hidden', className)}>
      {children}
    </div>
  )
}
