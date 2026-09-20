import { useState } from 'react'
import { CreditCard, Loader2 } from 'lucide-react'

import { createOrder } from './paymentApi'
import type { CreditPack } from './types'

// main-v3 没有 i18n 体系，文案直接内联（main-v2 走 credits.stripe.* 词条）。
const MSG = {
  pay: '卡支付',
  redirecting: '正在跳转…',
  sessionFailedRetry: '创建支付会话失败，请重试',
}

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
          : MSG.sessionFailedRetry
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
          {MSG.redirecting}
        </>
      ) : (
        <>
          <CreditCard className="size-4" />
          {MSG.pay}
        </>
      )}
    </button>
  )
}
