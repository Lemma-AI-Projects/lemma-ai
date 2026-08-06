import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  captureOrder,
  createOrder,
  fetchBalance,
  fetchPaymentConfig,
} from './paymentApi'
import type { CreateOrderRequest } from './types'

/** 后端支付能力探测。失败（404/网络）即视为未就绪，不重试避免刷屏。 */
export function usePaymentConfig() {
  return useQuery({
    queryKey: ['payment-config'],
    queryFn: fetchPaymentConfig,
    retry: false,
  })
}

/** 当前 credits 余额。失败显示「—」，不阻塞页面。 */
export function useBalance() {
  return useQuery({
    queryKey: ['credits-balance'],
    queryFn: fetchBalance,
    retry: false,
  })
}

export function useCreateOrder() {
  return useMutation({ mutationFn: (req: CreateOrderRequest) => createOrder(req) })
}

export function useCaptureOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (orderId: string) => captureOrder(orderId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['credits-balance'] })
    },
  })
}
