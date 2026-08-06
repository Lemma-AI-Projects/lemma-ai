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

/** 向后端申请创建 PayPal 订单的请求体。 */
export interface CreateOrderRequest {
  packId: string
  amount: number
  currency: 'USD'
}

export interface CreateOrderResponse {
  /** PayPal order id，前端交回给 PayPal SDK 完成支付。 */
  orderId: string
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

/** 后端支付能力探测：决定前端是否渲染真实 PayPal 按钮。 */
export interface PaymentConfigResponse {
  paypalReady: boolean
  currency: string
}
