import { useState } from 'react'
import { CreditCard, Loader2 } from 'lucide-react'

import { createOrder } from './paymentApi'
import type { CreditPack } from './types'

interface StripeCheckoutButtonProps {
  pack: CreditPack
  /** 后端 Stripe 通道是否就绪；未就绪时不渲染真实按钮。 */
  ready: boolean
  onError: (message: string) => void
}

/**
 * 信用卡支付按钮（Stripe 托管 Checkout）。
 * 点击 → 后端创建 Checkout Session（服务端权威定价）→ 跳转 Stripe 结账页。
 * 卡片数据全程在 Stripe 侧，不经过我们服务器。成功后 Stripe 回跳
 * /gotopay?status=success（余额由 useBalance 自动刷新）。
 */
export function StripeCheckoutButton({
  pack,
  ready,
  onError,
}: StripeCheckoutButtonProps) {
  const [pending, setPending] = useState(false)

  if (!ready) {
    return null
  }

  const handleClick = async () => {
    if (pending) return
    setPending(true)
    try {
      const res = await createOrder({
        packId: pack.id,
        amount: pack.priceUsd,
        currency: 'USD',
        provider: 'stripe',
      })
      if (res.url) {
        window.location.href = res.url
        return // 页面即将跳走，不再 setPending
      }
      throw new Error('missing checkout url')
    } catch (err) {
      onError(
        err instanceof Error
          ? `创建支付会话失败：${err.message}`
          : '创建支付会话失败，请重试'
      )
      setPending(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-zinc-900 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          正在跳转…
        </>
      ) : (
        <>
          <CreditCard className="size-4" />
          卡支付
        </>
      )}
    </button>
  )
}
