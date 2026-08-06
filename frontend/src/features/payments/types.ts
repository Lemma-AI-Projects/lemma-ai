/** 支付 feature 的领域类型。后端契约见 paypal-integration-technical-plan.md。 */

/** 一次性 credits 套餐（不订阅，天然避开 negative option / ROSCA）。 */
export interface CreditPack {
  id: string
  name: string
  /** 本套餐包含的 credits 数量 */
  credits: number
  /** 标价（USD） */
  priceUsd: number
  /** 是否主推套餐（影响视觉高亮） */
  popular?: boolean
  tagline: string
  perks: string[]
}

/** 支付通道：PayPal（内嵌 SDK）/ Stripe（托管 Checkout，信用卡）。 */
export type PaymentProvider = 'paypal' | 'stripe'

/** 向后端申请创建支付订单的请求体。 */
export interface CreateOrderRequest {
  packId: string
  amount: number
  currency: 'USD'
  /** 通道选择，默认 paypal */
  provider?: PaymentProvider
}

export interface CreateOrderResponse {
  /** 通道侧订单号（PayPal order id / Stripe Checkout Session id）。 */
  orderId: string
  /** Stripe 通道：跳转此托管结账页；PayPal 为 null（前端 SDK 内嵌）。 */
  url?: string | null
}

export interface CaptureOrderResponse {
  orderId: string
  status: 'COMPLETED' | 'PENDING' | string
  /** 入账的 credits 数量（后端按套餐快照计算）。 */
  creditsGranted?: number
}

export interface BalanceResponse {
  credits: number
}

/** 后端支付能力探测：决定前端渲染哪些真实支付按钮。 */
export interface PaymentConfigResponse {
  paypalReady: boolean
  stripeReady: boolean
  currency: string
}
