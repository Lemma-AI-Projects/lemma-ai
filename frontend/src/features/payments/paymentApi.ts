import { apiClient } from '@/lib/apiClient'
import type {
  BalanceResponse,
  CaptureOrderResponse,
  CreateOrderRequest,
  CreateOrderResponse,
  PaymentConfigResponse,
} from './types'

/** 探测后端支付能力（PayPal / Stripe 是否就绪）。非 2xx 视为未就绪。 */
export async function fetchPaymentConfig(): Promise<PaymentConfigResponse> {
  const { data } = await apiClient.get<PaymentConfigResponse>(
    '/api/v1/payments/config'
  )
  return data
}

/** 当前用户 credits 余额。 */
export async function fetchBalance(): Promise<BalanceResponse> {
  const { data } = await apiClient.get<BalanceResponse>(
    '/api/v1/credits/balance'
  )
  return data
}

/**
 * 为某套餐创建支付订单。
 * - provider='paypal' → 返回 orderId 交给 PayPal SDK 完成支付
 * - provider='stripe' → 返回 url（Stripe 托管结账页），前端跳转
 */
export async function createOrder(
  req: CreateOrderRequest
): Promise<CreateOrderResponse> {
  const { data } = await apiClient.post<CreateOrderResponse>(
    '/api/v1/payments/orders',
    req
  )
  return data
}

/** 支付完成后由前端回调（PayPal 通道），后端完成 capture 并入账。 */
export async function captureOrder(
  orderId: string
): Promise<CaptureOrderResponse> {
  const { data } = await apiClient.post<CaptureOrderResponse>(
    '/api/v1/payments/capture',
    { orderId }
  )
  return data
}
