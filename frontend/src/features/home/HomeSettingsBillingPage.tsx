import { BadgeCheckIcon } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type {
  CurrentUser,
  DisplaySubscriptionPlan,
} from '@/features/auth/useCurrentUser'

// FREE 徽章样式：这里可以手动微调底色、文字颜色、内边距、字号等 Tailwind class。
const freeBadgeClassName = 'bg-zinc-200 text-zinc-950'

// PRO 徽章样式：这里调背景色、文字颜色，以及图标大小（[&>svg]:size-*）。
// 注意：shadcn Badge 默认在父级写了 [&>svg]:size-3，所以图标大小要在这里覆盖，直接改 BadgeCheckIcon 的 size 不会生效。
const proBadgeClassName = 'bg-[#f66a0a] text-white [&>svg]:size-3.5'

function getStorageSpaceLabel(subscriptionPlan: DisplaySubscriptionPlan) {
  return subscriptionPlan === 'Pro' ? '80G' : '5G'
}

function SubscriptionPlanBadge({
  subscriptionPlan,
}: {
  subscriptionPlan: DisplaySubscriptionPlan
}) {
  if (subscriptionPlan === 'Pro') {
    return (
      <Badge variant="secondary" className={proBadgeClassName}>
        <BadgeCheckIcon />
        PRO
      </Badge>
    )
  }

  return <Badge className={freeBadgeClassName}>FREE</Badge>
}

export function HomeSettingsBillingPage({
  account,
}: {
  account: CurrentUser | undefined
}) {
  const isPro = account?.subscriptionPlan === 'Pro'
  const quotaItems = [
    {
      label: '存储空间',
      value: account
        ? getStorageSpaceLabel(account.subscriptionPlan)
        : '加载中',
    },
    {
      label: '课程创建',
      value: account ? (isPro ? '无限制' : '每周 2 次') : '加载中',
    },
    {
      label: '每日 Credits',
      value: account ? (isPro ? '3000点/日' : '300点/日') : '加载中',
    },
  ]

  return (
    <>
      <h2 className="text-lg font-normal text-zinc-900">订阅和使用量</h2>
      <Separator className="mt-4 bg-zinc-200" />

      <div className="grid min-h-14 grid-cols-[1fr_auto] items-center gap-4 py-3">
        <span className="text-[16px] font-normal leading-7 text-zinc-600">
          订阅
        </span>
        {account ? (
          <SubscriptionPlanBadge subscriptionPlan={account.subscriptionPlan} />
        ) : (
          <span className="text-[16px] font-normal leading-7 text-zinc-500">
            加载中
          </span>
        )}
      </div>
      <Separator className="bg-zinc-200" />

      <h2 className="mt-8 text-lg font-normal text-zinc-900">额度</h2>
      <Separator className="mt-4 bg-zinc-200" />

      {quotaItems.map((item) => (
        <div key={item.label}>
          <div className="grid min-h-14 grid-cols-[1fr_auto] items-center gap-4 py-3">
            <span className="text-[16px] font-normal leading-7 text-zinc-600">
              {item.label}
            </span>
            <span className="text-[16px] font-normal leading-7 text-zinc-500">
              {item.value}
            </span>
          </div>
          <Separator className="bg-zinc-200" />
        </div>
      ))}
    </>
  )
}
