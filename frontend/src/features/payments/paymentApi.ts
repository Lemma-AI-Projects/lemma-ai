import { apiClient } from '@/lib/apiClient'
import type {
  BalanceResponse,
  CaptureOrderResponse,
  CreateOrderRequest,
  CreateOrderResponse,
  PaymentConfigResponse,
} from './types'

/** 探测后端支付能力（PayPal 是否就绪）。非 2xx 视为未就绪。 */
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

/** 为某套餐创建 PayPal 订单，返回 orderId 交给 PayPal SDK。 */
export async function createOrder(
  req: CreateOrderRequest
): Promise<CreateOrderResponse> {
  const { data } = await apiClient.post<CreateOrderResponse>(
    '/api/v1/payments/orders',
    req
  )
  return data
}

/** 支付完成后由前端回调，后端完成 capture 并入账。 */
export async function captureOrder(
  orderId: string
): Promise<CaptureOrderResponse> {
  const { data } = await apiClient.post<CaptureOrderResponse>(
    '/api/v1/payments/capture',
    { orderId }
  )
  return data
}
