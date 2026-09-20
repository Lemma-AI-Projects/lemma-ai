import { type CreditPack } from './types'

/**
 * 一次性 credits 套餐（不订阅，天然避开 negative option / ROSCA / 州 ARL）。
 *
 * 金额以服务端快照为准，前端只负责展示与触发支付。
 *
 * 注意（main-v3 专有改动）：main-v2 里这里的文案是通过 i18n key
 * （credits.pack.<id>.tagline / .perks）间接取的，本分支没有 i18n 体系，
 * 因此直接内联中文文案。若日后引入 i18n，回 main-v2 的
 * features/payments/plans.ts 取回 key 版本。
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

const CREDIT_PACK_TAGLINES: Record<string, string> = {
  starter: '轻量体验',
  pro: '最受欢迎',
  max: '重度使用',
}

const CREDIT_PACK_PERKS: Record<string, string[]> = {
  starter: ['500 credits', '标准模型额度', '社区支持'],
  pro: ['1,200 credits', '高优先级推理', '视频解析增强', '优先支持'],
  max: ['4,000 credits', '全部 Pro 权益', '批量任务', '专属通道'],
}

export const creditPackTagline = (packId: string): string =>
  CREDIT_PACK_TAGLINES[packId] ?? ''

export const creditPackPerks = (packId: string): string[] =>
  CREDIT_PACK_PERKS[packId] ?? []
