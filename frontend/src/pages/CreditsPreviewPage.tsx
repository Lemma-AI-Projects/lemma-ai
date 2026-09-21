import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PayPage } from '@/features/payments/PayPage'

// 布局评审专用：不套 RequireAuth / AppLayout，直接喂 mock 数据，
// 不起后端、不登录即可查看 Credits 页。支付通道一律置为未就绪，
// 因此按钮保持禁用态——评审看的是布局，不是真实支付。
const previewQueryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
})

previewQueryClient.setQueryData(['payment-config'], {
  paypalReady: false,
  stripeReady: false,
  currency: 'USD',
})
previewQueryClient.setQueryData(['credits-balance'], { credits: 1250 })

export function CreditsPreviewPage() {
  return (
    <QueryClientProvider client={previewQueryClient}>
      <div className="h-screen bg-zinc-100 p-2">
        <PayPage />
      </div>
    </QueryClientProvider>
  )
}
