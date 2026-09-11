import { CREDIT_PACK_PERK_COUNTS, type CreditPack } from './types'

/**
 * 一次性 credits 套餐（不订阅，天然避开 negative option / ROSCA / 州 ARL）。
 *
 * 金额以服务端快照为准，前端只负责展示与触发支付；文案走 i18n
 * （credits.pack.<id>.tagline / .perks），所以这里只放语言无关的部分。
 */
export const CREDIT_PACKS: CreditPack[] = [
  {
    id: 'starter',
    name: 'Starter',
    credits: 500,
    priceUsd: 4.99,
  },
  {
    id: 'pro',
    name: 'Pro',
    credits: 1200,
    priceUsd: 9.99,
    popular: true,
  },
  {
    id: 'max',
    name: 'Max',
    credits: 4000,
    priceUsd: 29.99,
  },
]

export const creditsPackTaglineKey = (packId: string) =>
  `credits.pack.${packId}.tagline`

export const creditsPackPerkKeys = (packId: string) =>
  Array.from(
    { length: CREDIT_PACK_PERK_COUNTS[packId] ?? 0 },
    (_, index) => `credits.pack.${packId}.perks.${index}`
  )
