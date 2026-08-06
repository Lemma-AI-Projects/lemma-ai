import type { CreditPack } from './types'

/**
 * 占位定价 —— 最终以业务侧定价终稿为准
 * （见 paypal-integration-technical-plan.md 的 D3 首发市场=美国+USD、D4 税务策略）。
 *
 * 设计约束（来自规划文档）：
 *  - 一次性 credits，不订阅 → 天然避开 negative option / ROSCA / 州 ARL。
 *  - 金额以服务端快照为准，前端只负责展示与触发支付。
 */
export const CREDIT_PACKS: CreditPack[] = [
  {
    id: 'starter',
    name: 'Starter',
    credits: 500,
    priceUsd: 4.99,
    tagline: '轻量体验',
    perks: ['500 credits', '标准模型额度', '社区支持'],
  },
  {
    id: 'pro',
    name: 'Pro',
    credits: 1200,
    priceUsd: 9.99,
    popular: true,
    tagline: '最受欢迎',
    perks: ['1,200 credits', '高优先级推理', '视频解析增强', '优先支持'],
  },
  {
    id: 'max',
    name: 'Max',
    credits: 4000,
    priceUsd: 29.99,
    tagline: '重度使用',
    perks: ['4,000 credits', '全部 Pro 权益', '批量任务', '专属通道'],
  },
]
