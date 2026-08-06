import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import { captureOrder, createOrder } from './paymentApi'
import type { CreditPack } from './types'

interface PayPalButtonProps {
  pack: CreditPack
  /** 后端支付能力是否就绪；未就绪时渲染优雅的「接入中」态而非真实按钮。 */
  ready: boolean
  onSuccess: (creditsGranted: number) => void
  onError: (message: string) => void
}

declare global {
  interface Window {
    // PayPal JS SDK 注入的全局对象，结构复杂，这里按需取用，故用宽松类型。
    paypal?: {
      Buttons: (options: Record<string, unknown>) => {
        render: (el: HTMLElement) => Promise<void>
      }
    }
  }
}

const PAYPAL_CLIENT_ID =
  (import.meta.env.VITE_PAYPAL_CLIENT_ID as string | undefined) ?? ''
const PAYPAL_SDK_HOST =
  (import.meta.env.VITE_PAYPAL_MODE as string | undefined) === 'sandbox'
    ? 'https://www.sandbox.paypal.com'
    : 'https://www.paypal.com'

let sdkPromise: Promise<void> | null = null

function loadPayPalSdk(clientId: string): Promise<void> {
  if (typeof window !== 'undefined' && window.paypal) return Promise.resolve()
  if (sdkPromise) return sdkPromise
  sdkPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `${PAYPAL_SDK_HOST}/sdk/js?client-id=${encodeURIComponent(
      clientId
    )}&currency=USD&intent=capture`
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('PayPal SDK 加载失败'))
    document.body.appendChild(script)
  })
  return sdkPromise
}

/** PayPal 品牌字标（非官方 logo，仅作品牌暗示）。 */
function PayPalMark() {
  return (
    <span className="text-[15px] font-bold italic leading-none text-[#003087]">
      Pay<span className="text-[#009cde]">Pal</span>
    </span>
  )
}

export function PayPalButton({
  pack,
  ready,
  onSuccess,
  onError,
}: PayPalButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [sdkError, setSdkError] = useState<string | null>(null)

  // 用 ref 持有回调，避免回调身份变化触发 SDK 重新渲染。
  const handlers = useRef({ onSuccess, onError })
  handlers.current = { onSuccess, onError }

  useEffect(() => {
    if (!ready || !PAYPAL_CLIENT_ID || !containerRef.current) return
    let cancelled = false

    loadPayPalSdk(PAYPAL_CLIENT_ID)
      .then(() => {
        if (cancelled || !containerRef.current || !window.paypal) return
        containerRef.current.innerHTML = ''
        return window.paypal
          .Buttons({
            style: {
              layout: 'vertical',
              color: 'gold',
              shape: 'rect',
              label: 'pay',
              height: 44,
            },
            createOrder: async () => {
              const res = await createOrder({
                packId: pack.id,
                amount: pack.priceUsd,
                currency: 'USD',
              })
              return res.orderId
            },
            onApprove: async (data: { orderID: string }) => {
              const res = await captureOrder(data.orderID)
              handlers.current.onSuccess(res.creditsGranted ?? pack.credits)
            },
            onError: () => {
              handlers.current.onError('支付未完成，请重试或联系支持。')
            },
          })
          .render(containerRef.current)
      })
      .catch((err: unknown) => {
        setSdkError(
          err instanceof Error ? err.message : 'PayPal SDK 加载失败'
        )
      })

    return () => {
      cancelled = true
    }
  }, [ready, pack.id, pack.priceUsd, pack.credits])

  // 后端未就绪：渲染品牌化的「接入中」态，提示明确、不报错（去金，避免抢眼）。
  if (!ready) {
    return (
      <button
        type="button"
        disabled
        className="flex h-11 w-full cursor-not-allowed items-center justify-center gap-2 rounded-md bg-zinc-100 text-sm font-semibold text-zinc-400"
      >
        <PayPalMark />
        <span>· 接入中</span>
      </button>
    )
  }

  if (sdkError) {
    return (
      <p className="text-center text-xs text-destructive">{sdkError}</p>
    )
  }

  return (
    <div ref={containerRef} className={cn('min-h-[44px] w-full')}>
      <span className="flex items-center justify-center gap-1.5 text-xs text-zinc-400">
        <Loader2 className="size-3 animate-spin" />
        正在加载 PayPal…
      </span>
    </div>
  )
}
