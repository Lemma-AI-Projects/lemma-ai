import { isAxiosError } from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiClient } from '@/lib/apiClient'
import { signOutOn401 } from '@/lib/apiUtils'
import { currentUserQueryKey } from '@/features/auth/useCurrentUser'

export interface OnboardingStatus {
  hasCompletedOnboarding: boolean
  onboardingInterests: string | null
}

export const onboardingStatusQueryKey = ['onboarding-status'] as const

/** 读取 onboarding 门控状态（容量首屏流程是否完成）。 */
export function useOnboardingStatus() {
  return useQuery({
    queryKey: onboardingStatusQueryKey,
    queryFn: async (): Promise<OnboardingStatus> => {
      const { data } = await signOutOn401(
        apiClient.get<OnboardingStatus>('/api/v1/onboarding/status')
      )
      return data
    },
    retry: (failureCount, error) =>
      !(isAxiosError(error) && error.response?.status === 401) &&
      failureCount < 1,
  })
}

/** 完成 onboarding：保存容量首屏的自由表达，翻转门控。完成后失效
 *  current-user 与 onboarding-status 缓存，门控与头像数据同步刷新。 */
export function useCompleteOnboarding() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (interests: string | null) => {
      const { data } = await signOutOn401(
        apiClient.post<OnboardingStatus>('/api/v1/onboarding/complete', {
          interests,
        })
      )
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: onboardingStatusQueryKey })
      void queryClient.invalidateQueries({ queryKey: currentUserQueryKey })
    },
  })
}
