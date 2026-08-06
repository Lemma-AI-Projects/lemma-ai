import { Check, Coins, Sparkles } from 'lucide-react'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { PayPalButton } from './PayPalButton'
import { CREDIT_PACKS } from './plans'
import type { CreditPack } from './types'
import { useBalance, usePaymentConfig } from './usePayments'

export function PayPage() {
  const config = usePaymentConfig()
  const balance = useBalance()
  const [error, setError] = useState<string | null>(null)
  const [successCredits, setSuccessCredits] = useState<number | null>(null)

  const paypalReady = config.data?.paypalReady ?? false

  // 客观性价比最高档（单价最低），用于「最划算」徽标，把价格故事讲出来。
  const bestValueId = CREDIT_PACKS.reduce(
    (best, p) => (p.priceUsd / p.credits < best.priceUsd / best.credits ? p : best),
    CREDIT_PACKS[0]
  ).id

  const handleSuccess = (credits: number) => {
    setSuccessCredits(credits)
    setError(null)
  }

  const handleError = (message: string) => {
    setError(message)
  }

  const balanceValue =
    balance.isLoading || balance.isError
      ? '—'
      : (balance.data?.credits ?? 0).toLocaleString()

  return (
    <div className="h-full overflow-y-auto rounded-xl border border-zinc-200/80 bg-zinc-50">
      <div className="mx-auto max-w-5xl px-6 py-10 md:px-10">
        {/* 头部 */}
        <header className="pay-fade-up flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-zinc-500">
              <Coins className="size-4" />
              <span className="text-xs font-medium uppercase tracking-[0.18em]">
                Credits
              </span>
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">
              为你的学习力充值
            </h1>
            <p className="mt-1.5 max-w-md text-sm text-zinc-500">
              一次性购买 credits，按量使用、永不过期。支付由 PayPal 安全处理。
            </p>
          </div>

          {/* 当前余额 */}
          <div className="flex shrink-0 items-center gap-2 self-start rounded-full border border-zinc-200 bg-white px-4 py-2 shadow-sm sm:self-auto">
            <Coins className="size-4 text-zinc-400" />
            <span className="text-sm text-zinc-500">当前余额</span>
            <span className="text-sm font-semibold tabular-nums text-zinc-900">
              {balanceValue}
            </span>
            <span className="text-xs text-zinc-400">credits</span>
          </div>
        </header>

        {/* 状态横幅 */}
        {successCredits != null && (
          <div className="mt-6 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <span className="flex size-6 items-center justify-center rounded-full bg-emerald-500 text-white">
              <Check className="size-3.5" />
            </span>
            充值成功，已到账
            <span className="font-semibold tabular-nums">
              {' '}
              +{successCredits.toLocaleString()} credits
            </span>
            。
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!config.isLoading && !paypalReady && (
          <div className="mt-6 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-500">
            支付后端尚未接入（后端 P0 进行中）。页面与交互已就绪，待后端联调即可上线。
          </div>
        )}

        {/* 套餐网格 */}
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CREDIT_PACKS.map((pack, index) => (
            <PackCard
              key={pack.id}
              pack={pack}
              index={index}
              ready={paypalReady}
              bestValueId={bestValueId}
              onSuccess={handleSuccess}
              onError={handleError}
            />
          ))}
        </div>

        {/* 页脚说明 */}
        <p className="mt-10 text-center text-xs text-zinc-500">
          币种 USD · 由 PayPal 处理付款与退款 · 一次性购买，不自动续费
        </p>
      </div>
    </div>
  )
}

interface PackCardProps {
  pack: CreditPack
  index: number
  ready: boolean
  bestValueId: string
  onSuccess: (credits: number) => void
  onError: (message: string) => void
}

function PackCard({ pack, index, ready, bestValueId, onSuccess, onError }: PackCardProps) {
  const popular = !!pack.popular
  const isBestValue = pack.id === bestValueId
  const perCredit = Math.round((pack.priceUsd / pack.credits) * 100)
  return (
    <div
      className={cn(
        'pay-fade-up relative flex flex-col rounded-xl border p-6 shadow-sm transition-all duration-300',
        popular
          ? 'border-zinc-900 bg-gradient-to-b from-zinc-900 to-zinc-800 text-white shadow-lg hover:-translate-y-0.5 hover:shadow-xl'
          : 'border-zinc-200 bg-white text-zinc-900 hover:-translate-y-1 hover:border-zinc-300 hover:shadow-lg'
      )}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {pack.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="gap-1 bg-zinc-900 text-white ring-1 ring-white/15">
            <Sparkles className="size-3" />
            最受欢迎
          </Badge>
        </div>
      )}

      <div className="flex items-baseline justify-between">
        <h3 className={cn('text-lg font-semibold', popular && 'text-white')}>
          {pack.name}
        </h3>
        <span className="text-xs text-zinc-400">{pack.tagline}</span>
      </div>

      <div className="mt-4 flex items-end gap-1.5">
        <span
          className={cn(
            'text-4xl font-semibold tracking-tight tabular-nums',
            popular ? 'text-white' : 'text-zinc-900'
          )}
        >
          {pack.credits.toLocaleString()}
        </span>
        <span className="mb-1 text-sm text-zinc-400">credits</span>
      </div>

      <div className="mt-1 flex items-baseline gap-2">
        <span
          className={cn(
            'text-2xl font-semibold',
            popular ? 'text-white' : 'text-zinc-900'
          )}
        >
          ${pack.priceUsd}
          <span className="ml-1 text-sm font-normal text-zinc-400">USD</span>
        </span>
        {isBestValue && (
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[11px] font-medium',
              popular
                ? 'bg-emerald-400/15 text-emerald-300'
                : 'bg-emerald-50 text-emerald-700'
            )}
          >
            最划算
          </span>
        )}
      </div>
      <div className={cn('mt-1 text-xs', popular ? 'text-zinc-500' : 'text-zinc-400')}>
        ≈ {perCredit}¢ / credit
      </div>

      <ul className="mt-5 flex-1 space-y-2.5">
        {pack.perks.map((perk) => (
          <li
            key={perk}
            className={cn(
              'flex items-center gap-2 text-sm transition-colors',
              popular ? 'text-zinc-300 hover:text-white' : 'text-zinc-600 hover:text-zinc-900'
            )}
          >
            <Check
              className={cn('size-4 shrink-0', popular ? 'text-emerald-400' : 'text-emerald-500')}
            />
            {perk}
          </li>
        ))}
      </ul>

      <div className="mt-6">
        <PayPalButton
          pack={pack}
          ready={ready}
          onSuccess={onSuccess}
          onError={onError}
        />
      </div>
    </div>
  )
}
